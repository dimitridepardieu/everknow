# Flashcard Academy

PWA mobile-first (parents + enfants) pour générer et réviser des flashcards par IA.
Stack: Go (stdlib) + React/Vite/TS + Postgres, Docker pour tout, Caddy en TLS local.

## Language
- Conversation avec le dev : **français**.
- Code, commits, issues, PRs, docs techniques : **anglais**.

## Mobile-first
Designer et tester sur viewport mobile d'abord, desktop ensuite. Cible : smartphones.
Toujours ajouter `cursor-pointer` (Tailwind 4) sur les éléments cliquables.

## Approval gate
Demander avant d'installer une dépendance ou de lancer une commande irréversible (db drop, force push, branch -D, etc.).

## Commands — Docker only
Go et Bun peuvent être installés en local pour l'IDE (gopls, tsserver) ; **toutes les commandes runtime tournent en container**.

| Cas | Commande |
|---|---|
| Go one-shot | `make exec-api CMD="go test ./..."` |
| Bun one-shot | `make exec-web CMD="bun run build"` |
| SQL one-shot | `make exec-psql CMD="SELECT ..."` |
| Shell interactif (humain) | `make api` / `make web` / `make psql` |

⚠️ **JAMAIS `bun install` ni `go install` sur l'hôte** — produit des binaires macOS dans `node_modules`/`$GOPATH` qui crashent en container Linux.

Versions = source de vérité dans `docker/.env`. `make fmt` avant chaque commit.

## Git & PRs
- **Conventional Commits**, capitaliser le premier mot après le préfixe : `feat: Add ...` (pas `feat: add ...`).
- Messages en anglais, **body obligatoire** expliquant le *why*.
- **Jamais de `Co-Authored-By`**.
- Issues + PRs accessibles à un non-dev (PM, designer) **et** à un senior dev en <30s. PR body : *what* (user-visible) → *why* → *key approach* (1-2 phrases, pas le diff).
- Pour créer une issue triée (labels + Priority + Size posés à la création), utiliser le skill `create-issue`.

## Go — Effective Go is the baseline
**YOU MUST treat [Effective Go](https://go.dev/doc/effective_go) as the reference.** When unsure, mirror the stdlib (`net/http`, `database/sql`, `errors`, `context`). Deviate only with a documented reason.

- `fmt.Errorf("open db: %w", err)` **uniquement** quand on ajoute du contexte. Sinon `return err`.
- Context keys = `type k struct{}` + `ctx.Value(k{})`.
- Packages = vertical slice (`auth`, `session`, `user`), pas `handlers/`/`services/`/`repositories/`.
- Interfaces côté **consumer**, petites (1-3 méthodes), 1 implémentation = pas d'interface tant qu'il n'y a pas de seam.
- `init()` est presque toujours un smell — préférer un constructeur explicite depuis `main`.

### Architecture invariants
- Direction des dépendances : **feature → primitive** uniquement. `auth` peut dépendre de `user` + `session`, l'inverse non.
- Aucun package domaine ne dépend de `middleware`. Helpers de context (`UserFromContext`) vivent dans le package qui possède le type.
- **Une seule composition root** : `main.go` en prod, `apitest.New` en tests.
- Chaque package possède ses propres `ErrNotFound` (`auth.ErrNotFound` ≠ `user.ErrNotFound`).

## Frontend — TanStack Router + React
- **Pathless layouts (`_xxx.tsx`)** = layout fonctionnel : auth guard, state persistant entre navigations, données préchargées partagées. **Pas pour la déduplication visuelle.** Tailwind utility classes dupliquées sont OK ; extraire un composant React uniquement si Rule of 2-then-3 est dépassée.
- **Auth boundary** : `_authenticated/route.tsx` (convention documentée par TanStack).
- **Fichiers de routes** : un groupe (layout + ses enfants, ou route + ses sous-routes) vit dans un **directory** avec `route.tsx` comme layout — ex: `_authenticated/route.tsx`, `_authenticated/learn.tsx`, `_authenticated/decks/$deckId.tsx`. **Pas** la notation pointée (`_authenticated.learn.tsx`) : ne pas mélanger les deux styles dans un même sous-arbre. Routes racine isolées (`login.tsx`, `index.tsx`) = fichiers plats.
- **Composants partagés entre routes** : vivent dans `components/` (ex: `components/auth-form.tsx`). `components/ui/` est réservé aux primitives shadcn — pas de composants métier dedans.
- **Contrôles & boutons = primitives shadcn** (`Input`, `Label`, `Button`…), jamais de `<input>`/`<button>`/`<label>` natifs en code applicatif (le natif ne vit que dans `components/ui/`, à l'intérieur des primitives). Lien stylé en bouton = `buttonVariants()` sur `<Link>`/`<a>`.

## Logging — slog
- Utiliser `slog.InfoContext` / `WarnContext` / `ErrorContext` (jamais `slog.Info`) pour propager `request_id`, `user_id`.
- Attributs en `(key, value)`, **jamais** `fmt.Sprintf` dans le message.
- Logger les **business events dans les services** (`magic link sent`, `user role updated`), pas seulement les requêtes HTTP en middleware.
- **Jamais logger** : request bodies, tokens (session, magic-link, JWT), cookies, passwords, API keys.

## PII (GDPR)
PII = email, nom, téléphone, IP, user agent, géoloc, données enfant, texte libre utilisateur.
- **Logs** : `RedactEmail()` en prod ; clair en dev seulement (`cfg.IsDev()` est le gate).
- **API responses** : scoper par `user_id` du context. Jamais renvoyer la PII d'un autre user.
- **Errors au client** : pas d'écho à la PII (`"invalid email"`, pas `"user@x.com is invalid"`).
- Défaut : **don't log it, don't return it**.

## Anti-overengineering
- **Rule of 2-then-3** : 1ère fois → inline. 2ème fois → copier-coller. 3ème fois → extraire. Pas avant.
- **Filtrer le feedback des agents AVANT de me le présenter.** Pour chaque finding : (1) proportionné MVP scale ? (2) idiomatique dans CE codebase ? (3) introduit une abstraction non déjà justifiée ? Ne relayer que ceux qui passent. Le filtre est ton job, pas le mien.
- **Trois buckets pour toute valeur littérale** :
  - `.env` → opérateur peut vouloir la changer (URLs, TTL, provider).
  - `const` en code prod → protocole/convention identique partout (`SessionCookieName`).
  - `const` en test → valeur synthétique, n'importe quelle équivalente marcherait.
  Une seule des trois, jamais en doute.

## Gotchas — project-specific
- **`.env` changes ne sont PAS pris par `make restart`** → `make rebuild` ou `docker compose ... up -d --force-recreate <service>`.
- **Migrations ne tournent qu'au boot de l'api** → après `make db-reset`, utiliser `make db-fresh` (reset + restart api + seed).
- **State drift** : après une longue conversation ou plusieurs edits, **re-lire le fichier avant de l'éditer**, et **vérifier (grep/read/test) avant d'affirmer** ("X retourne Y", "cette route est wirée", etc.) — la mémoire de conversation dérive, le filesystem est la vérité.
- **Documentation de lib** (React 19, Tailwind v4, shadcn, Vite, Bun) → `mcp__claude_ai_Context7__resolve-library-id` + `query-docs`, jamais la mémoire de training.
- **Après edit TS/TSX/CSS/JSON config** → `mcp__ide__getDiagnostics` pour capturer les warnings IDE invisibles à `tsc`/ESLint.
- **MCP tools utiles** : Mermaid (diagrammes), Excalidraw (mockups). À utiliser proactivement quand approprié.
