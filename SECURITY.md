# Security Policy

## Supported versions

Only the latest version on the default branch is supported.

## Reporting a vulnerability

Please do not open a public issue for a suspected security vulnerability.

Until a private security contact is published for this repository, report issues privately to the repository owner through GitHub. Do not include secrets, OAuth tokens, uploaded page contents, or personal data in the report.

Please include:

- affected component and version/commit
- reproduction steps or a minimal proof of concept
- impact assessment
- suggested mitigation, if known

## Deployment guidance

- Never commit Google OAuth credentials, MCP signing secrets, API tokens, `.dev.vars`, or `.env` files.
- Treat uploaded Markdown and HTML as untrusted input.
- Keep R2 buckets private and serve objects through the Worker.
- Configure an allowlist for Google accounts or domains in production.
- Use a separate Cloudflare account/project and secrets for local, staging, and production deployments.
- Review the OAuth redirect allowlist before exposing an instance publicly.
