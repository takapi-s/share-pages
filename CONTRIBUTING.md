# Contributing

Thanks for contributing to share-pages.

## Development

Requirements:

- Node.js 20 or newer
- npm

Install dependencies and run the checks:

```sh
npm ci
npm run check
npm test
```

For local HTTP development:

```sh
npm start
```

For a local Worker preview, configure `.dev.vars` from `.env.example` and use Wrangler with the appropriate local R2 bindings.

## Pull requests

- Keep changes focused and explain the user-visible behavior.
- Add or update tests for behavior changes.
- Do not include credentials, uploaded content, `.wrangler/`, `data/`, or generated files.
- Run `npm run check`, `npm test`, and `git diff --check` before opening a pull request.
- Document Cloudflare-specific changes in the README.

## Commit messages

Use a concise imperative subject and explain security or migration implications in the body when relevant.
