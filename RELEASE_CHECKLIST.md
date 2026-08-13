# DrawArch MCP 0.2.0 release checklist

**Date:** 2026-08-14  
**Release:** `0.2.0`

## Verified locally

- [x] 14 test files and 83 tests pass.
- [x] TypeScript production build passes.
- [x] Official MCP clients exercise all 11 tools over stdio and Streamable HTTP.
- [x] `.drawio` results are returned as portable MCP resources.
- [x] Absolute reference geometry, connector waypoints, and editable cells are covered by tests.
- [x] Immutable plan revisions invalidate stale approvals.
- [x] Remote assets reject private/reserved targets and unsafe SVG content.
- [x] Raster inputs are bounded and re-encoded with patched Sharp.
- [x] `npm audit --audit-level=high` reports zero vulnerabilities.
- [x] `npm pack --dry-run` includes the executable build, assets, docs, and `server.json`.
- [x] Docker image build passes in hosted Linux CI (local Docker daemon was unavailable).

## Publication

- [x] Public GitHub repository pushed and CI green on Windows/Linux with Node 20/22 plus Docker build.
- [ ] `drawarch-mcp@0.2.0` published to npm.
- [ ] `io.github.Ajey95/drawarch` published to the Official MCP Registry.
- [ ] Durable remote HTTPS endpoint deployed and tested from an external MCP host.

Items must be checked only after direct verification; local tests do not imply external publication or hosted-provider success.
