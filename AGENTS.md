# AGENTS.md

Instructions for AI coding agents (Claude Code, Cursor, Copilot, etc.) installing or integrating `payload-scramble` into a Payload CMS project.

## What this package is

`payload-scramble` is a Payload CMS v3 plugin that:

1. Generates an OpenAPI 3.0 / 3.1 spec from the user's Payload config (collections, globals, auth, preferences) and serves it at `/api/openapi.json`.
2. Optionally serves an interactive [Stoplight Elements](https://stoplight.io/open-source/elements) documentation UI at `/docs`.

Use it when the user asks for "API docs", "OpenAPI spec", "Swagger", or "Stoplight" in a Payload project.

## Requirements

- `payload@^3.0.0` (peer dependency — the host project must already have Payload v3 installed)
- Node 18+
- ESM project (`"type": "module"` in package.json), since this package ships ESM only

## Install

```bash
pnpm add payload-scramble
# or: npm install payload-scramble
# or: yarn add payload-scramble
```

## Minimal integration

Edit the user's `payload.config.ts` (or wherever `buildConfig` is called):

```ts
import { buildConfig } from 'payload'
import { openapi, stoplight } from 'payload-scramble'

export default buildConfig({
  // ...existing config
  plugins: [
    openapi({
      openapiVersion: '3.0',
      metadata: { title: 'My API', version: '1.0.0' },
    }),
    stoplight({ docsUrl: '/docs' }),
  ],
})
```

After this, the dev server exposes:

- `GET /api/openapi.json` — OpenAPI spec
- `GET /docs` — Stoplight Elements UI

## Public exports

The package has exactly two named exports — do not invent others:

```ts
import { openapi, stoplight } from 'payload-scramble'
```

| Export     | Type                  | Purpose                                          |
|------------|-----------------------|--------------------------------------------------|
| `openapi`  | Payload plugin factory | Generates and serves the OpenAPI spec            |
| `stoplight`| Payload plugin factory | Mounts the Stoplight Elements documentation UI   |

## `openapi` options (most-used)

```ts
openapi({
  openapiVersion: '3.0' | '3.1',
  metadata: { title: string, version: string, description?: string },
  filters?: {
    includeCollections?: string[]
    excludeCollections?: string[]
    includeGlobals?: string[]
    excludeGlobals?: string[]
    hideInternalCollections?: boolean // hides payload-* collections
  },
})
```

## `stoplight` options

| Option         | Type                       | Default               |
|----------------|----------------------------|-----------------------|
| `specEndpoint` | `string`                   | `'/api/openapi.json'` |
| `docsUrl`      | `string`                   | `'/docs'`             |
| `enabled`      | `boolean`                  | `true`                |
| `layout`       | `'sidebar' \| 'stacked'`   | `'sidebar'`           |
| `router`       | `'hash' \| 'memory'`       | `'hash'`              |
| `title`        | `string`                   | `'API Docs'`          |

## Common pitfalls

- **Plugin order matters**: register `openapi` before `stoplight` so the spec endpoint is mounted first.
- **`specEndpoint` must match**: if you customize the `openapi` mount path, pass the same path to `stoplight({ specEndpoint })`.
- **Don't add a separate Swagger / Redoc plugin**: this package bundles Stoplight Elements as the only docs UI. Adding another competes for the same route.
- **Internal collections are visible by default**: pass `filters.hideInternalCollections: true` to hide `payload-preferences`, `payload-migrations`, etc. from public docs.

## Verifying the install worked

After editing the config, ask the user to run their dev server and check:

```bash
curl -s http://localhost:3000/api/openapi.json | head -c 200
```

Expected: a JSON document starting with `{"openapi":"3.0...` or `{"openapi":"3.1..."}`.

If that returns HTML or 404, the plugin isn't registered correctly — re-check that `openapi(...)` is in the `plugins` array of `buildConfig`.

## Source / issues

- Repo: https://github.com/tobidsn/payload-scramble
- npm: https://www.npmjs.com/package/payload-scramble
- Forked from `janbuchar/payload-oapi` — OpenAPI generation core is the original author's work.
