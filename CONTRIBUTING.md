# Contributing to DrawArch

Thanks for helping make editable architecture diagrams easier to create.

1. Fork the repository and create a focused branch.
2. Install with `npm ci`.
3. Add a failing test before changing behavior.
4. Run `npm test`, `npm run build`, `npm audit --audit-level=high`, and `npm pack --dry-run`.
5. Open a pull request describing the user-visible behavior, security impact, and verification performed.

Do not commit credentials, generated outputs, copied proprietary icons, or reference images you are not permitted to redistribute. New bundled assets must be original or redistributable and must include provenance and license metadata.

Use conventional commit prefixes such as `feat:`, `fix:`, `docs:`, `test:`, and `chore:`. Keep public APIs and MCP tool schemas backward compatible unless the release is explicitly marked breaking.
