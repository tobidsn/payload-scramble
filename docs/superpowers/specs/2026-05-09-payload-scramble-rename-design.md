# Design: Rename to `payload-scramble` and consolidate UI to Stoplight Elements

**Date:** 2026-05-09
**Status:** Approved (brainstorming)
**Owner:** tobidsn

## Goal

Refactor the existing `payload-oapi` Payload CMS plugin into a new npm package named `payload-scramble`, switch the project's tooling to pnpm, remove the four existing documentation-UI plugins (Scalar, Swagger UI, Rapidoc, Redoc), and replace them with a single new `stoplight` plugin powered by [Stoplight Elements](https://github.com/stoplightio/elements).

## Non-goals

- No changes to the OpenAPI generation core (`src/openapi/`, `src/openapiPlugin.ts`, `src/requestHandlers.ts`, `src/utils/`).
- No automated `npm publish` from this work — release remains a manual step.
- No new tests for the UI plugin (matches existing project convention; UI plugins were never tested in the prior package).

## User-confirmed decisions

| Decision | Choice |
|---|---|
| Existing UI plugins | **Replace all** with Stoplight only |
| Project package manager | **Switch from yarn to pnpm** |
| First version | **0.1.0** (fresh start, credit original author in README) |
| PR shape | **One branch, logical commits** |

## Architecture

No structural change. The plugin remains a Payload CMS plugin exposing factory functions that mutate the Payload `Config`. The exported surface shrinks:

- **Before:** `payload-oapi` exports `{ openapi, swaggerUI, rapidoc, redoc, scalar }`
- **After:** `payload-scramble` exports `{ openapi, stoplight }`

## File-by-file changes

### Rename & repackage

- `package.json`
  - `name` → `payload-scramble`
  - `version` → `0.1.0`
  - Fix typo'd keys: `homepage:` → `homepage`, `repository:` → `repository`, point to `https://github.com/tobidsn/payload-scramble`
  - Replace `packageManager: yarn@1.22.x` with `pnpm@9.15.0` (or whatever stable pnpm 9.x is current at implementation time)
  - Scripts: replace `yarn build` / `yarn dev:payload` invocations with `pnpm` equivalents
  - Drop `webpack` devDependency only after confirming no source/config files import it (`grep -r webpack src/ dev/`)
  - Add `publishConfig: { access: "public", registry: "https://registry.npmjs.org/" }`
  - `keywords`: add `stoplight`, keep `openapi`/`payload`/`cms`/`plugin`/`typescript`
- `README.md` — full rewrite: new name, pnpm-first install, single Stoplight UI section, credits to `janbuchar/payload-oapi`
- `CHANGELOG.md` — reset to `## 0.1.0 — Initial release`
- `cliff.toml` — keep; update repo URL if referenced
- `.github/` workflows — replace yarn commands with `pnpm/action-setup` + pnpm equivalents; update repo refs
- `yarn.lock` → delete; generate `pnpm-lock.yaml`
- `dev/yarn.lock` → delete
- `.gitignore` — add `.pnpm-store/`
- Add `.npmrc` with `auto-install-peers=true`, `strict-peer-dependencies=false`
- `dev/payload.config.ts` — rename import alias `@payload-oapi` → `@payload-scramble`
- `tsconfig.json`, `dev/tsconfig.json` — same alias rename

### Remove old UI plugins

- Delete `src/scalarPlugin.ts`
- Delete `src/swaggerUIPlugin.ts`
- Delete `src/rapidocPlugin.ts`
- Delete `src/redocPlugin.ts`
- `src/index.ts` — drop their imports/exports
- `dev/payload.config.ts` — drop `swaggerUI`, `redoc`, `rapidoc` from `plugins: []` and from imports

### Add Stoplight plugin

- New `src/stoplightPlugin.ts`
- `src/index.ts` — add `export { default as stoplight } from './stoplightPlugin.js'`
- `dev/payload.config.ts` — add `stoplight({ docsUrl: '/docs' })` so the dev server demonstrates it

## Stoplight plugin spec

### Public API

```ts
stoplight({
  specEndpoint?: string                      // default '/api/openapi.json'
  docsUrl?: string                           // default '/docs'
  enabled?: boolean                          // default true
  layout?: 'sidebar' | 'stacked'             // default 'sidebar'
  router?: 'hash' | 'memory'                 // default 'hash'
  title?: string                             // default 'API Docs'
})
```

### Behavior

- When `enabled: false`, returns config untouched (matches existing pattern in the deleted plugins).
- Otherwise registers a `GET {docsUrl}` endpoint that returns HTML loading Stoplight Elements from the unpkg CDN.
- HTML contains the `<elements-api>` web component pointed at `${protocol}//${host}${specEndpoint}` (same URL-construction pattern as the prior plugins).

### HTML template

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <link rel="stylesheet"
          href="https://unpkg.com/@stoplight/elements/styles.min.css" />
    <script src="https://unpkg.com/@stoplight/elements/web-components.min.js"
            defer></script>
  </head>
  <body style="height:100vh;margin:0">
    <elements-api
      apiDescriptionUrl="{fullSpecUrl}"
      router="{router}"
      layout="{layout}" />
  </body>
</html>
```

### Rationale

- Same factory shape as the four removed plugins, so removing them and adding this is a clean 1-for-1 swap from a consumer's perspective.
- Exposes only the Stoplight options with practical impact (`layout`, `router`, `title`). `apiDescriptionUrl` is computed from `specEndpoint`, not user-set.
- CDN loading keeps the npm package zero-runtime-dep for the UI (matches how Scalar/Swagger UI worked) — important for bundle size and Payload's Next.js admin SSR.

### Error handling

None beyond Payload's endpoint handler defaults. If the spec endpoint 404s, Stoplight Elements renders its own client-side error UI. Same failure mode as the previous UIs.

## Build & publish

- `tsc` continues to emit `dist/`. `package.json` `files` stays `["dist", "*.js", "*.d.ts"]`.
- `publishConfig.access: "public"` ensures the first publish does not accidentally go private.
- Release workflow under `.github/` is updated for pnpm but the trigger logic is unchanged. Actual `npm publish` remains gated behind manual release.
- README install block leads with `pnpm add payload-scramble`; mentions npm/yarn work too.

## Validation checklist

1. `pnpm install` from clean state succeeds.
2. `pnpm build` — TypeScript compiles after deletions and rename.
3. `pnpm lint` — Biome passes.
4. `pnpm test` — Vitest suite green (tests core generators, unaffected).
5. `pnpm dev` — start dev Payload server, hit `http://localhost:3000/docs`, confirm Stoplight Elements renders. Toggle `layout: 'stacked'` once to confirm the option works.
6. `pnpm pack` — inspect tarball; confirm `name: payload-scramble` and only `dist/` ships.

Step 5 requires a reachable MongoDB (`mongooseAdapter` in dev config). If Mongo is not reachable, the implementer must say so explicitly rather than claim success.

## Commit plan

1. `chore: rename to payload-scramble and switch to pnpm`
2. `chore: remove scalar, swagger-ui, rapidoc, redoc plugins`
3. `feat: add stoplight elements docs UI plugin`
4. `docs: rewrite README and CHANGELOG for 0.1.0`
5. `ci: switch release workflow to pnpm`

## Credits

Forked from [`janbuchar/payload-oapi`](https://github.com/janbuchar/payload-oapi). Original MIT license preserved; README credits the original author.
