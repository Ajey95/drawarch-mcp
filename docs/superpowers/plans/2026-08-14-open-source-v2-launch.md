# DrawArch Open-Source V2 Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Release DrawArch as an installable, hostable, registry-ready open-source MCP server that generates downloadable editable Draw.io architecture diagrams and supports host-LLM reference-image recreation without a separate LLM API key.

**Architecture:** Keep the current deterministic V1 graph generator and add a separate V2 absolute scene-graph pipeline. Share one tool-registration factory between stdio and stateless Streamable HTTP transports, return generated files as MCP embedded resources, and make remote HTTP downloads an optional convenience. Store no LLM credentials; the MCP host performs vision analysis and submits the exact scene graph.

**Tech Stack:** TypeScript 7, Node.js 22, MCP TypeScript SDK v2, Zod 4, Vitest, native Node HTTP, Sharp for bounded raster validation/re-encoding, Docker, GitHub Actions, npm, Official MCP Registry.

## Global Constraints

- Preserve the five V1 MCP tool names and schemas for backward compatibility.
- V2 architecture/system diagrams must be editable native diagrams.net XML; never use the reference image as a hidden background.
- The host LLM supplies image understanding; DrawArch never requires an OpenAI, Anthropic, or other LLM API key.
- Online assets are opt-in and embedded; generated files contain zero image hotlinks.
- Arbitrary internet image URLs require an approval token produced by `prepare_reference_recreation`.
- Network retrieval must use HTTPS, reject private/reserved destinations and unsafe redirects, enforce byte/pixel/time limits, sanitize SVG, and re-encode raster content.
- Local stdio remains the default transport; remote clients use Streamable HTTP at `/mcp`.
- Generated files must be returned to MCP clients as embedded resources so remote clients do not depend on server-local paths.
- New behavior is implemented with red-green TDD and the full suite must remain green.
- Publishing operations occur only after clean package, security, build, test, and smoke-check gates.

---

### Task 1: Establish an isolated, releasable Git baseline

**Files:**
- Modify: `.gitignore`
- Create: Git metadata and `work/open-source-v2` branch/worktree

**Interfaces:**
- Consumes: the verified V1 folder state.
- Produces: a clean baseline commit and isolated implementation branch.

- [ ] Add `.worktrees/`, `outputs/`, Inspector logs, local environment files, and temporary renderer files to `.gitignore`.
- [ ] Initialize Git with `main`, commit the baseline, and create `.worktrees/open-source-v2` on branch `work/open-source-v2`.
- [ ] Install dependencies in the worktree and run `npm test` to confirm the 72-test baseline.

### Task 2: Deliver generated files as portable MCP artifacts

**Files:**
- Modify: `src/server.ts`
- Create: `src/files/artifact.ts`
- Test: `tests/artifact.test.ts`, `tests/server.test.ts`

**Interfaces:**
- Consumes: a validated generated `.drawio` path.
- Produces: `drawioArtifact(fileName, xml)` and tool results containing `resource` content with `application/vnd.jgraph.mxfile` and base64 bytes.

- [ ] Write a failing unit test asserting safe MIME type, URI, SHA-256, byte count, and base64 round trip.
- [ ] Run the focused test and confirm it fails because `drawioArtifact` does not exist.
- [ ] Implement the minimal artifact builder and add the embedded resource to `create_drawio` responses.
- [ ] Extend the real stdio MCP integration test to assert the resource content reconstructs valid Draw.io XML.
- [ ] Run the focused and server tests until green.

### Task 3: Add production Streamable HTTP transport

**Files:**
- Create: `src/http.ts`, `src/config.ts`
- Modify: `src/index.ts`, `package.json`
- Test: `tests/http.test.ts`

**Interfaces:**
- Consumes: `createServer(options)` and environment configuration.
- Produces: `startHttpServer(options)`, `/health`, `/mcp`, optional bearer protection, host/origin validation, and `/files/<safe-name>` downloads.

- [ ] Write failing integration tests for health, unauthorized bearer access, MCP tool listing over Streamable HTTP, CORS/exposed MCP headers, and safe download containment.
- [ ] Run the HTTP test and confirm it fails because the server entrypoint is absent.
- [ ] Add the official Node MCP adapter and implement a stateless MCP handler with explicit host/origin guards.
- [ ] Implement optional `DRAWARCH_API_KEY`, `DRAWARCH_ALLOWED_HOSTS`, `DRAWARCH_ALLOWED_ORIGINS`, `DRAWARCH_PUBLIC_BASE_URL`, `PORT`, and `DRAWARCH_TRANSPORT` configuration.
- [ ] Run the HTTP integration test and existing stdio suite until green.

### Task 4: Define and validate the V2 reference scene graph

**Files:**
- Create: `src/reference/schema.ts`, `src/reference/store.ts`, `src/reference/approval.ts`
- Test: `tests/reference-schema.test.ts`, `tests/reference-store.test.ts`

**Interfaces:**
- Produces: `ReferencePlanSchema`, `parseReferencePlan`, revisioned `ReferencePlanStore`, and HMAC approval tokens bound to plan revision and candidate URLs.

- [ ] Write failing schema tests for canvas, layers, containers, native shapes, text, assets, explicit connectors/ports/waypoints, z-order, confidence, and duplicate/dangling IDs.
- [ ] Implement the minimal strict Zod schemas and semantic validation.
- [ ] Write failing store/token tests covering immutable revisions, expiry, URL binding, and tamper rejection.
- [ ] Implement filesystem-backed plan revisions under the configured output root and signed approval tokens.
- [ ] Run both reference test files until green.

### Task 5: Securely ingest V2 assets

**Files:**
- Create: `src/assets/data-uri.ts`, `src/assets/remote-image.ts`, `src/assets/network-policy.ts`
- Modify: `src/assets/resolver.ts`, `src/assets/sanitize.ts`
- Test: `tests/reference-assets.test.ts`

**Interfaces:**
- Produces: `resolveReferenceAsset(asset, approvals)` returning embedded, sanitized asset data plus source URL, media type, license, SHA-256, and warnings.

- [ ] Write failing tests for safe user SVG/raster data URIs, unsafe SVG rejection, HTTPS enforcement, private/loopback DNS rejection, redirect revalidation, byte limits, pixel limits, MIME-signature checks, and missing approval rejection.
- [ ] Implement data-URI parsing and reuse the SVG sanitizer.
- [ ] Implement DNS/IP policy checks before every HTTP hop.
- [ ] Add Sharp and implement bounded raster metadata validation and PNG re-encoding.
- [ ] Implement approved remote-image retrieval with timeout, redirect, decoded-byte, and provenance controls.
- [ ] Run the asset security tests until green.

### Task 6: Render exact editable V2 Draw.io scene graphs

**Files:**
- Create: `src/reference/render.ts`, `src/reference/service.ts`, `src/reference/compare.ts`
- Test: `tests/reference-render.test.ts`, `tests/reference-service.integration.test.ts`

**Interfaces:**
- Produces: exact layer/group/shape/text/asset/connector XML, `ReferenceRecreationService`, validation reports, and structural fidelity scores.

- [ ] Write failing renderer tests for exact geometry, rotation, opacity, colors, fonts, z-order, parent groups, explicit waypoints, and editable cell IDs.
- [ ] Implement native-shape, text, container, asset, and connector rendering without V1 auto-layout.
- [ ] Write failing service tests for prepare, update, approved creation, validation, and structural comparison thresholds.
- [ ] Implement normalized revisions, secure asset resolution, atomic output, embedded artifact creation, and weighted fidelity scoring (`excellent >=95`, `good >=85`, otherwise `needs-revision`).
- [ ] Run reference unit/integration tests and the existing V1 suite until green.

### Task 7: Register the six V2 MCP tools

**Files:**
- Create: `src/reference/tools.ts`
- Modify: `src/server.ts`
- Test: `tests/server.test.ts`

**Interfaces:**
- Produces: `prepare_reference_recreation`, `update_reference_plan`, `create_reference_drawio`, `validate_reference_drawio`, `compare_reference_recreation`, and `get_reference_plan` while retaining all V1 tools.

- [ ] Extend the real MCP client test with failing assertions for the V2 tool list and an end-to-end exact scene recreation.
- [ ] Register V2 tools with accurate read/write/idempotency/destructive annotations and structured schemas.
- [ ] Ensure creation returns an embedded `.drawio` resource and approval-required failures use stable codes.
- [ ] Run stdio and HTTP MCP end-to-end tests until green.

### Task 8: Make the repository contributor- and release-ready

**Files:**
- Create: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`, `ARCHITECTURE.md`, `Dockerfile`, `.dockerignore`, `.env.example`, `server.json`, `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `.github/ISSUE_TEMPLATE/bug.yml`, `.github/ISSUE_TEMPLATE/feature.yml`, `.github/PULL_REQUEST_TEMPLATE.md`
- Modify: `README.md`, `package.json`, `RELEASE_CHECKLIST.md`
- Test: `tests/package.test.ts`

**Interfaces:**
- Produces: an npm-installable `drawarch-mcp` CLI, official MCP Registry metadata, reproducible Docker image, CI gates, and clear local/remote client setup.

- [ ] Write failing package tests for repository metadata, `mcpName`, public files, bin target, packed contents, and registry version parity.
- [ ] Add complete npm/GitHub metadata, keywords, exports, prepublish checks, and package files.
- [ ] Add governance/security/contribution documents and threat model.
- [ ] Add multi-platform CI for Node 22, package packing, Docker build, and release publishing through trusted GitHub/npm workflows.
- [ ] Rewrite the README around the one-sentence product promise, demos, ChatGPT/Claude/Codex/Cursor setup, no-LLM-key boundary, V1/V2 tools, security, and deployment.
- [ ] Run package tests, `npm pack --dry-run`, Docker build, full tests, and TypeScript build.

### Task 9: Publish and verify discoverability

**Files:**
- Modify: release metadata only if the authenticated namespace requires it.

**Interfaces:**
- Produces: public GitHub repository, public npm package, Official MCP Registry record, tagged release, and a remotely reachable MCP endpoint when deployment credentials are available.

- [ ] Verify authenticated GitHub/npm identities and package-name availability without exposing credentials.
- [ ] Create the public GitHub repository, set topics/description/homepage, push `main`, and enable vulnerability reporting where available.
- [ ] Publish the public npm package and verify installation in a clean temporary directory.
- [ ] Authenticate `mcp-publisher`, publish `server.json`, and verify the Registry API record.
- [ ] Deploy the Docker/HTTP build using available authenticated hosting, configure online assets and secrets, and verify `/health` plus remote MCP tool invocation.
- [ ] Create the signed/tagged GitHub release only after every release gate passes.

### Task 10: Final release audit

**Files:**
- Review: entire repository and release artifacts.

**Interfaces:**
- Produces: evidence-backed release report with exact URLs, versions, hashes, tests, and any credential-dependent external action that could not be completed.

- [ ] Audit tracked files for secrets, local paths, temporary outputs, generated logs, and dependency/license disclosures.
- [ ] Run clean install, full tests, build, pack, Docker, stdio MCP, HTTP MCP, V1 generation, V2 recreation, validation, and artifact round-trip checks.
- [ ] Confirm README commands work from a clean consumer directory.
- [ ] Merge the verified branch back to `main`, push, and report only claims supported by fresh command output.
