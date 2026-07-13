import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import { exportJWK, generateKeyPair, SignJWT } from "jose";

import {
  createRemoteMcpAccessTokenVerifier,
  RemoteMcpAuthenticationError,
} from "../dist/src/mcp/remote-http-auth.js";

test("PR137 verifies signature issuer audience resource time subject and scope with local JWKS", async (t) => {
  const first = await signingKey("first-key");
  const second = await signingKey("second-key");
  let issuer = "";
  let redirectDiscovery = false;
  let transientDiscoveryFailures = 0;
  const authServer = createServer((request, response) => {
    if (request.url === "/.well-known/openid-configuration") {
      if (transientDiscoveryFailures > 0) {
        transientDiscoveryFailures -= 1;
        response.statusCode = 503;
        response.end();
        return;
      }
      if (redirectDiscovery) {
        response.writeHead(302, { location: "https://attacker.invalid/discovery" }).end();
        return;
      }
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ issuer, jwks_uri: `${issuer}jwks.json` }));
      return;
    }
    if (request.url === "/jwks.json") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ keys: [first.publicJwk, second.publicJwk] }));
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
  const verifier = createRemoteMcpAccessTokenVerifier(config);
  const valid = await signedToken(first, config, {});
  const access = await verifier(valid);

  assert.match(access.subjectId, /^[a-f0-9]{64}$/u);
  assert.notEqual(access.subjectId, "auth0|subject-a");
  assert.deepEqual(access.scopes, ["norma:structured-analyze"]);
  assert.equal(access.rawToken, valid);
  assert.equal(access.clientId, "client-a");

  const secondKeyToken = await signedToken(second, config, {});
  assert.equal((await verifier(secondKeyToken)).subjectId, access.subjectId);

  for (const token of [
    await signedToken(first, config, { audience: "wrong-audience" }),
    await signedToken(first, config, { audience: [config.audience, "https://other.example/api"] }),
    await signedToken(first, config, { resource: "http://127.0.0.1/wrong" }),
    await signedToken(first, config, { scope: "other:scope" }),
    await signedToken(first, config, { issuer: `${issuer}wrong/` }),
    await signedToken(first, config, { subject: "" }),
    await signedToken(first, config, { expirationTime: "1 second ago" }),
    await signedToken(first, config, { expirationTime: null }),
    await signedToken(first, config, { notBefore: "1 hour from now" }),
  ]) {
    await assert.rejects(() => verifier(token), RemoteMcpAuthenticationError);
  }

  const wrongAudienceCorrectResource = await signedToken(first, config, {
    audience: "wrong-audience",
    resource: config.resourceUrl.href,
  });
  await assert.rejects(() => verifier(wrongAudienceCorrectResource), RemoteMcpAuthenticationError);

  const correctAudienceWrongResource = await signedToken(first, config, {
    audience: config.audience,
    resource: "http://127.0.0.1/wrong",
  });
  await assert.rejects(() => verifier(correctAudienceWrongResource), RemoteMcpAuthenticationError);

  transientDiscoveryFailures = 1;
  const retryingVerifier = createRemoteMcpAccessTokenVerifier(config);
  await assert.rejects(() => retryingVerifier(valid), RemoteMcpAuthenticationError);
  assert.equal((await retryingVerifier(valid)).subjectId, access.subjectId);

  redirectDiscovery = true;
  const redirectVerifier = createRemoteMcpAccessTokenVerifier(config);
  await assert.rejects(() => redirectVerifier(valid), RemoteMcpAuthenticationError);
});

test("PR137 rejects cross-origin JWKS discovery metadata", async (t) => {
  let issuer = "";
  const authServer = createServer((request, response) => {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({
      issuer,
      jwks_uri: "https://attacker.invalid/jwks.json",
    }));
  });
  await listen(authServer);
  t.after(() => close(authServer));
  const address = authServer.address();
  assert.ok(address && typeof address === "object");
  issuer = `http://127.0.0.1:${address.port}/`;
  const key = await signingKey("cross-origin-key");
  const config = testConfig(issuer);
  const token = await signedToken(key, config, {});
  await assert.rejects(
    () => createRemoteMcpAccessTokenVerifier(config)(token),
    RemoteMcpAuthenticationError,
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

async function signedToken(key, config, overrides) {
  const now = Math.floor(Date.now() / 1_000);
  const payload = {
    scope: overrides.scope ?? "norma:structured-analyze",
    resource: overrides.resource ?? config.resourceUrl.href,
    client_id: "client-a",
  };
  const jwt = new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", kid: key.kid })
    .setIssuer(overrides.issuer ?? config.issuer.href)
    .setAudience(overrides.audience ?? config.audience)
    .setSubject(overrides.subject ?? "auth0|subject-a")
    .setIssuedAt(now)
    .setNotBefore(overrides.notBefore ?? now - 1);
  if (overrides.expirationTime !== null) {
    jwt.setExpirationTime(overrides.expirationTime ?? now + 300);
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
    audience: "https://norma.example/api",
    auditHashKey: "test-only-audit-key-that-is-at-least-32-characters",
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
