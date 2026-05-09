# payload-scramble Rename + Stoplight UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the existing `payload-oapi` Payload CMS plugin to `payload-scramble`, switch the project to pnpm, remove the four existing documentation-UI plugins (Scalar, Swagger UI, Rapidoc, Redoc), and add a single new `stoplight` plugin powered by Stoplight Elements.

**Architecture:** Plugin structure is unchanged. Same Payload `Plugin` factory pattern as the four removed UI plugins; the new `stoplight` plugin registers a `GET {docsUrl}` endpoint that returns HTML loading Stoplight Elements from the unpkg CDN. Zero new runtime dependencies.

**Tech Stack:** TypeScript, Payload CMS 3.x, pnpm, Biome, Vitest, Stoplight Elements (CDN-loaded web component).

**Spec:** `docs/superpowers/specs/2026-05-09-payload-scramble-rename-design.md`

---

## Notes for the implementer

- The project does not have unit tests for UI plugins (this matches existing convention — Scalar/Swagger/Rapidoc/Redoc plugins have no tests). For the new `stoplight` plugin, **manual verification** against a running Payload dev server replaces a unit test. Do not invent unit tests for it.
- The existing Vitest suite (`test/openapi-generators.test.ts`) tests the OpenAPI generator core, which this refactor does not touch. Running it green on each commit is the regression signal.
- Paths in this plan are relative to repo root: `/Users/tobi/Sites/explore/payload-scramble`.
- All `git commit` commands assume staging is intentional — only stage files explicitly named in each step.

---

## Task 1: Switch project package manager to pnpm

**Files:**
- Modify: `package.json`
- Delete: `yarn.lock`, `dev/yarn.lock`
- Create: `pnpm-lock.yaml` (generated), `.npmrc`
- Modify: `.gitignore`

- [ ] **Step 1: Verify current state**

Run:
```bash
cd /Users/tobi/Sites/explore/payload-scramble
ls yarn.lock dev/yarn.lock
cat package.json | grep -E '"packageManager"|"name"|"version"'
```

Expected: both lockfiles exist; `"packageManager": "yarn@1.22.19+sha1..."`, `"name": "payload-oapi"`, `"version": "0.2.5"`.

- [ ] **Step 2: Verify webpack devDep is unused**

Run:
```bash
grep -rn "from 'webpack'" src/ dev/ test/ 2>/dev/null
grep -rn 'from "webpack"' src/ dev/ test/ 2>/dev/null
grep -rn "require('webpack')" src/ dev/ test/ 2>/dev/null
```

Expected: no output. (`dev/next.config.mjs` references the parameter named `webpackConfig` but does not import the `webpack` package — Next.js injects it.)

- [ ] **Step 3: Create `.npmrc`**

Create `.npmrc` with this exact content:
```
auto-install-peers=true
strict-peer-dependencies=false
```

- [ ] **Step 4: Update `.gitignore`**

Append the following two lines to `.gitignore`:
```
.pnpm-store/
pnpm-debug.log*
```

- [ ] **Step 5: Edit `package.json` — packageManager + scripts + drop webpack**

Replace these specific lines/values:

- Change `"packageManager": "yarn@1.22.19+sha1.4ba7fc5c6e704fce2066ecbfb0b0d8976fe62447"` → `"packageManager": "pnpm@9.15.0"`
- In the `scripts` block:
  - `"prepublishOnly": "yarn build"` → `"prepublishOnly": "pnpm build"`
  - `"dev:generate-importmap": "yarn dev:payload generate:importmap"` → `"dev:generate-importmap": "pnpm dev:payload generate:importmap"`
  - `"dev:generate-types": "yarn dev:payload generate:types"` → `"dev:generate-types": "pnpm dev:payload generate:types"`
- In the `devDependencies` block: remove the `"webpack": "^5.101.3"` line entirely.

- [ ] **Step 6: Delete yarn lockfiles**

Run:
```bash
rm yarn.lock dev/yarn.lock
```

- [ ] **Step 7: Install with pnpm and generate lockfile**

Run:
```bash
pnpm install
```

Expected: pnpm resolves all dependencies; creates `pnpm-lock.yaml`; no errors. Peer-dependency warnings about `react`/`payload` versions are acceptable.

- [ ] **Step 8: Verify build still works on pnpm**

Run:
```bash
pnpm build
ls dist/index.js dist/index.d.ts
```

Expected: build succeeds; both files exist.

- [ ] **Step 9: Verify lint and tests still pass**

Run:
```bash
pnpm lint && pnpm test
```

Expected: Biome reports no errors; Vitest suite passes (test count matches what was passing before — likely 1 test file).

- [ ] **Step 10: Commit**

```bash
git add package.json .npmrc .gitignore pnpm-lock.yaml
git rm yarn.lock dev/yarn.lock
git commit -m "chore: switch project to pnpm and drop unused webpack devDep"
```

---

## Task 2: Rename package to payload-scramble

**Files:**
- Modify: `package.json`
- Modify: `dev/tsconfig.json`
- Modify: `dev/payload.config.ts`

- [ ] **Step 1: Edit `package.json` — identity fields**

Apply these edits:

- `"name": "payload-oapi"` → `"name": "payload-scramble"`
- `"version": "0.2.5"` → `"version": "0.1.0"`
- `"homepage:": "https://github.com/janbuchar/payload-oapi"` → `"homepage": "https://github.com/tobidsn/payload-scramble"` (note: drop the trailing colon in the key)
- `"repository:": "https://github.com/janbuchar/payload-oapi"` → replace with this object form:
  ```json
  "repository": {
    "type": "git",
    "url": "git+https://github.com/tobidsn/payload-scramble.git"
  }
  ```
- Insert a new `"publishConfig"` field after `"license"`:
  ```json
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
  ```
- In the `keywords` array, add `"stoplight"` and `"docs"` to the existing list.

- [ ] **Step 2: Edit `dev/tsconfig.json` — rename path alias**

In the `compilerOptions.paths` block, change:
```json
"@payload-oapi": ["../src/index.ts"]
```
to:
```json
"@payload-scramble": ["../src/index.ts"]
```

- [ ] **Step 3: Edit `dev/payload.config.ts` — update import**

Change line 3 from:
```ts
import { openapi, rapidoc, redoc, swaggerUI } from '@payload-oapi'
```
to:
```ts
import { openapi, rapidoc, redoc, swaggerUI } from '@payload-scramble'
```

(The UI plugins are still imported here — they will be removed in Task 3. Don't pre-clean them in this task; keep changes scoped.)

- [ ] **Step 4: Verify TypeScript still resolves**

Run:
```bash
pnpm build
```

Expected: build succeeds. (The `dev/` config is not in the build set; the alias rename only affects dev tsconfig used by `payload run`. Confirm dev typecheck via the dev script in a later step.)

- [ ] **Step 5: Commit**

```bash
git add package.json dev/tsconfig.json dev/payload.config.ts
git commit -m "chore: rename package to payload-scramble"
```

---

## Task 3: Remove the four old UI plugins

**Files:**
- Delete: `src/scalarPlugin.ts`, `src/swaggerUIPlugin.ts`, `src/rapidocPlugin.ts`, `src/redocPlugin.ts`
- Modify: `src/index.ts`
- Modify: `dev/payload.config.ts`

- [ ] **Step 1: Delete the four plugin files**

Run:
```bash
rm src/scalarPlugin.ts src/swaggerUIPlugin.ts src/rapidocPlugin.ts src/redocPlugin.ts
```

- [ ] **Step 2: Replace `src/index.ts`**

Overwrite `src/index.ts` with exactly:
```ts
import openapi from './openapiPlugin.js'

export { openapi }
```

(After Task 4 this file will also export `stoplight`. For now it only exports `openapi` — keep commits clean and self-contained.)

- [ ] **Step 3: Update `dev/payload.config.ts` — drop UI imports and plugin entries**

Change the import line from:
```ts
import { openapi, rapidoc, redoc, swaggerUI } from '@payload-scramble'
```
to:
```ts
import { openapi } from '@payload-scramble'
```

In the `plugins:` array (currently lines ~51-56), remove the `swaggerUI(...)`, `redoc(...)`, and `rapidoc(...)` entries. The block should read:
```ts
plugins: [
  openapi({ openapiVersion: '3.0', metadata: { title: 'Dev API', version: '0.0.1' } }),
],
```

- [ ] **Step 4: Verify build still passes**

Run:
```bash
pnpm build
```

Expected: build succeeds; no references to deleted files.

- [ ] **Step 5: Verify tests still pass**

Run:
```bash
pnpm test
```

Expected: existing Vitest suite green (the suite tests `src/openapi/generators.ts`, untouched).

- [ ] **Step 6: Verify nothing else imports the deleted modules**

Run:
```bash
grep -rn "scalarPlugin\|swaggerUIPlugin\|rapidocPlugin\|redocPlugin" src/ dev/ test/ 2>/dev/null
```

Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add src/index.ts dev/payload.config.ts
git rm src/scalarPlugin.ts src/swaggerUIPlugin.ts src/rapidocPlugin.ts src/redocPlugin.ts
git commit -m "chore: remove scalar, swagger-ui, rapidoc, redoc plugins"
```

---

## Task 4: Add the Stoplight Elements UI plugin

**Files:**
- Create: `src/stoplightPlugin.ts`
- Modify: `src/index.ts`
- Modify: `dev/payload.config.ts`

- [ ] **Step 1: Create `src/stoplightPlugin.ts`**

Create the file with exactly this content:
```ts
import type { Config, Plugin } from 'payload'

interface StoplightOptions {
  specEndpoint?: string
  docsUrl?: string
  enabled?: boolean
  layout?: 'sidebar' | 'stacked'
  router?: 'hash' | 'memory'
  title?: string
}

const stoplight =
  ({
    specEndpoint = '/api/openapi.json',
    docsUrl = '/docs',
    enabled = true,
    layout = 'sidebar',
    router = 'hash',
    title = 'API Docs',
  }: StoplightOptions = {}): Plugin =>
  ({ endpoints = [], ...config }: Config): Config => {
    if (!enabled) {
      return { ...config, endpoints }
    }

    return {
      ...config,
      endpoints: [
        ...endpoints,
        {
          method: 'get',
          path: docsUrl,
          handler: async req => {
            const fullSpecUrl = `${req.protocol}//${req.headers.get('host')}${specEndpoint}`

            const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="stylesheet" href="https://unpkg.com/@stoplight/elements/styles.min.css" />
    <script src="https://unpkg.com/@stoplight/elements/web-components.min.js" defer></script>
  </head>
  <body style="height:100vh;margin:0">
    <elements-api
      apiDescriptionUrl="${fullSpecUrl}"
      router="${router}"
      layout="${layout}" />
  </body>
</html>`

            return new Response(html, {
              headers: { 'content-type': 'text/html' },
            })
          },
        },
      ],
    }
  }

export default stoplight
```

- [ ] **Step 2: Update `src/index.ts` to export the new plugin**

Overwrite `src/index.ts` with exactly:
```ts
import openapi from './openapiPlugin.js'
import stoplight from './stoplightPlugin.js'

export { openapi, stoplight }
```

- [ ] **Step 3: Update `dev/payload.config.ts` to use the stoplight plugin**

Change the import line to:
```ts
import { openapi, stoplight } from '@payload-scramble'
```

In the `plugins:` array, add a `stoplight` entry so the block becomes:
```ts
plugins: [
  openapi({ openapiVersion: '3.0', metadata: { title: 'Dev API', version: '0.0.1' } }),
  stoplight({ docsUrl: '/docs' }),
],
```

- [ ] **Step 4: Verify build**

Run:
```bash
pnpm build
ls dist/stoplightPlugin.js dist/stoplightPlugin.d.ts dist/index.d.ts
```

Expected: build succeeds; all three files exist.

- [ ] **Step 5: Verify lint**

Run:
```bash
pnpm lint
```

Expected: Biome passes.

- [ ] **Step 6: Verify the public export shape**

Run:
```bash
node -e "import('./dist/index.js').then(m => console.log(Object.keys(m).sort()))"
```

Expected output: `[ 'openapi', 'stoplight' ]`

- [ ] **Step 7: Manually verify the docs page renders (requires MongoDB)**

Pre-check: ensure a local MongoDB is reachable at the URI in `dev/docker-compose.yml` or set `DATABASE_URI` accordingly. If MongoDB is not available, **stop here and report this**: "Cannot verify Stoplight UI manually — MongoDB is not available." Do **not** mark this step as completed in that case.

Run (in one terminal):
```bash
pnpm dev
```

Wait until the server logs `Server listening on ...`. Then in another terminal:
```bash
curl -s -o /tmp/docs.html -w "%{http_code}\n" http://localhost:3000/docs
grep -E '<elements-api|@stoplight/elements' /tmp/docs.html
```

Expected: HTTP 200; the grep finds the `<elements-api` tag and the unpkg script reference. Open `http://localhost:3000/docs` in a browser and confirm Stoplight Elements renders the spec (sidebar layout, list of operations from the `Posts`/`Pets`/`Users` collections visible).

Stop the dev server (`Ctrl-C`) when done.

- [ ] **Step 8: Commit**

```bash
git add src/stoplightPlugin.ts src/index.ts dev/payload.config.ts
git commit -m "feat: add stoplight elements docs UI plugin"
```

---

## Task 5: Rewrite README and CHANGELOG for 0.1.0

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Overwrite `README.md`**

Replace the entire contents of `README.md` with:
````markdown
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
````

- [ ] **Step 2: Overwrite `CHANGELOG.md`**

Replace the entire contents of `CHANGELOG.md` with:
```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-05-09

Initial release of `payload-scramble`, forked from [`payload-oapi`](https://github.com/janbuchar/payload-oapi).

### Added

- Stoplight Elements documentation UI plugin (`stoplight`)

### Removed

- Scalar, Swagger UI, Rapidoc, and Redoc UI plugins (consolidated to a single Stoplight UI)

### Changed

- Renamed package from `payload-oapi` to `payload-scramble`
- Switched project tooling from yarn to pnpm
```

- [ ] **Step 3: Verify markdown is well-formed**

Run:
```bash
head -5 README.md && echo "---" && head -5 CHANGELOG.md
```

Expected: README begins with `# payload-scramble`; CHANGELOG begins with `# Changelog`.

- [ ] **Step 4: Commit**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: rewrite README and CHANGELOG for 0.1.0"
```

---

## Task 6: Switch CI workflows to pnpm

**Files:**
- Modify: `.github/workflows/check.yml`
- Modify: `.github/workflows/release.yml`

- [ ] **Step 1: Overwrite `.github/workflows/check.yml`**

Replace the entire file with:
```yaml
name: Run code checks

on:
  pull_request:

  push:
    branches:
      - master

jobs:
  checks:
    runs-on: ubuntu-latest
    name: Check code style
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm ci

  build:
    runs-on: ubuntu-latest
    name: Check if build works
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build

  test:
    runs-on: ubuntu-latest
    name: Run tests
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
```

- [ ] **Step 2: Overwrite `.github/workflows/release.yml`**

Replace the entire file with:
```yaml
name: Publish a release

on:
  workflow_dispatch:
    inputs:
      release_type:
        required: true
        type: choice
        options:
          - patch
          - minor
          - major
          - none
      stability:
        required: true
        type: choice
        options:
          - latest
          - beta

jobs:

  prepare_metadata:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.bump_version.outputs.version }}
      release_sha: ${{ steps.commit.outputs.commit_long_sha || github.sha }}
    permissions:
      contents: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.PERSONAL_TOKEN }}

      - name: Set up git
        run: |
          git config --global user.email "noreply@github.com"
          git config --global user.name "github-actions[bot]"

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Bump version in package.json
        id: bump_version
        run: |
          release_type=${{ github.event.inputs.release_type }}
          if [ "${{ github.event.inputs.stability }}" = "beta" ]; then
            if [ "${{ github.event.inputs.release_type }}" = "none" ]; then
              release_type=prerelease
            else
              release_type=pre$release_type
            fi
          else
            if [ "${{ github.event.inputs.release_type }}" = "none" ]; then
              echo "Release type 'none' only works with 'beta' releases" >&2
              exit 1
            fi
          fi
          npm version --no-git-tag-version --preid b $release_type
          echo version=$( node -p "require('./package.json').version" ) >> "$GITHUB_OUTPUT"

      - name: Update changelog
        if: ${{ github.event.inputs.stability == 'latest' }}
        uses: orhun/git-cliff-action@v4
        with:
          config: cliff.toml
          args: --tag "release-${{ steps.bump_version.outputs.version }}"
        env:
          OUTPUT: CHANGELOG.md

      - name: Fix formatting
        run: pnpm lint:fix

      - name: Commit changes
        id: commit
        uses: EndBug/add-and-commit@v9
        with:
          add: package.json CHANGELOG.md
          author_name: github-actions[bot]
          author_email: noreply@github.com
          message: "chore(release): ${{ steps.bump_version.outputs.version }} [skip ci]"

  gh_release:
    runs-on: ubuntu-latest
    needs: prepare_metadata
    if: ${{ github.event.inputs.stability == 'latest' }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Generate release notes
        uses: orhun/git-cliff-action@v4
        with:
          config: cliff.toml
          args: --tag "release-${{ needs.prepare_metadata.outputs.version }}" --unreleased --strip all
        env:
          OUTPUT: release_notes.md

      - name: Create release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: release-${{ needs.prepare_metadata.outputs.version }}
          name: Release ${{ needs.prepare_metadata.outputs.version }}
          target_commitish: ${{ needs.prepare_metadata.outputs.release_sha }}
          body_path: release_notes.md

  npm_publish:
    runs-on: ubuntu-latest
    needs: prepare_metadata
    env:
      NODE_AUTH_TOKEN: ${{secrets.NPM_PUBLISH_TOKEN}}
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          ref: ${{ needs.prepare_metadata.outputs.release_sha }}

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          registry-url: 'https://registry.npmjs.org'
          cache: 'pnpm'

      - name: Build
        run: |
          pnpm install --frozen-lockfile
          pnpm build

      - name: Publish to NPM
        run: npm publish --tag "${{ github.event.inputs.stability }}"
```

- [ ] **Step 3: Validate workflow YAML syntax**

Run:
```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/check.yml')); yaml.safe_load(open('.github/workflows/release.yml')); print('OK')"
```

Expected: `OK`. (If `python3` is unavailable, use `pnpm dlx js-yaml .github/workflows/check.yml > /dev/null && pnpm dlx js-yaml .github/workflows/release.yml > /dev/null` instead.)

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/check.yml .github/workflows/release.yml
git commit -m "ci: switch workflows to pnpm and update release identity"
```

---

## Task 7: Final verification and tarball inspection

**Files:** none (read-only checks).

- [ ] **Step 1: Clean install from scratch**

Run:
```bash
rm -rf node_modules dist
pnpm install
```

Expected: clean install succeeds using the committed `pnpm-lock.yaml`.

- [ ] **Step 2: Run all checks in the same order CI will**

Run:
```bash
pnpm lint && pnpm build && pnpm test
```

Expected: all three succeed.

- [ ] **Step 3: Inspect the tarball that would be published**

Run:
```bash
pnpm pack
ls payload-scramble-0.1.0.tgz
tar -tzf payload-scramble-0.1.0.tgz | sort
```

Expected:
- File `payload-scramble-0.1.0.tgz` exists.
- Tarball contents include `package/dist/index.js`, `package/dist/index.d.ts`, `package/dist/stoplightPlugin.js`, `package/dist/stoplightPlugin.d.ts`, `package/package.json`, `package/README.md`, `package/LICENSE.md`.
- Tarball does **not** include the four removed plugins (`scalarPlugin.*`, `swaggerUIPlugin.*`, `rapidocPlugin.*`, `redocPlugin.*`), `dev/`, `test/`, or `docs/`.

- [ ] **Step 4: Confirm tarball metadata**

Run:
```bash
tar -xzOf payload-scramble-0.1.0.tgz package/package.json | grep -E '"name"|"version"|"main"|"types"'
```

Expected:
```
"name": "payload-scramble",
"version": "0.1.0",
"main": "dist/index.js",
"types": "dist/index.d.ts",
```

- [ ] **Step 5: Clean up the tarball**

Run:
```bash
rm payload-scramble-0.1.0.tgz
```

- [ ] **Step 6: Final git status check**

Run:
```bash
git status && git log --oneline -8
```

Expected: working tree clean; last 6 commits are (newest first):
1. `ci: switch workflows to pnpm and update release identity`
2. `docs: rewrite README and CHANGELOG for 0.1.0`
3. `feat: add stoplight elements docs UI plugin`
4. `chore: remove scalar, swagger-ui, rapidoc, redoc plugins`
5. `chore: rename package to payload-scramble`
6. `chore: switch project to pnpm and drop unused webpack devDep`

- [ ] **Step 7: Report completion**

Report to the user: which tasks completed, whether the manual Stoplight UI check (Task 4 Step 7) ran or was skipped due to MongoDB unavailability, and any deviations from the plan. Do not run `npm publish` or `git push` — those are user-initiated.
