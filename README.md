# DrawArch MCP

[![CI](https://github.com/Ajey95/drawarch-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Ajey95/drawarch-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/drawarch-mcp)](https://www.npmjs.com/package/drawarch-mcp)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

DrawArch turns architecture descriptions and reference images into portable, natively editable diagrams.net (`.drawio`) files through the Model Context Protocol.

The connected ChatGPT, Claude, Codex, Cursor, or other MCP host does the visual reasoning. DrawArch does **not** require or call a second LLM API. It validates the host model's scene graph, resolves and safely embeds real icons or images, renders exact absolute geometry, checks fidelity, and returns the `.drawio` file directly as an MCP artifact.

## Why DrawArch

- Recreate a supplied reference image as independent editable shapes, text, icons, containers, and connectors.
- Generate architecture diagrams from structured components and flows.
- Use bundled icons, opt-in Iconify-compatible online icons, user-provided images, or approved HTTPS image URLs.
- Keep every asset inside the `.drawio` file; outputs do not depend on hotlinks.
- Run locally over stdio or as a shared Streamable HTTP MCP server.
- Protect remote deployments with bearer authentication, host/origin allowlists, SSRF controls, size limits, SVG sanitization, and raster re-encoding.
- Preserve approved plans as immutable revisions and reject stale approval tokens.

## Quick start

Requires Node.js 20 or newer.

```bash
npx -y drawarch-mcp
```

Local MCP configuration:

```json
{
  "mcpServers": {
    "drawarch": {
      "command": "npx",
      "args": ["-y", "drawarch-mcp"],
      "env": {
        "DRAWARCH_OUTPUT_DIR": "/absolute/path/to/diagrams",
        "DRAWARCH_ONLINE_ASSETS": "false"
      }
    }
  }
}
```

For an unpublished checkout, run `npm install && npm run build`, then replace the command with `node` and the args with the absolute path to `dist/src/index.js`.

## Reference-image workflow

Attach an image to your MCP host and ask it to recreate the image with DrawArch. The intended tool sequence is:

1. The host vision model analyzes the image and calls `prepare_reference_recreation` with an absolute scene graph.
2. The host or user reviews the plan and approved asset sources. An approved preparation returns a revision-bound token.
3. The host calls `create_reference_drawio`; DrawArch resolves and embeds assets, renders exact coordinates, validates the file, and returns it as a resource.
4. `compare_reference_recreation` reports structural coverage. The host can revise the plan and repeat until the target is met.

Each visible object remains editable. Connectors retain source/target attachment, ports, and waypoints. See [the complete reference-plan example](examples/reference-recreation.json).

## Run a shared remote MCP server

```bash
DRAWARCH_TRANSPORT=http \
HOST=0.0.0.0 \
PORT=3000 \
DRAWARCH_API_KEY=replace-with-a-long-random-secret \
DRAWARCH_APPROVAL_SECRET=replace-with-another-random-secret \
DRAWARCH_ALLOWED_HOSTS=drawarch.example.com \
DRAWARCH_ALLOWED_ORIGINS=chatgpt.com,claude.ai \
DRAWARCH_ONLINE_ASSETS=true \
npx -y drawarch-mcp
```

Endpoints:

- `POST /mcp` — Streamable HTTP MCP
- `GET /health` — public health probe
- `GET /files/<safe-name>.drawio` — authenticated output download

Connect ChatGPT or Claude to `https://drawarch.example.com/mcp` and set `Authorization: Bearer <DRAWARCH_API_KEY>` in the connector configuration. ChatGPT cannot directly spawn a local stdio process; use the remote server for ChatGPT, or a supported development tunnel while testing.

Docker:

```bash
docker build -t drawarch-mcp .
docker run --rm -p 3000:3000 \
  -e DRAWARCH_API_KEY=replace-me \
  -e DRAWARCH_APPROVAL_SECRET=replace-me-too \
  -e DRAWARCH_ALLOWED_HOSTS=localhost,127.0.0.1 \
  -v drawarch-data:/data \
  drawarch-mcp
```

Or use the published image: `ghcr.io/ajey95/drawarch-mcp:0.2.0`.

## MCP tools

| Tool | Purpose |
|---|---|
| `list_themes` | List six built-in diagram themes. |
| `list_assets` | Search the bundled real-world icon catalog. |
| `resolve_asset` | Resolve a bundled or opt-in online icon with provenance. |
| `create_drawio` | Generate a deterministic themed architecture diagram. |
| `validate_drawio` | Validate a generated architecture file. |
| `prepare_reference_recreation` | Store an absolute editable scene graph and optionally approve its sources. |
| `update_reference_plan` | Create an immutable next revision; prior approvals become stale. |
| `get_reference_plan` | Read the current revision for review. |
| `create_reference_drawio` | Render an approved reference plan and return the `.drawio` artifact. |
| `validate_reference_drawio` | Validate a recreated file. |
| `compare_reference_recreation` | Score structural coverage against the plan. |

## Asset modes

Reference assets support four explicit modes:

- `bundled`: a DrawArch-owned MIT SVG selected by query.
- `online`: an Iconify-compatible SVG selected by query; server opt-in is required.
- `data`: a user-supplied SVG, PNG, JPEG, or WebP data URI.
- `remote`: an approved HTTPS image URL; server opt-in is required.

Remote fetching rejects credentials, non-HTTPS URLs, custom ports, private/reserved DNS answers, unsafe redirects, oversized content, active SVG content, and excessive raster dimensions. Raster images are decoded and re-encoded before embedding. Online assets retain their provider/license metadata; users remain responsible for verifying third-party license terms.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `DRAWARCH_TRANSPORT` | `stdio` | `stdio` or `http`. |
| `DRAWARCH_OUTPUT_DIR` | `.drawarch-output` | Restricted output and plan-storage directory. |
| `DRAWARCH_ONLINE_ASSETS` | `false` | Enables opt-in online and remote image sources. |
| `DRAWARCH_ICONIFY_BASE_URL` | Iconify API | HTTPS Iconify-compatible provider. |
| `HOST` | `127.0.0.1` | HTTP bind host. |
| `PORT` | `3000` | HTTP port. |
| `DRAWARCH_API_KEY` | unset | Optional bearer token for `/mcp` and `/files`. Required for internet exposure. |
| `DRAWARCH_APPROVAL_SECRET` | random/process | HMAC secret for revision-bound approvals; set it for shared deployments. |
| `DRAWARCH_ALLOWED_HOSTS` | local hosts | Comma-separated accepted Host values. |
| `DRAWARCH_ALLOWED_ORIGINS` | local origins | Comma-separated accepted Origin hosts. |
| `DRAWARCH_PUBLIC_BASE_URL` | listener URL | Public base URL advertised by the process. |

## Development

```bash
npm install
npm test
npm run build
npm run sample
npm pack --dry-run
```

Architecture and security details are in [ARCHITECTURE.md](docs/ARCHITECTURE.md). Contributions are welcome; read [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

DrawArch code and bundled assets are MIT licensed. Third-party assets keep their own provider licenses and attribution.
