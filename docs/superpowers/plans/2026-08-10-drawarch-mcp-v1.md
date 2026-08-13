# DrawArch MCP V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build a local stdio MCP server that generates validated, self-contained, themed, animated, editable `.drawio` architecture diagrams.

**Architecture:** The MCP layer validates structured tool input and delegates to a pure application service. The service resolves safe embedded SVG assets, computes deterministic layout geometry, renders uncompressed diagrams.net XML, writes atomically inside a configured output root, and runs structural validation before returning. Product requirements live only in `PRD.md`.

**Tech Stack:** Node.js 22+, TypeScript 7, `@modelcontextprotocol/server` 2, Zod 4, Vitest 4, native `fetch`, native filesystem APIs.

## Global Constraints

- `PRD.md` is authoritative; this plan does not redefine product behavior.
- Use the stable MCP TypeScript SDK v2 and stdio transport.
- Use test-first red/green/refactor cycles for every production behavior.
- Keep stdout reserved for MCP protocol messages; diagnostics use stderr.
- Do not embed emojis, remote image URLs, unsafe SVG markup, or absolute local paths in generated files.
- Generate uncompressed `.drawio` XML and keep every visual object independently editable.
- V2 GitHub/codebase reverse-engineering is documentation-only in this release.

---

## File Map

- `package.json` — package metadata, dependency versions, scripts, and executable entry.
- `tsconfig.json` — strict Node ESM TypeScript configuration.
- `vitest.config.ts` — deterministic test discovery and coverage exclusions.
- `src/domain/schema.ts` — architecture input schemas, types, and semantic validation.
- `src/themes/themes.ts` — six immutable theme token sets and lookup functions.
- `src/assets/catalog.ts` — bundled SVG catalogue metadata and aliases.
- `src/assets/svg/*.svg` — safe real-world starter SVG assets.
- `src/assets/sanitize.ts` — SVG safety validation and data-URI conversion.
- `src/assets/online.ts` — Iconify-compatible online search/fetch adapter.
- `src/assets/resolver.ts` — bundled-first asset resolution chain with dependency injection.
- `src/layout/layout.ts` — deterministic geometry for five layout modes.
- `src/render/xml.ts` — XML escaping and diagrams.net XML rendering.
- `src/validate/drawio.ts` — generated-file structural validation.
- `src/files/output.ts` — safe output path resolution and atomic writes.
- `src/app/generate.ts` — orchestration service joining schema, assets, layout, render, write, and validation.
- `src/server.ts` — MCP stdio server and five V1 tool registrations.
- `src/index.ts` — executable startup with stderr-only fatal diagnostics.
- `tests/*.test.ts` — unit and integration behavior tests.
- `examples/iot-safety.json` — complete example architecture specification.
- `scripts/generate-sample.ts` — creates and validates the example diagram through the application service.
- `README.md` — install, build, configure, tool, asset, theme, security, and example documentation.

### Task 1: Project foundation and architecture schema

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/domain/schema.ts`
- Test: `tests/schema.test.ts`

**Interfaces:**
- Produces: `ArchitectureSpecSchema`, `ArchitectureSpec`, `LayoutName`, `ThemeName`, `FlowType`, and `parseArchitectureSpec(input: unknown): ArchitectureSpec`.

- [x] **Step 1: Create project configuration and install exact dependencies**

Use Node ESM, scripts `build`, `test`, `test:watch`, `sample`, and `start`, with `@modelcontextprotocol/server@2.0.0`, `zod@4.4.3`, `typescript@7.0.2`, `vitest@4.1.10`, `tsx`, and `@types/node`.

- [x] **Step 2: Write failing schema tests**

Cover a valid minimal graph, duplicate IDs, missing groups, dangling edges, self-edges, blank labels, unsupported enum values, invalid `.drawio` names, and traversal attempts.

- [x] **Step 3: Run the schema test and confirm failure because the module is missing**

Run: `npm test -- tests/schema.test.ts`

- [x] **Step 4: Implement the schema and semantic refinements**

Use Zod structural parsing followed by refinements that build ID sets and attach issues to the exact collection field.

- [x] **Step 5: Run the schema test and full suite**

Run: `npm test -- tests/schema.test.ts && npm test`

- [x] **Step 6: Commit the task**

Stage only the five task files and dependency lockfile; commit `feat: validate architecture specifications`.

### Task 2: Theme registry and safe SVG catalogue

**Files:**
- Create: `src/themes/themes.ts`
- Create: `src/assets/catalog.ts`
- Create: `src/assets/sanitize.ts`
- Create: `src/assets/svg/*.svg`
- Test: `tests/themes.test.ts`
- Test: `tests/assets.test.ts`

**Interfaces:**
- Consumes: `ThemeName` from `src/domain/schema.ts`.
- Produces: `THEMES`, `getTheme(name)`, `searchBundledAssets(query)`, `getBundledAsset(id)`, `sanitizeSvg(svg)`, and `svgToDataUri(svg)`.

- [x] **Step 1: Write failing tests for all six theme IDs and immutable token completeness**

Assert that each theme has canvas, text, group, node, and connector tokens and that unknown names fail.

- [x] **Step 2: Run theme tests and confirm module-not-found failure**

Run: `npm test -- tests/themes.test.ts`

- [x] **Step 3: Implement the theme token registry**

Define the six PRD theme IDs as frozen data and return frozen references through `getTheme`.

- [x] **Step 4: Write failing asset tests**

Test exact ID lookup, alias/tag search, XML/script/event/foreign-object/external-link rejection, safe SVG acceptance, and percent-encoded SVG data URI generation.

- [x] **Step 5: Run asset tests and confirm expected failures**

Run: `npm test -- tests/assets.test.ts`

- [x] **Step 6: Add twelve original starter SVGs and implement the catalogue and sanitizer**

The SVGs must use simple original geometry, `viewBox`, no scripts, no external resources, and coherent colours. Catalogue entries include ID, title, category, provider, tags, aliases, media type, licence, source, and SVG text.

- [x] **Step 7: Run theme, asset, and full tests**

Run: `npm test -- tests/themes.test.ts tests/assets.test.ts && npm test`

- [x] **Step 8: Commit the task**

Commit `feat: add themes and safe SVG asset catalogue`.

### Task 3: Bundled and online asset resolution

**Files:**
- Create: `src/assets/online.ts`
- Create: `src/assets/resolver.ts`
- Test: `tests/resolver.test.ts`

**Interfaces:**
- Consumes: catalogue and sanitizer functions.
- Produces: `OnlineAssetProvider`, `IconifyProvider`, `AssetResolver`, `ResolvedAsset`, and `resolve(request): Promise<ResolvedAsset>`.

- [x] **Step 1: Write failing resolver tests with a deterministic in-memory online provider**

Test bundled exact match, bundled semantic match, online fallback, disabled-online failure, unsafe-online rejection, generic-category fallback, source metadata, and no network call when bundled resolution succeeds.

- [x] **Step 2: Run resolver tests and confirm missing implementation failure**

Run: `npm test -- tests/resolver.test.ts`

- [x] **Step 3: Implement the resolution chain and Iconify-compatible provider**

The provider accepts injected `fetch`, HTTPS base URL, timeout, maximum bytes, and redirect limit. It searches, fetches SVG text, and returns attribution metadata. The resolver sanitizes every online SVG before creating the embedded data URI.

- [x] **Step 4: Run resolver and full tests**

Run: `npm test -- tests/resolver.test.ts && npm test`

- [x] **Step 5: Commit the task**

Commit `feat: resolve bundled and online SVG assets`.

### Task 4: Deterministic layout engine

**Files:**
- Create: `src/layout/layout.ts`
- Test: `tests/layout.test.ts`

**Interfaces:**
- Consumes: `ArchitectureSpec`.
- Produces: `Point`, `Bounds`, `LayoutResult`, and `layoutArchitecture(spec): LayoutResult`.

- [x] **Step 1: Write failing tests for all five layouts**

Assert deterministic equality, non-overlapping node bounds, group containment, stable canvas bounds, hub placement, pipeline ordering, and edge-cloud group ordering.

- [x] **Step 2: Run layout tests and confirm missing implementation failure**

Run: `npm test -- tests/layout.test.ts`

- [x] **Step 3: Implement layout strategies behind one dispatch function**

Use constants for margins, group title area, node size, gaps, and legend space. Return node and group bounds plus orthogonal edge waypoints without mutating the specification.

- [x] **Step 4: Run layout and full tests**

Run: `npm test -- tests/layout.test.ts && npm test`

- [x] **Step 5: Commit the task**

Commit `feat: add deterministic architecture layouts`.

### Task 5: Native diagrams.net XML rendering and validation

**Files:**
- Create: `src/render/xml.ts`
- Create: `src/validate/drawio.ts`
- Test: `tests/render.test.ts`
- Test: `tests/validate.test.ts`

**Interfaces:**
- Consumes: `ArchitectureSpec`, `LayoutResult`, theme tokens, and resolved assets.
- Produces: `renderDrawio(input): string`, `validateDrawio(xml): ValidationReport`.

- [x] **Step 1: Write failing renderer tests**

Assert uncompressed `mxGraphModel`, separate group/node/edge/legend cells, escaped labels, embedded SVG data URIs, no source URLs, animation style values, source/target references, and a legend for two flow types.

- [x] **Step 2: Run renderer tests and confirm missing implementation failure**

Run: `npm test -- tests/render.test.ts`

- [x] **Step 3: Implement XML helpers and deterministic rendering**

Render `mxfile` → `diagram` → `mxGraphModel` → `root`. Use stable generated cell IDs, parent group cells, image-node cells with editable labels, orthogonal edge cells, explicit waypoints, and editable legend cells.

- [x] **Step 4: Write failing validation tests**

Test valid output plus malformed structure, duplicate IDs, dangling source/target references, remote image URLs, absolute local paths, and missing root cells.

- [x] **Step 5: Run validation tests and confirm failure**

Run: `npm test -- tests/validate.test.ts`

- [x] **Step 6: Implement the structural validator**

Parse generated XML conservatively using focused tag/attribute extraction, return stable issue codes, and never execute or dereference XML content.

- [x] **Step 7: Run renderer, validator, and full tests**

Run: `npm test -- tests/render.test.ts tests/validate.test.ts && npm test`

- [x] **Step 8: Commit the task**

Commit `feat: render and validate native drawio XML`.

### Task 6: Safe file output and generation service

**Files:**
- Create: `src/files/output.ts`
- Create: `src/app/generate.ts`
- Test: `tests/output.test.ts`
- Test: `tests/generate.integration.test.ts`

**Interfaces:**
- Consumes: schema, resolver, layout, renderer, and validator.
- Produces: `resolveOutputPath(root, fileName)`, `atomicWriteDrawio(options)`, `DrawArchService`, and `generate(input): Promise<GenerationResult>`.

- [x] **Step 1: Write failing path and atomic-output tests**

Test traversal rejection, extension enforcement, overwrite protection, successful opt-in overwrite, cleanup after simulated write failure, and target containment.

- [x] **Step 2: Run output tests and confirm missing implementation failure**

Run: `npm test -- tests/output.test.ts`

- [x] **Step 3: Implement safe path resolution and same-directory atomic rename**

Create output directories only inside the configured root, use a unique temporary sibling, validate before rename, and remove the temporary file on every failure path.

- [x] **Step 4: Write failing application integration test**

Generate a multi-group, multi-flow architecture into a temporary directory and assert the returned summary, embedded assets, animation styles, legend, and clean validation report.

- [x] **Step 5: Run integration test and confirm missing service failure**

Run: `npm test -- tests/generate.integration.test.ts`

- [x] **Step 6: Implement `DrawArchService` orchestration**

Resolve assets concurrently with bounded work, accumulate non-fatal generic-fallback warnings, render only after all nodes resolve, validate before writing, and return output path, theme, layout, counts, warnings, and asset provenance.

- [x] **Step 7: Run integration and full tests**

Run: `npm test -- tests/output.test.ts tests/generate.integration.test.ts && npm test`

- [x] **Step 8: Commit the task**

Commit `feat: generate drawio files safely`.

### Task 7: MCP stdio server

**Files:**
- Create: `src/server.ts`
- Create: `src/index.ts`
- Test: `tests/server.test.ts`

**Interfaces:**
- Consumes: `DrawArchService`, themes, catalogue search, resolver, and validator.
- Produces: `createServer(options): McpServer` and executable stdio startup.

- [x] **Step 1: Write failing server-registration tests**

Connect an in-process MCP client transport, list tools, assert the exact five names, and invoke `list_themes`, `list_assets`, `resolve_asset`, `create_drawio`, and `validate_drawio` against temporary output.

- [x] **Step 2: Run server test and confirm missing implementation failure**

Run: `npm test -- tests/server.test.ts`

- [x] **Step 3: Implement the five MCP tools with Zod input schemas**

Return text plus structured content. Convert domain failures into concise tool errors with stable codes. Read configuration from `DRAWARCH_OUTPUT_DIR`, `DRAWARCH_ONLINE_ASSETS`, and `DRAWARCH_ICONIFY_BASE_URL`. Write startup/fatal diagnostics only to stderr.

- [x] **Step 4: Run server and full tests**

Run: `npm test -- tests/server.test.ts && npm test`

- [x] **Step 5: Commit the task**

Commit `feat: expose DrawArch tools over MCP stdio`.

### Task 8: Documentation, sample, release verification, and ZIP

**Files:**
- Create: `examples/iot-safety.json`
- Create: `scripts/generate-sample.ts`
- Create: `README.md`
- Create: `LICENSE`
- Modify: `package.json`
- Create: `examples/iot-safety.drawio` through the verified sample command.

**Interfaces:**
- Consumes: public MCP and application-service interfaces.
- Produces: installable package documentation and distributable source ZIP.

- [x] **Step 1: Write the example specification and sample generator**

The example contains edge, cloud, and user groups; at least eight nodes; at least three flow categories; real bundled assets; and animated paths.

- [x] **Step 2: Write README and licence**

Document prerequisites, install, build, tests, sample generation, MCP client JSON, tool schemas, themes, layouts, asset resolution, online security, troubleshooting, V1 limits, and V2 roadmap. Use MIT for project-owned code and retain third-party dependency licences through their packages.

- [x] **Step 3: Run fresh release verification**

Run: `npm ci && npm test && npm run build && npm run sample`

Expected: dependency install exits 0, all tests pass, TypeScript exits 0, and sample generation returns a clean validation report.

- [x] **Step 4: Inspect the generated sample contract**

Run a script that confirms `.drawio` extension, nonzero size, no `http://` or `https://` image reference, `flowAnimation=1`, embedded `data:image/svg+xml`, and distinct node/edge cell IDs.

- [x] **Step 5: Review PRD acceptance criteria line by line**

Record evidence in `RELEASE_CHECKLIST.md`, including the exact verification commands and results. Document any unmet criterion as a release blocker rather than weakening the PRD.

- [x] **Step 6: Create the source ZIP**

Archive the project while excluding `.git`, `node_modules`, coverage, caches, temporary files, and unrelated uploads. List the archive and verify required files are present.

- [x] **Step 7: Commit release artifacts except the ZIP**

Commit `docs: add sample and release documentation`.
