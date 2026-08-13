# DrawArch MCP

DrawArch MCP generates polished, animated, natively editable diagrams.net architecture diagrams. An MCP-capable AI agent supplies a structured system graph; DrawArch selects real SVG assets, applies a deterministic layout and theme, creates colour-coded animated datapaths, embeds every asset, validates the result, and writes a portable `.drawio` file.

The `.drawio` file is the product. PNG, SVG, and animated GIF exports can be produced later from diagrams.net without flattening the editable source.

## What V1 includes

- Five MCP tools over local stdio
- Six selectable visual themes
- Five deterministic architecture layouts
- Twelve bundled original SVG assets
- Bundled-first and opt-in Iconify-compatible online asset resolution
- Embedded SVG data URIs—no hotlinked image dependency
- Native diagrams.net connector flow animation
- Editable subsystem groups, node cards, image cells, labels, edges, and legends
- Safe output paths, overwrite protection, atomic writes, and structural validation
- A complete IoT safety example

The authoritative product scope and V2 boundary are in [`PRD.md`](PRD.md).

## Requirements

- Node.js 22 or newer
- npm 10 or newer
- A current diagrams.net editor to open generated files
- An MCP host such as ChatGPT/Codex, Claude Desktop/Code, VS Code, or Cursor

## Install and build

```bash
npm install
npm test
npm run build
```

Generate the bundled example:

```bash
npm run sample
```

The result is `examples/iot-safety.drawio`.

## Run as an MCP server

The built server uses stdio. stdout is reserved for MCP messages; diagnostics go to stderr.

```bash
DRAWARCH_OUTPUT_DIR="/absolute/path/to/diagrams" npm start
```

### MCP host configuration

Build the project, replace the two absolute paths below, and add this entry to your host's MCP configuration:

```json
{
  "mcpServers": {
    "drawarch": {
      "command": "node",
      "args": ["/absolute/path/to/drawarch-mcp/dist/src/index.js"],
      "env": {
        "DRAWARCH_OUTPUT_DIR": "/absolute/path/to/diagrams",
        "DRAWARCH_ONLINE_ASSETS": "false"
      }
    }
  }
}
```

For development without building:

```json
{
  "mcpServers": {
    "drawarch-dev": {
      "command": "node",
      "args": ["--import", "tsx", "/absolute/path/to/drawarch-mcp/src/index.ts"],
      "env": {
        "DRAWARCH_OUTPUT_DIR": "/absolute/path/to/diagrams"
      }
    }
  }
}
```

## Environment variables

| Variable | Default | Meaning |
|---|---:|---|
| `DRAWARCH_OUTPUT_DIR` | `.drawarch-output` | Only directory in which tools may read/write `.drawio` files |
| `DRAWARCH_ONLINE_ASSETS` | `false` | Enables approved online SVG lookup when set to `true` |
| `DRAWARCH_ICONIFY_BASE_URL` | `https://api.iconify.design` | HTTPS Iconify-compatible provider URL |

Online access is opt-in twice: the server must enable it and the individual asset/generation request must set `allowOnline`/`onlineAssets`.

## MCP tools

### `list_themes`

Lists selectable themes with IDs, descriptions, and background colours.

### `list_assets`

Searches the bundled catalogue. Parameters:

- `query` — optional text such as `postgres`, `smartphone`, or `telemetry`
- `category` — optional exact category
- `provider` — optional exact provider

### `resolve_asset`

Resolves one component to a bundled or online SVG and returns provenance without returning the full asset bytes.

- `query` — required component/icon description
- `category` — optional generic fallback category
- `provider` — optional provider preference
- `allowOnline` — defaults to `false`

### `create_drawio`

Creates a `.drawio` file from the architecture schema documented below. The output name must be a basename such as `platform.drawio`; nested paths and traversal are rejected.

### `validate_drawio`

Validates one `.drawio` file inside `DRAWARCH_OUTPUT_DIR` for malformed structure, duplicate cell IDs, dangling connectors, hotlinked images, absolute local paths, and missing root cells.

## Architecture input

The MCP host's LLM translates a natural-language request into this structured graph. DrawArch itself does not call an LLM and never asks one to write raw XML.

```json
{
  "title": "Realtime Platform",
  "theme": "animated-sketch-dark",
  "layout": "edge-cloud",
  "outputFile": "realtime-platform.drawio",
  "overwrite": false,
  "onlineAssets": false,
  "groups": [
    { "id": "edge", "label": "Edge" },
    { "id": "cloud", "label": "Cloud" }
  ],
  "nodes": [
    {
      "id": "sensor",
      "label": "Sensor",
      "subtitle": "GPS + IMU",
      "groupId": "edge",
      "asset": "iot-sensor"
    },
    {
      "id": "api",
      "label": "API",
      "groupId": "cloud",
      "asset": "api-service"
    }
  ],
  "edges": [
    {
      "id": "telemetry",
      "source": "sensor",
      "target": "api",
      "label": "MQTT",
      "flow": "realtime",
      "animated": true
    }
  ]
}
```

See [`examples/iot-safety.json`](examples/iot-safety.json) for a multi-group, multi-flow example.

## Themes

| Theme ID | Intended use |
|---|---|
| `animated-sketch-dark` | Signature black hand-drawn animated style |
| `animated-sketch-light` | Whiteboard-style sketch diagram |
| `professional-cloud` | Formal cloud and solution architecture |
| `minimal-corporate` | Neutral reports and presentations |
| `technical-blueprint` | Engineering and hardware diagrams |
| `presentation-neon` | High-contrast live demos |

A theme changes only visual tokens. It never changes components or connections.

## Layouts

| Layout ID | Behavior |
|---|---|
| `horizontal` | Left-to-right architecture flow |
| `vertical` | Top-to-bottom architecture flow |
| `edge-cloud` | Group columns for edge, cloud, and users |
| `hub-spoke` | First node at the hub, remaining nodes around it |
| `pipeline` | Ordered processing stages |

## Flow types

`request`, `realtime`, `batch`, `feedback`, `monitoring`, and `dependency` have distinct theme-aware colours. Edges can override colour, solid/dashed/dotted pattern, animation, duration, timing, and direction. A legend is generated when multiple flow types are used.

## Bundled assets

V1 ships original MIT-licensed SVGs for user, mobile device, web application, API/service, server, database, message queue, object storage, cloud, AI model, IoT sensor, and monitoring.

Resolution order:

1. Exact bundled ID
2. Bundled alias/tag semantic match
3. Online search when both server and request enable it
4. Generic bundled category fallback
5. Actionable resolution error

Online SVGs are restricted to HTTPS, time-limited, byte-limited, redirect-limited, sanitized, hashed, and embedded. Scripts, event handlers, `foreignObject`, unsafe links, and external image dependencies are rejected.

## Development

```bash
npm test                  # all unit and integration tests
npm test -- tests/layout.test.ts
npm run build
npm run sample
```

The stdio integration test starts the real server process with the official MCP client and invokes all five tools.

## Troubleshooting

### The host cannot start the server

- Run `npm run build` again.
- Confirm the configured path ends in `dist/src/index.js`.
- Use absolute paths in MCP host configuration.
- Confirm Node.js is available in the host's environment.

### An icon cannot be found

- Call `list_assets` with a shorter alias.
- Provide a `category` for a safe generic fallback.
- Enable online resolution at the server and request levels.
- Use an exact Iconify-compatible asset query/provider.

### Output already exists

Set `overwrite: true` only when replacement is intentional. Generation otherwise protects existing files.

### The animation is not visible

Open the file in a current diagrams.net release and ensure animations are enabled in the editor's View/Settings menu. The animation properties remain stored even if the editor temporarily hides visual animations.

## V2

V2 will inspect authorized local/GitHub codebases, infer architecture with evidence and confidence, compare it with existing diagrams, and propose incremental updates while preserving manual edits. V2 will consume the same V1 schema and renderer.

## Licence

DrawArch-owned code and bundled SVGs are MIT licensed. Online assets retain their provider/collection licence metadata and source attribution inside generated image cells.
