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
