import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import { exportJWK, generateKeyPair, SignJWT } from "jose";

import {
  createRemoteMcpAccessTokenVerifier,
  RemoteMcpAuthenticationError,
} from "../dist/src/mcp/remote-http-auth.js";
import {
  hashRemoteMcpRevocationScope,
  hashRemoteMcpSubject,
  InMemoryRemoteMcpRevocationRegistry,
} from "../dist/src/mcp/remote-http-revocation.js";

test("same-token replay fails closed after a subject revocation cutoff", async (t) => {
  const key = await signingKey("revocation-key");
  let issuer = "";
  const authServer = createServer((request, response) => {
    if (request.url === "/jwks.json") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ keys: [key.publicJwk] }));
      return;
    }
    response.statusCode = 404;
    response.end();
  });
  await listen(authServer);
  t.after(() => close(authServer));
  const address = authServer.address();
  assert.ok(address && typeof address === "object");
  issuer = `http://127.0.0.1:${address.port}/`;

  const config = testConfig(issuer);
  const registry = new InMemoryRemoteMcpRevocationRegistry();
  const verifier = createRemoteMcpAccessTokenVerifier(config, { revocationRegistry: registry });
  const now = Math.floor(Date.now() / 1_000);
  const oldToken = await signedToken(key, config, { issuedAt: now - 10 });
  const oldAccess = await verifier(oldToken);
  const cutoff = now - 5;

  assert.equal(oldAccess.issuedAt, now - 10);
  assert.equal(oldAccess.subjectId, hashRemoteMcpSubject(config.revocationHashKey, "auth0|subject-a"));
  registry.record({ subjectId: oldAccess.subjectId, revokedAt: cutoff });

  await assert.rejects(() => verifier(oldToken), RemoteMcpAuthenticationError);

  const reauthenticatedToken = await signedToken(key, config, { issuedAt: now - 1 });
  assert.equal((await verifier(reauthenticatedToken)).subjectId, oldAccess.subjectId);

  const fractionalToken = await signedToken(key, config, { issuedAt: now - 0.5 });
  assert.equal((await verifier(fractionalToken)).issuedAt, now - 0.5);
});

test("revocation scope is exact when client or audience is supplied", async () => {
  const registry = new InMemoryRemoteMcpRevocationRegistry();
  const subjectId = "a".repeat(64);
  const lookup = {
    subjectId,
    clientId: "b".repeat(64),
    audience: "c".repeat(64),
    issuedAt: 100,
  };

  registry.record({
    subjectId,
    clientId: "d".repeat(64),
    audience: lookup.audience,
    revokedAt: 200,
  });
  assert.equal(registry.isRevoked(lookup), false);

  registry.record({
    subjectId,
    clientId: lookup.clientId,
    audience: lookup.audience,
    revokedAt: 200,
  });
  assert.equal(registry.isRevoked(lookup), true);
  assert.equal(registry.isRevoked({ ...lookup, issuedAt: 201 }), false);
  assert.equal(registry.isRevoked({ ...lookup, audience: "e".repeat(64) }), false);
  assert.equal(
    hashRemoteMcpRevocationScope("k".repeat(32), "client", " client-a "),
    hashRemoteMcpRevocationScope("k".repeat(32), "client", "client-a"),
  );
});

test("revocation subject hashing rejects noncanonical whitespace", () => {
  const key = "k".repeat(32);
  assert.throws(() => hashRemoteMcpSubject(key, " auth0|subject-a"), /Invalid revocation subject/u);
  assert.throws(() => hashRemoteMcpSubject(key, "auth0|subject-a "), /Invalid revocation subject/u);
  assert.notEqual(
    hashRemoteMcpSubject(key, "auth0|subject-a"),
    hashRemoteMcpSubject(key, "auth0|subject-b"),
  );
});

test("revocation lookup failures, missing iat, and malformed events fail closed", async (t) => {
  const key = await signingKey("fail-closed-key");
  let issuer = "";
  const authServer = createServer((request, response) => {
    if (request.url === "/jwks.json") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ keys: [key.publicJwk] }));
      return;
    }
    response.statusCode = 404;
    response.end();
  });
  await listen(authServer);
  t.after(() => close(authServer));
  const address = authServer.address();
  assert.ok(address && typeof address === "object");
  issuer = `http://127.0.0.1:${address.port}/`;
  const config = testConfig(issuer);
  const token = await signedToken(key, config, { issuedAt: null });

  const missingIatVerifier = createRemoteMcpAccessTokenVerifier(config, {
    revocationRegistry: new InMemoryRemoteMcpRevocationRegistry(),
  });
  await assert.rejects(() => missingIatVerifier(token), RemoteMcpAuthenticationError);

  const failingVerifier = createRemoteMcpAccessTokenVerifier(config, {
    revocationRegistry: {
      isRevoked() {
        throw new Error("store unavailable");
      },
    },
  });
  await assert.rejects(
    async () => failingVerifier(await signedToken(key, config, {})),
    RemoteMcpAuthenticationError,
  );

  const registry = new InMemoryRemoteMcpRevocationRegistry();
  assert.throws(
    () => registry.record({ subjectId: "not-a-hash", revokedAt: 1 }),
    /Invalid revocation event/u,
  );
  assert.throws(
    () => registry.record({
      subjectId: "b".repeat(64),
      clientId: "raw-client-id",
      revokedAt: 1,
    }),
    /Invalid revocation event/u,
  );
  assert.throws(
    () => registry.isRevoked({
      subjectId: "b".repeat(64),
      clientId: "c".repeat(64),
      audience: "d".repeat(64),
      issuedAt: -1,
    }),
    /Invalid revocation lookup/u,
  );
});

async function signingKey(kid) {
  const pair = await generateKeyPair("RS256", { extractable: true });
  return {
    kid,
    privateKey: pair.privateKey,
    publicJwk: { ...(await exportJWK(pair.publicKey)), kid, alg: "RS256", use: "sig" },
  };
}

async function signedToken(key, config, overrides = {}) {
  const now = Math.floor(Date.now() / 1_000);
  const issuedAt = overrides.issuedAt === undefined ? now : overrides.issuedAt;
  const payload = {
    scope: "norma:structured-analyze",
    resource: config.resourceUrl.href,
    client_id: "client-a",
  };
  const jwt = new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", kid: key.kid })
    .setIssuer(config.issuerClaim)
    .setAudience(config.audience)
    .setSubject("auth0|subject-a");
  if (issuedAt !== null) {
    jwt.setIssuedAt(issuedAt).setNotBefore(issuedAt - 1).setExpirationTime(issuedAt + 300);
  } else {
    jwt.setNotBefore(now - 1).setExpirationTime(now + 300);
  }
  return jwt.sign(key.privateKey);
}

function testConfig(issuer) {
  return {
    port: 3000,
    nodeEnv: "test",
    publicUrl: new URL("http://127.0.0.1/"),
    resourceUrl: new URL("http://127.0.0.1/mcp"),
    issuer: new URL(issuer),
    issuerClaim: issuer,
    authorizationServerUrl: new URL("https://auth.example/resources/norma"),
    jwksUrl: new URL(`${issuer}jwks.json`),
    authorizationScope: "norma:structured-analyze",
    audience: "https://norma.example/api",
    auditHashKey: "a".repeat(64),
    revocationHashKey: "b".repeat(64),
    allowedOrigins: new Set(),
  };
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}
