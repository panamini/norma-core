# ADR — Gate Railway + Supabase : qualification du fournisseur OAuth/MCP

- **Date :** 2026-07-24
- **Statut :** `SHORTLISTED_PENDING_SANDBOX`
- **Périmètre :** livrable documentaire uniquement
- **Contrat d’autorisation à qualifier :** scope exact `norma:structured-analyze`, PKCE S256, propagation de `resource` vers `aud`, et vérification stricte du JWT
- **Résultat Scalekit :** alias fournisseur explicite requis ; contrat canonique Norma conservé

## Contexte

Railway reste la cible retenue pour MCP, l’API, l’orchestration et le calcul CPU.
Norma Core reste local/offline et doit conserver sa frontière déterministe.

La décision de données est séparée de la décision d’identité :

```text
Railway
├── MCP
├── API
├── orchestration
└── calcul CPU

Fournisseur OAuth/MCP à qualifier

Supabase PostgreSQL/RLS — cible probable pour les données

Norma Core local/offline
```

Supabase Auth/OAuth n’est donc pas considéré comme choisi. Le fournisseur OAuth/MCP
doit être qualifié indépendamment de la cible Supabase PostgreSQL/RLS.

Auth0 est la baseline correspondant au chemin actuel. Les challengers sont Scalekit,
WorkOS, Clerk, Stytch et Supabase OAuth.

Cette ADR ne crée aucune ressource de production, n’effectue aucune migration et ne
modifie pas le contrat canonique runtime. Le sandbox Scalekit existant a été
configuré et contrôlé le 2026-07-24 ; son nom de permission externe utilise un
underscore, et l’adapter le normalise vers le scope canonique Norma avec tiret.
Les résultats ci-dessous combinent la documentation officielle, ce contrôle sandbox
borné et des retours opérationnels publics de r/mcp consultés le 2026-07-24 ; les
retours Reddit sont des signaux anecdotiques et ne remplacent pas la preuve du flux
complet avec Norma.

## Décision de shortlist

1. Conserver Railway comme cible d’exécution pour MCP, API, orchestration et calcul
   CPU.
2. Conserver Supabase PostgreSQL/RLS comme cible probable de données, sans sélectionner
   Supabase Auth/OAuth.
3. Conserver **Scalekit comme premier sandbox** avec une frontière d’adaptation
   explicite : l’OAuth externe utilise `norma:structured_analyze`, puis l’adapter
   expose au cœur Norma le scope canonique `norma:structured-analyze`.
4. Garder **Auth0 comme fallback** uniquement si cette correspondance exacte,
   la validation JWT ou le chemin Railway → Supabase échoue ; aucun changement
   de fournisseur n’est déclenché pour le seul tiret.
5. Ne verrouiller aucun fournisseur pour la production avant une preuve complète.
   Le choix final sera le fournisseur qui passe le contrat avec le moins de
   configuration et de risques réels.
6. Tester, dans cet ordre, découverte MCP, DCR/CIMD, PKCE S256, `resource` → `aud`,
   scope exact `norma:structured-analyze`, validation JWKS/issuer/audience/expiration/
   scopes, consentement/refresh/révocation, chemin Railway → Supabase RLS,
   isolation tenant et rollback par adapter fournisseur-neutre.
7. Utiliser Railway comme frontière d’autorisation provisoire du sandbox : le
   vérificateur MCP est dans l’API Railway et transmet uniquement un contexte
   autorisé à Supabase PostgreSQL/RLS. L’acceptation directe du JWT MCP par Supabase
   reste une option distincte, non nécessaire au chemin le plus simple.
8. Arrêter la gate après la qualification sandbox et la décision documentée ; aucune
   ressource de production ni migration ne doit être créée dans ce parcours.

## Alternatives considérées

### Scalekit — premier sandbox exécuté, alias fournisseur requis

Scalekit documente pour MCP OAuth 2.1 la découverte, DCR/CIMD, PKCE, les scopes
métier et la configuration du Server URL comme audience du token MCP. Il est donc le
premier candidat qui a été testé pour le chemin ChatGPT → MCP Norma le plus simple.
Le sandbox existant a confirmé les métadonnées DCR/CIMD et PKCE S256. Scalekit
refuse le nom externe `norma:structured-analyze`, mais accepte
`norma:structured_analyze`. L’adapter provider-neutre utilise donc ce dernier
comme scope OAuth configuré, le vérifie exactement, puis le normalise vers le
scope canonique interne `norma:structured-analyze`. Le JWT, `resource` → `aud`,
le cycle de vie et Railway → Supabase RLS restent à prouver.

### Auth0 — fallback et baseline actuelle

Auth0 documente DCR, CIMD, PKCE S256, les custom API scopes, le paramètre `resource`
et un mode de compatibilité MCP où `resource` définit l’audience. La configuration
MCP Resource Parameter Compatibility Profile est toutefois une condition de la
preuve `resource` → `aud`, et le scope Norma exact n’est pas encore configuré ni
testé dans un sandbox.

### WorkOS — challenger conditionnel

AuthKit documente la découverte MCP/OAuth, DCR/CIMD, PKCE S256 et une audience égale
à la ressource demandée. WorkOS ne revient dans le chemin de qualification qu’après
confirmation écrite du scope personnalisé, de sa présence dans le JWT MCP et de la
compatibilité de ce JWT avec Supabase RLS.

### Clerk — challenger bloqué sur le contrat actuel

Clerk documente MCP, DCR, PKCE, consentement et l’intégration Supabase. Les scopes
OAuth personnalisés sont officiellement indisponibles actuellement. La propagation
correcte de la ressource MCP vers `aud` n’est pas prouvée. Clerk ne peut donc pas être
déclaré compatible avec `norma:structured-analyze` dans le contrat actuel.

### Stytch — challenger à qualifier

Connected Apps documente MCP, découverte, DCR/CIMD, PKCE S256, custom scopes,
JWKS/RS256, consentement, refresh et révocation. Les tokens documentés utilisent par
défaut l’audience du projet/client ; une audience personnalisée est configurée sur
le client. La propagation dynamique du paramètre MCP `resource` vers `aud` reste
non prouvée.

### Supabase OAuth — cohérent avec les données, mais pas avec le scope exact actuel

Supabase Auth peut agir comme serveur OAuth 2.1/OIDC pour MCP, avec découverte, DCR,
PKCE, consentement, refresh, révocation, JWKS et application des politiques RLS.
Cependant, les scopes OAuth personnalisés ne sont pas actuellement supportés. Le
paramètre `aud` peut être personnalisé par hook, mais la propagation native de
`resource` vers `aud` n’est pas prouvée. Cette option ne peut donc pas passer le
contrat actuel sans modification explicite ou adapter compensatoire accepté.

## Signal opérationnel de r/mcp

Les discussions publiques ne servent pas à déclarer une capacité `PASS`, mais elles
modifient l’ordre de préférence et les risques pratiques :

- plusieurs intégrateurs décrivent le remote MCP OAuth comme fragile car il combine
  RFC 9728, RFC 7591 et RFC 8707 ; un exemple utilisant Cloudflare et WorkOS rapporte
  toutefois un flux fonctionnel après intégration du template MCP ;
- un intégrateur Stytch rapporte que le fournisseur évite une partie des difficultés,
  mais que le flux restait instable et nécessitait des corrections rapides du fournisseur ;
- un retour Auth0 met en évidence la complexité des callbacks localhost et de DCR pour
  les clients MCP, même si PKCE réduit le risque de détournement du code ;
- un test du même MCP en ChatGPT et Claude montre que le protocole peut fonctionner
  dans les deux clients alors que l’UX et les comportements OAuth diffèrent.

Conséquence : Scalekit a été essayé en premier pour réduire la configuration du
chemin ChatGPT → MCP ; l’alias explicite résout son écart de nommage sans changer
de fournisseur. Auth0 reste le fallback seulement en cas d’échec end-to-end.
WorkOS reste conditionnel. Aucun retour Reddit ne prouve le scope exact
`norma:structured-analyze`, le mapping RLS Norma ou le coût réel.

## Preuve sandbox Scalekit et décision de suite

Le contrôle du 2026-07-24 a observé, sur la ressource Scalekit existante :

- URL MCP Railway configurée et permission underscore activée ;
- DCR et CIMD activés ;
- métadonnées Authorization Server avec `S256`, issuer, JWKS, registration et
  revocation endpoints ;
- rejet explicite de `norma:structured-analyze` par l’interface de permission ;
- confirmation dans la documentation API Scalekit que les noms suivent une
  convention alphanumérique avec `:` et `_`, sans tiret.

Le verdict du nommage est `PASS VIA EXPLICIT ADAPTER MAPPING` : le scope OAuth
Scalekit est vérifié exactement, puis converti une seule fois vers le scope
canonique Norma. Les critères JWT émis, `resource` → `aud`,
consentement/refresh/révocation exécutés, Railway → RLS, isolation tenant, coût
réel et rollback restent `UNPROVEN`. Le contrat canonique Norma n’est pas renommé.

## Matrice PASS / FAIL / UNPROVEN

### Légende

- `PASS` signifie que la capacité est documentée officiellement ; cela ne vaut pas
  preuve d’intégration Norma.
- `FAIL` signifie qu’un point documenté contredit le contrat Norma actuel.
- `UNPROVEN` signifie qu’il faut une qualification sandbox, une configuration exacte
  ou une décision de contrat.
- `ChatGPT prédéfini` est séparé de DCR/CIMD : aucune preuve officielle d’un client
  ChatGPT prédéfini n’est retenue ici.

| Fournisseur | Découverte OAuth | DCR | CIMD | Client ChatGPT prédéfini | PKCE S256 | `resource` → `aud` | Scope exact `norma:structured-analyze` | JWKS + issuer + audience + exp + scopes | Consentement + refresh + révocation | Supabase PostgreSQL/RLS | Coût réel du chemin nécessaire | Adapter / migration / rollback | Verdict actuel |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Scalekit | PASS | PASS | PASS | UNPROVEN | PASS | UNPROVEN : Server URL configurée comme audience, JWT non exercé | **PASS VIA ADAPTER**, `norma:structured_analyze` externe → `norma:structured-analyze` canonique | PASS documentaire, validation live du JWT non exercée | PASS documentaire, cycle de vie live non exercé | UNPROVEN : chemin Railway → Supabase RLS à exécuter | UNPROVEN : chemin commercial exact non chiffré | PASS local, live à exécuter | **FIRST_SANDBOX — CONTINUE** |
| Auth0 | PASS | PASS | PASS | UNPROVEN | PASS | PASS, sous Resource Parameter Compatibility Profile | UNPROVEN | PASS, capacité documentée ; fixture Norma à exécuter | PASS | PASS, fournisseur tiers pris en charge par Supabase | UNPROVEN : tarifs publiés, chemin exact non chiffré | UNPROVEN | **FALLBACK** |
| WorkOS | PASS | PASS | PASS | UNPROVEN | PASS | PASS, ressource reflétée dans `aud` selon AuthKit | UNPROVEN | PASS, claims et validation documentés ; fixture Norma à exécuter | PASS | **UNPROVEN jusqu’à confirmation écrite** | UNPROVEN : prix publié, chemin exact non chiffré | UNPROVEN | **CONDITIONAL** |
| Clerk | PASS | PASS | UNPROVEN | UNPROVEN | PASS | UNPROVEN | **FAIL**, scopes personnalisés indisponibles actuellement | PASS pour les JWT Clerk ; vérification Norma complète à exécuter | PASS | PASS, intégration Supabase documentée | UNPROVEN : plan requis pour le chemin MCP exact | UNPROVEN | **FAIL pour le contrat actuel** |
| Stytch | PASS | PASS | PASS | UNPROVEN | PASS | UNPROVEN, audience client/projet ou custom statique documentée, propagation de `resource` absente de la preuve | UNPROVEN | PASS, RS256/JWKS et claims `iss`, `aud`, `exp`, `scope` documentés | PASS | UNPROVEN : intégration RLS Norma non établie comme chemin first-class | UNPROVEN : prix publié, chemin exact non chiffré | UNPROVEN | RESERVE |
| Supabase OAuth | PASS | PASS | UNPROVEN | UNPROVEN | UNPROVEN pour S256 exact | UNPROVEN, hook possible mais propagation native non prouvée | **FAIL**, scopes personnalisés non supportés actuellement | PASS, JWKS/issuer/audience/expiration et scopes standards documentés | PASS | PASS, natif avec RLS | UNPROVEN : coût dépend du plan, MAU et Third-Party MAU | UNPROVEN | **FAIL pour le contrat actuel** |

### Lecture de la matrice

La recommandation WorkOS ne transforme pas les `UNPROVEN` en `PASS`. Les points
bloquants sont contractuels et doivent être démontrés ensemble
sur un même flux : découverte MCP, enregistrement du client, consentement, émission
du token, assertion `resource`/`aud`, scope exact, validation JWT, RLS et révocation.

Le statut `FAIL` de Clerk et Supabase OAuth porte sur le scope exact, pas sur leur
qualité générale comme produit d’identité ou leur capacité RLS. La modification du
contrat Norma pour accepter des permissions custom claims à la place du scope exact
serait une décision distincte et ne doit pas être implicite.

## Décision RLS préalable

Avant de compléter le sandbox Scalekit, confirmer la frontière d’autorisation provisoire :

1. **JWT MCP accepté directement par Supabase** : Supabase vérifie l’issuer/JWKS du
   fournisseur, l’audience et les claims utiles ; les politiques PostgreSQL/RLS
   autorisent ou refusent les lignes sans que Railway devienne un proxy d’autorisation.
2. **Railway comme frontière autorisée PostgreSQL** : Railway vérifie le JWT MCP et
   applique l’autorisation avant l’accès à PostgreSQL ; un éventuel rôle privilégié ou
   contournement RLS doit être explicitement borné, audité et ne peut pas devenir une
   simple service key silencieuse.

Le parcours prioritaire retient la frontière Railway pour éviter de faire dépendre le
premier chemin ChatGPT → MCP d’une acceptation directe du JWT par Supabase. Une
qualification directe Supabase reste possible seulement comme variante séparée. Le
le sandbox Scalekit doit exécuter le même chemin Railway → Supabase RLS ; il ne doit
pas faire progresser simultanément deux frontières.

## Coût : état comparable mais non décisionnel

Les tarifs publics donnent seulement une borne de plan ; ils ne constituent pas le
coût réel du chemin Norma tant que le volume, l’environnement, les add-ons et les
MAU/Third-Party MAU ne sont pas fixés.

| Fournisseur | Indication publique à revalider dans le sandbox commercial | Ce qui manque pour le coût réel |
|---|---|---|
| Auth0 | Free jusqu’à 25k MAU ; paliers payants et capacités MCP selon le plan/add-on | plan MCP exact, MAU, clients dynamiques et fonctionnalités nécessaires |
| Scalekit | tarification à confirmer selon environnement, utilisateurs, MCP/Auth et domaine | prix du chemin MCP, quotas, custom domain, utilisateurs actifs et intégration RLS |
| WorkOS | AuthKit annoncé jusqu’à 1M d’utilisateurs actifs sans coût de base, puis tarification par palier | définition de l’utilisateur actif, environnement, modules réellement requis |
| Clerk | Hobby jusqu’à 50k MRU ; Pro annoncé à partir de 20 USD/mois en annuel, puis overage | plan permettant le chemin exact, MRU, custom-domain et éventuels add-ons |
| Stytch | offre gratuite annoncée jusqu’à 10k MAU/AI agents, puis offre personnalisée | produit Connected Apps requis, MAU, environnement et contrat commercial |
| Supabase | Free/Pro avec quota MAU et Third-Party MAU ; Third-Party MAU supplémentaire annoncé à 0,00325 USD | plan Postgres/RLS, MAU, Third-Party MAU, éventuels hooks et compute Railway |

Le coût Railway du MCP/API/orchestration/CPU est une ligne séparée et doit être
calculé avec le coût OAuth retenu ; aucune ressource Railway ou Supabase n’est
créée dans cette gate.

## Plan minimal de qualification sandbox

Le nommage Scalekit est traité par l’alias explicite de l’adapter. Le plan restant
est donc la qualification complète Scalekit dans le même sandbox isolé ; Auth0 ne
sera exécuté qu’en fallback si un critère bloquant échoue. Aucune ressource de
production ni migration n’est impliquée.

### 0. Décider la frontière RLS

Choisir le modèle direct Supabase ou le modèle Railway-frontier décrit ci-dessus et
documenter les claims, rôles, refus et rollback attendus.

### 1. Geler le contrat de test

Utiliser exactement :

- une URI `resource` HTTPS dédiée au MCP sandbox ;
- le scope `norma:structured-analyze` inchangé ;
- `code_challenge_method=S256` ;
- un utilisateur de test et un client de test isolés par fournisseur ;
- un issuer, une audience attendue et une durée d’expiration explicitement écrits ;
- aucun secret, token brut ou contenu utilisateur dans les logs ou les artefacts.

### 2. Vérifier la découverte et le client

Pour chaque fournisseur :

1. récupérer Protected Resource Metadata puis Authorization Server Metadata ;
2. vérifier issuer, endpoints, `code_challenge_methods_supported`, grants et scopes ;
3. tester DCR ; à défaut, tester CIMD ; à défaut, documenter le client prédéfini ;
4. vérifier les redirect URIs exactes, l’isolation par environnement et le client public.

Échec si la chaîne nécessite un endpoint propriétaire non compatible avec le contrat
MCP ou si le mode de client ne peut pas être isolé par sandbox.

### 3. Vérifier le flux OAuth de bout en bout

1. générer un verifier/challenge PKCE S256 ;
2. envoyer `resource` et exactement `norma:structured-analyze` ;
3. faire apparaître le consentement utilisateur et vérifier les scopes demandés et
   accordés ;
4. échanger le code ;
5. décoder uniquement les claims nécessaires et prouver `iss`, `aud`, `exp`, `scope`,
   `sub`, `kid` et l’algorithme de signature ;
6. prouver que `aud` est exactement la ressource MCP attendue, sans mapping implicite ;
7. rejeter des fixtures mutées : mauvais issuer, mauvaise audience, expiration passée,
   signature/JWKS inconnue, scope manquant, scope supplémentaire non autorisé et
   verifier incorrect.

### 4. Vérifier le cycle de vie

Dans le même sandbox :

- renouveler avec refresh token et vérifier rotation/expiration selon le fournisseur ;
- révoquer le consentement puis vérifier que le refresh et l’accès sont refusés ;
- vérifier qu’un nouveau consentement est requis après révocation ;
- vérifier la rotation JWKS et le comportement d’un ancien `kid` sans contourner la
  validation.

### 5. Vérifier Railway → Supabase PostgreSQL/RLS

Créer uniquement, lors d’une future exécution autorisée, une table et des politiques
de test isolées derrière l’API Railway :

- accès autorisé pour le sujet/client/scope attendus ;
- accès refusé pour le mauvais client, le mauvais sujet et le scope absent ;
- vérification via le contexte autorisé Railway et RLS, jamais avec une service key ;
- vérification que les claims utilisés par RLS sont stables et documentés ;
- suppression complète des données de test après qualification.

Le test doit séparer l’identité du fournisseur OAuth de la cible Supabase PostgreSQL/RLS
et prouver l’isolation tenant, la réinitialisation du contexte transactionnel et le
rollback de l’adapter. Un PASS Supabase RLS ne vaut pas sélection de Supabase Auth/OAuth.

### 6. Calculer le coût et le rollback

Pour le fournisseur finaliste, conserver une fiche datée avec plan, add-ons, quota,
MAU/Third-Party MAU, coût mensuel à trois volumes et coût Railway séparé.

L’intégration doit rester derrière un port du type :

```text
OAuthProviderAdapter
├── discover(resourceServer)
├── registerClient(clientMetadata)
├── exchangeCode(code, verifier, resource, scope)
├── verifyAccessToken(token, expectedIssuer, expectedAudience, requiredScope)
├── refresh(refreshToken)
└── revoke(tokenOrGrant)
```

Le cœur Norma ne doit dépendre ni des noms de SDK, ni des claims propriétaires, ni
des tables d’un fournisseur. Le rollback doit être une bascule de configuration vers
le provider précédent ou le mode local/offline, sans migration de données irréversible
et sans modification du contrat core. Toute migration de comptes, de claims ou de RLS
est hors de cette gate et nécessitera une décision séparée.

## Critère de sortie

Un fournisseur ne peut être recommandé que s’il obtient `PASS` sur les critères durs
suivants dans un flux sandbox reproduisible :

1. découverte MCP/OAuth et client compatible ;
2. PKCE S256 ;
3. `resource` propagée à `aud` ;
4. scope fournisseur configuré vérifié exactement, puis mapping un-à-un vers le
   scope canonique `norma:structured-analyze` ;
5. vérification JWKS, issuer, audience, expiration et scopes ;
6. consentement, refresh et révocation ;
7. chemin Railway → RLS Supabase sans service key et avec isolation tenant ;
8. rollback par adapter fournisseur-neutre ;
9. coût réel chiffré et accepté.

Un seul `FAIL` sur le scope fournisseur, son mapping un-à-un, ou sur
`resource` → `aud` maintient le fournisseur hors contrat. Le mapping doit être
explicitement configuré et testé ; il ne peut pas être implicite.

## Recommandation finale

**Aucun fournisseur OAuth/MCP n’est recommandé pour la production.**

Scalekit reste le premier sandbox : son scope externe underscore est adapté
explicitement vers le scope canonique Norma avec tiret. **Auth0** reste le fallback
et ne sera exécuté que si Scalekit échoue la matrice complète. Aucun fournisseur
OAuth/MCP n’est recommandé pour la production tant que le flux complet n’est pas
prouvé. WorkOS reste conditionnel ; Stytch reste en réserve ; Clerk et Supabase
OAuth restent hors contrat actuel.

La prochaine action est de compléter la qualification Scalekit avec la même matrice,
en configurant `NORMA_MCP_AUTH_SCOPE=norma:structured_analyze`. L’exécution reste
sandbox-only et ne comprend aucune ressource de production, migration, déploiement
ou verrouillage implicite du fournisseur.

## Sources officielles consultées

- [Auth0 — Dynamic Client Registration](https://auth0.com/docs/get-started/applications/dynamic-client-registration)
- [Auth0 — Authorization Code Flow with PKCE](https://auth0.com/docs/api/authentication/authorization-code-flow-with-pkce/authorize-with-pkce)
- [Auth0 — Resource Parameter Compatibility Profile for MCP](https://auth0.com/ai/docs/mcp/guides/resource-param-compatibility-profile)
- [Auth0 — Revoke Refresh Token](https://auth0.com/docs/api/authentication/revoke-refresh-token/revoke-refresh-token)
- [WorkOS — MCP with AuthKit](https://workos.com/docs/authkit/mcp)
- [WorkOS — Agent Registration and access-token claims](https://workos.com/docs/authkit/agent-auth)
- [WorkOS — AuthKit pricing](https://workos.com/pricing)
- [Scalekit — MCP server authentication overview](https://docs.scalekit.com/authenticate/mcp/overview/)
- [Scalekit — MCP OAuth 2.1 quickstart](https://docs.scalekit.com/authenticate/mcp/quickstart/)
- [Scalekit — MCP client management, DCR/CIMD and revocation](https://docs.scalekit.com/authenticate/mcp/managing-mcp-clients/)
- [Scalekit — JWT validation, JWKS, audience and scopes](https://docs.scalekit.com/authenticate/mcp/xmcp-quickstart/)
- [Scalekit — API permissions and naming](https://docs.scalekit.com/apis/?product=agentkit)
- [Observed Scalekit authorization-server metadata](https://twoweeks.scalekit.dev/resources/res_135600270506722306/.well-known/oauth-authorization-server)
- [Clerk — OAuth implementation](https://clerk.com/docs/guides/configure/auth-strategies/oauth/how-clerk-implements-oauth)
- [Clerk — Scoped access](https://clerk.com/docs/guides/configure/auth-strategies/oauth/scoped-access)
- [Clerk — OAuth improvements and custom-scope status](https://clerk.com/changelog/2025-06-13-oauth-improvements)
- [Clerk — MCP client connection](https://clerk.com/docs/guides/ai/mcp/connect-mcp-client)
- [Clerk — Supabase integration](https://clerk.com/docs/guides/development/integrations/databases/supabase)
- [Stytch — MCP authorization overview](https://stytch.com/docs/connected-apps/guides/mcp-auth-overview)
- [Stytch — Public-app PKCE](https://stytch.com/docs/connected-apps/build-custom-flow/public-apps)
- [Stytch — OAuth scopes](https://stytch.com/docs/connected-apps/oauth-learn-more/oauth-scopes)
- [Stytch — Access-token object](https://stytch.com/docs/api-reference/consumer/api/connected-apps/tokens/connected-app-access-token-object)
- [Stytch — Consent management](https://stytch.com/docs/connected-apps/resources/consent-management)
- [Supabase — OAuth 2.1 Server](https://supabase.com/docs/guides/auth/oauth-server)
- [Supabase — MCP Authentication](https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication)
- [Supabase — OAuth flows and supported scopes](https://supabase.com/docs/guides/auth/oauth-server/oauth-flows)
- [Supabase — Token Security and RLS](https://supabase.com/docs/guides/auth/oauth-server/token-security)
- [Supabase — Third-party auth](https://supabase.com/docs/guides/auth/third-party/overview)
- [Supabase — Pricing](https://supabase.com/pricing)

## Sources opérationnelles r/mcp

- [Remote MCP OAuth : WorkOS/Cloudflare, RFC 9728/7591/8707 et difficultés de flux](https://www.reddit.com/r/mcp/comments/1m0s1bk/what_level_of_difficulty_would_you_say_getting/)
- [Même MCP read-only dans Claude et ChatGPT, UX OAuth différente](https://www.reddit.com/r/mcp/comments/1uvlpsp/same_readonly_oauth_mcp_in_claude_and_chatgpt_the/)
- [Complexité des callbacks DCR/localhost avec Auth0](https://www.reddit.com/r/mcp/comments/1lfnvsz/claude_desktop_mcp_remote_oauth_callback_vulnerabilities/)
- [Difficultés pratiques OAuth dans les configurations MCP distantes](https://www.reddit.com/r/mcp/comments/1mw09b5/how-are-you-handling-oauth-when-running-mcp-servers-remotely/)

## Vérification du périmètre

- Documentation ajoutée uniquement ; aucun fichier de code ou de configuration runtime
  n’est modifié par cette ADR.
- Aucune nouvelle ressource Railway, Auth0, WorkOS, Clerk, Stytch ou Supabase n’est
  créée. Le contrôle utilise une ressource Scalekit sandbox existante ; aucune
  ressource de production n’est créée.
- Aucune migration de schéma, de comptes, de claims ou de RLS n’est effectuée.
- PR258 reste un contrat documentaire et ne lance aucune qualification de production.
  Le résultat Scalekit ci-dessus est une qualification sandbox bornée effectuée
  séparément sur une ressource existante.
