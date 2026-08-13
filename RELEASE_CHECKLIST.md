# DrawArch MCP V1 Release Checklist

**Date:** 2026-08-10  
**PRD:** `PRD.md`  
**Release:** `0.1.0`

## Verification evidence

Fresh verification command:

```bash
NPM_CONFIG_CACHE=/tmp/drawarch-npm-cache npm ci && npm test && npm run build && npm run sample
```

Result:

- Clean dependency installation: passed
- Test files: 10 passed
- Tests: 67 passed, 0 failed
- TypeScript build: passed
- SVG asset copy into built distribution: passed
- Sample generation: passed
- Sample validation: `valid: true`, 0 issues
- Production dependency audit: 0 known vulnerabilities
- npm package dry run: 70 files, built server and SVG assets present

Generated sample contract:

```json
{
  "bytes": 29419,
  "cells": 51,
  "nodes": 10,
  "edges": 9,
  "uniqueIds": true,
  "embeddedSvg": true,
  "animated": true
}
```

Built server import smoke test: passed.

## PRD acceptance criteria

- [x] An official MCP client lists and invokes all five V1 tools over a real stdio child process.
- [x] The generation matrix test creates and validates all 30 theme/layout combinations.
- [x] Groups, node cards, image cells, label cells, edge cells, and legend cells are separate editable `mxCell` objects.
- [x] Bundled SVGs are embedded as `data:image/svg+xml` data URIs.
- [x] The online-provider fixture resolves, sanitizes, hashes, attributes, and embeds an SVG without a hotlinked image style.
- [x] Animated edges contain `flowAnimation`, `flowDuration`, `flowTiming`, and `flowDirection` properties.
- [x] Multiple flow categories create an editable legend.
- [x] Validation tests detect malformed structure, duplicate IDs, dangling references, hotlinked images, absolute local image paths, and missing root cells.
- [x] Output tests reject traversal, unsafe extensions, and accidental overwrite; atomic failures remove temporary files.
- [x] Unit/integration tests pass, TypeScript builds, and the sample is generated and validated.
- [x] README documents install, configuration, tools, schemas, themes, layouts, assets, security, troubleshooting, and V2.
- [x] Archive rules exclude `.git`, `node_modules`, coverage, caches, temporary files, uploads, and unrelated workspace content.

## Known V1 boundaries

- GitHub/codebase reverse-engineering is deliberately deferred to V2.
- Online asset quality and licence terms remain provider-specific; provenance is retained for review.
- Layout is deterministic and overlap-tested, but very large graphs may require manual finishing in diagrams.net.
- Exporting PNG, SVG, or animated GIF is performed by diagrams.net; V1's primary output is `.drawio`.
