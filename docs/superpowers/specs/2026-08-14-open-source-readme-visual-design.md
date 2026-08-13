# DrawArch open-source README visual design

**Date:** 2026-08-14  
**Status:** Approved design, pending implementation  
**Scope:** Repository README and repository-owned README visual assets only

## Objective

Transform the current technical README into a polished open-source project landing page that communicates DrawArch's value within the first screen, proves the product with real visuals, offers fast installation paths, and retains complete technical reference material without overwhelming new visitors.

## Audience

The README must serve:

1. MCP users deciding whether DrawArch fits their workflow.
2. ChatGPT, Claude, Codex, Cursor, and IDE users installing a local or remote server.
3. Contributors evaluating project quality and architecture.
4. Infrastructure operators deploying the HTTP server or container.

## Visual direction

Use deterministic, repository-native SVG rather than generated raster artwork. SVG keeps text accurate, scales cleanly on GitHub, is inspectable by contributors, and matches DrawArch's editable-diagram identity.

Create these assets under `docs/assets/`:

- `readme-hero.svg`: wide branded banner showing a reference image becoming an editable Draw.io scene through DrawArch.
- `reference-recreation-demo.svg`: product proof depicting a realistic architecture recreation with separate components, icons, labels, and connectors.

The palette should use a dark navy canvas, cyan/blue connection lines, violet accents, white copy, and restrained green validation signals. Visuals must remain readable in GitHub light and dark themes, have descriptive accessible alt text in Markdown, and avoid external fonts or image dependencies.

Use Mermaid only for the compact runtime/deployment topology where it materially clarifies the relationship among MCP host, DrawArch transport, asset resolver, renderer, validator, and artifact. Other visuals remain SVG so the README renders consistently.

## README information architecture

1. Centered hero visual, project name, one-sentence positioning, and truthful badges.
2. Compact calls to action: quick start, example, architecture, contributing.
3. Product proof gallery and a short statement that generated objects remain editable.
4. “What DrawArch does” feature grid.
5. Reference-image workflow visual and four-step tool sequence.
6. “Why DrawArch instead of image generation?” comparison table.
7. Quick start with local `npx`, source checkout, Docker/GHCR, and remote HTTP paths.
8. Supported MCP hosts and transport expectations, including the ChatGPT remote constraint.
9. Tool catalog grouped into architecture and reference-recreation capabilities.
10. Security and asset model.
11. Collapsible advanced configuration and full environment variable table.
12. Development, project status, roadmap, contributing, security reporting, and license.

## Badge policy

Display only verified live channels:

- GitHub Actions CI
- GitHub release version
- GHCR package
- Node 20+
- MCP Streamable HTTP and stdio
- MIT license

Do not show an npm-version badge or state that `npx drawarch-mcp` is available until npm publication is verified. For the current release, use the GitHub release tarball, source checkout, or GHCR instructions as working installation paths. It is acceptable to show `npx` as a future package path only inside a clearly labeled “after npm publication” note; the primary quick start must work today.

## Product claims and evidence

The README may claim only what is already verified:

- Eleven MCP tools over stdio and Streamable HTTP.
- Eighty-three passing tests at release time.
- Windows/Linux Node 20/22 CI and Docker build.
- Portable embedded `.drawio` MCP resource output.
- Absolute reference geometry and structural score validation.
- Bundled, Iconify, user data URI, and approved remote image modes.
- Public repository, GitHub release, and GHCR container.

It must not claim npm publication, Official MCP Registry publication, durable hosted `/mcp` availability, pixel-identical reproduction, or production validation from ChatGPT/Claude until those channels are directly verified.

## Compatibility and accessibility

- Render correctly in GitHub Markdown without client-side scripts.
- Keep the content useful when images are unavailable.
- Give every visual meaningful alt text.
- Avoid critical information that exists only inside an image.
- Ensure SVG text is large enough for a typical repository width and uses system font fallbacks.
- Use relative links for repository files and absolute links for live GitHub resources.

## Verification

Before completion:

1. Parse both SVGs as XML.
2. Confirm every relative README link resolves locally.
3. Check all externally referenced GitHub URLs return successfully.
4. Confirm no dead npm link or unverified publication claim remains.
5. Run `npm test`, `npm run build`, and `git diff --check` because README changes share the release branch.
6. Inspect the rendered SVGs visually.
7. Push only after the repository is clean and the latest CI run passes.

## Out of scope

- Product code changes.
- npm or MCP Registry publication.
- A documentation website.
- New logos that replace the DrawArch name.
- Screenshots containing proprietary reference images.
- Changes to MCP tool contracts or runtime behavior.
