# Open-Source README Visuals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the technical-first README with a polished open-source landing page supported by accessible, repository-native product visuals and only verified release claims.

**Architecture:** Two self-contained SVG assets under `docs/assets/` provide the hero and product-proof visuals without runtime dependencies. `README.md` becomes the navigation and onboarding surface, progressively revealing installation, architecture, tools, configuration, security, and contribution details while linking to deeper documents.

**Tech Stack:** GitHub-flavored Markdown, SVG 1.1-compatible XML, Mermaid, PowerShell validation, Node.js project checks

## Global Constraints

- Use repository-native SVG with system font fallbacks and no external image or font dependencies.
- Display only verified live channels: GitHub CI, GitHub release, GHCR, Node 20+, MCP transports, and MIT.
- Do not claim npm publication, Official MCP Registry publication, a durable hosted endpoint, or pixel-identical reproduction.
- Every visual needs meaningful Markdown alt text and all critical information must also exist as text.
- Relative repository links must resolve locally; external GitHub links must return successfully.
- Product code and MCP contracts remain unchanged.

---

### Task 1: Accessible repository visual assets

**Files:**
- Create: `docs/assets/readme-hero.svg`
- Create: `docs/assets/reference-recreation-demo.svg`

**Interfaces:**
- Consumes: DrawArch palette and product claims from `docs/superpowers/specs/2026-08-14-open-source-readme-visual-design.md`
- Produces: Stable relative image paths used by `README.md`

- [ ] **Step 1: Create the hero SVG**

Create a 1440×620 SVG with `viewBox="0 0 1440 620"`, a dark navy rounded backdrop, native gradients, accessible `<title>`/`<desc>`, a left reference-image card, a centered DrawArch transformation badge, a right editable-diagram card, embedded system-font text, and distinct edit handles/cells that visually establish editability.

- [ ] **Step 2: Create the product-proof SVG**

Create a 1440×760 SVG with a white/light-neutral Draw.io-like canvas inside a dark frame, three architecture zones, realistic component cards/icons, orthogonal connectors, selection handles, a layers panel, and a validation badge. Use only SVG shapes and paths owned by the repository.

- [ ] **Step 3: Validate both assets as XML**

Run:

```powershell
[xml](Get-Content docs\assets\readme-hero.svg -Raw) | Out-Null
[xml](Get-Content docs\assets\reference-recreation-demo.svg -Raw) | Out-Null
```

Expected: both commands complete without an XML parsing exception.

- [ ] **Step 4: Inspect both assets visually**

Open both SVGs with the local image viewer and confirm legible copy, balanced composition, no clipping, meaningful diagram semantics, and readable contrast at repository display width.

- [ ] **Step 5: Commit the visual assets**

```powershell
git add docs/assets/readme-hero.svg docs/assets/reference-recreation-demo.svg
git commit -m "docs: add DrawArch README visuals"
```

### Task 2: Open-source landing-page README

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: `docs/assets/readme-hero.svg`, `docs/assets/reference-recreation-demo.svg`, `examples/reference-recreation.json`, `docs/ARCHITECTURE.md`, public GitHub release/container URLs
- Produces: GitHub repository landing page and install/navigation contract

- [ ] **Step 1: Replace the README hero and badges**

Use a centered `<picture>`/`<img>` hero referencing `docs/assets/readme-hero.svg`, a concise product statement, verified badges for CI, release, GHCR, Node 20+, MCP, and MIT, and navigation links for quick start, demo, architecture, and contributing. Remove the npm badge and any primary `npx` command.

- [ ] **Step 2: Add visual proof and concise positioning**

Embed `docs/assets/reference-recreation-demo.svg`, state that visible objects remain separate editable Draw.io cells, add a six-item feature table, and add a comparison table contrasting DrawArch's editable output, deterministic structure, offline assets, validation, and iterative host-vision workflow with flat image generation.

- [ ] **Step 3: Add the reference workflow and topology**

Document the four-step `prepare → review/approve → create → compare/revise` flow and include one Mermaid topology showing MCP host, stdio/HTTP transport, resolver, renderer, validator, and portable artifact. Include a text description immediately after the Mermaid diagram.

- [ ] **Step 4: Replace quick-start instructions with verified channels**

Provide working source install commands using `git clone`, `npm ci`, and `npm run build`; local MCP JSON using the built `dist/src/index.js`; GHCR `docker run`; and authenticated remote HTTP environment variables. Mention that npm/`npx` installation is pending rather than available.

- [ ] **Step 5: Organize reference documentation**

Group the eleven tools into architecture and reference-recreation tables. Add host/transport guidance, asset modes, security guarantees, project status, roadmap, contribution/security links, and a collapsible `<details>` block containing the complete environment-variable table.

- [ ] **Step 6: Verify claims and local links**

Run:

```powershell
rg -n "npmjs|npx -y drawarch-mcp|Official MCP Registry|pixel-identical|drawarch\.example\.com" README.md
```

Expected: no npm badge or unqualified npm availability, no registry publication claim, no pixel-identical claim, and example hostnames appear only as clearly labeled operator configuration.

Parse Markdown relative links with a focused PowerShell script and assert every non-anchor local target exists.

- [ ] **Step 7: Commit the README**

```powershell
git add README.md
git commit -m "docs: redesign README as open-source landing page"
```

### Task 3: Release-level validation and publication

**Files:**
- Modify only if validation exposes a README/asset defect: `README.md`, `docs/assets/readme-hero.svg`, `docs/assets/reference-recreation-demo.svg`

**Interfaces:**
- Consumes: completed README and visual assets
- Produces: verified public `main` update

- [ ] **Step 1: Validate external release links**

Check these URLs with HTTP requests and require a successful response:

```text
https://github.com/Ajey95/drawarch-mcp/actions/workflows/ci.yml
https://github.com/Ajey95/drawarch-mcp/releases/tag/v0.2.0
https://github.com/Ajey95/drawarch-mcp/pkgs/container/drawarch-mcp
```

- [ ] **Step 2: Run repository verification**

Run:

```powershell
npm test
npm run build
git diff --check
git status --short
```

Expected: 83 tests pass, TypeScript build passes, no whitespace errors, and only intended README work is present.

- [ ] **Step 3: Review the rendered GitHub Markdown**

Push the commits to `origin/main`, open the public repository README, and verify the hero, product demo, badges, Mermaid topology, tables, details block, and navigation links render correctly.

- [ ] **Step 4: Verify hosted CI**

Wait for the latest `CI` workflow run and require all Windows/Linux Node 20/22 and Docker jobs to pass.

- [ ] **Step 5: Record completion**

If validation required repairs, commit them with:

```powershell
git add README.md docs/assets
git commit -m "docs: fix README rendering defects"
git push
```

Otherwise report the public repository URL and the checks performed.
