# Security Policy

## Supported versions

Security fixes are applied to the latest released minor version.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting for this repository. Do not open a public issue for an unpatched vulnerability. Include reproduction steps, affected transport/tool, impact, and any suggested mitigation. Expect an initial acknowledgement within seven days.

## Deployment guidance

- Set long, independent `DRAWARCH_API_KEY` and `DRAWARCH_APPROVAL_SECRET` values.
- Terminate TLS before the HTTP server and expose only `/mcp`, `/health`, and authenticated `/files` routes.
- Set exact host and origin allowlists; do not use broad wildcard reverse-proxy rules.
- Keep online assets disabled unless needed and review asset licensing.
- Mount a dedicated output volume with least privilege.
- Never place secrets in MCP tool arguments or generated diagrams.

DrawArch validates remote targets before every redirect, but operators should still apply network egress controls for defense in depth.
