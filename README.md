# payload-scramble

[![npm version](https://badge.fury.io/js/payload-scramble.svg)](https://www.npmjs.com/package/payload-scramble)

Autogenerate an OpenAPI specification from your [Payload CMS](https://payloadcms.com) instance and serve interactive documentation via [Stoplight Elements](https://stoplight.io/open-source/elements).

## Features

- Complete OpenAPI 3.0 / 3.1 spec generation for collection and global CRUD endpoints
- Authentication and preferences endpoints included
- Filterable: include/exclude collections and globals, hide internal `payload-*` collections
- Single bundled documentation UI: Stoplight Elements

## Installation

```bash
pnpm add payload-scramble
```

(npm and yarn also work — the published package is installer-agnostic.)

## Setup

### 1. Add the OpenAPI core plugin

```ts
import { openapi } from 'payload-scramble'

buildConfig({
  plugins: [
    openapi({
      openapiVersion: '3.0',
      metadata: { title: 'My API', version: '1.0.0' },
    }),
  ],
  // ...
})
```

### 2. Add the Stoplight Elements documentation UI

```ts
import { openapi, stoplight } from 'payload-scramble'

buildConfig({
  plugins: [
    openapi({ openapiVersion: '3.0', metadata: { title: 'My API', version: '1.0.0' } }),
    stoplight({ docsUrl: '/docs' }),
  ],
  // ...
})
```

#### `stoplight` options

| Option         | Type                              | Default               | Description                                       |
|----------------|-----------------------------------|-----------------------|---------------------------------------------------|
| `specEndpoint` | `string`                          | `'/api/openapi.json'` | Where the OpenAPI JSON spec is served             |
| `docsUrl`      | `string`                          | `'/docs'`             | Path the documentation UI is mounted on           |
| `enabled`      | `boolean`                         | `true`                | Set `false` to disable the plugin entirely        |
| `layout`       | `'sidebar' \| 'stacked'`          | `'sidebar'`           | Stoplight Elements layout mode                    |
| `router`       | `'hash' \| 'memory'`              | `'hash'`              | Stoplight Elements router (hash is CDN-safe)      |
| `title`        | `string`                          | `'API Docs'`          | HTML `<title>` for the documentation page         |

### 3. Filter collections and globals (optional)

Use `filters` on the `openapi` plugin:

- `includeCollections` / `excludeCollections` — filter collections by slug
- `includeGlobals` / `excludeGlobals` — filter globals by slug
- `hideInternalCollections` — exclude `payload-*` collections

```ts
openapi({
  openapiVersion: '3.0',
  metadata: { title: 'Dev API', version: '0.0.1' },
  filters: {
    includeCollections: ['posts', 'categories'],
    excludeGlobals: ['footer'],
    hideInternalCollections: true,
  },
})
```

## Usage

The OpenAPI spec is served at `/api/openapi.json` by default. With the `stoplight` plugin, the docs UI is at `/docs`. Both paths are configurable.

## Credits

Forked from [`janbuchar/payload-oapi`](https://github.com/janbuchar/payload-oapi). The OpenAPI generation core is the original author's work; this fork narrows the documentation UI to Stoplight Elements and renames the package. Original MIT license preserved.

## License

MIT
