# DrawArch architecture

DrawArch deliberately separates visual reasoning from deterministic file generation.

```text
reference image or prompt
          |
          v
host LLM vision/reasoning (ChatGPT, Claude, Codex, etc.)
          |
          v
typed scene graph -> immutable plan revision -> explicit approval token
          |                                      |
          +------------------ render ------------+
                               |
          asset resolver -> embedded data URIs -> native mxGraph cells
                               |
                     validation + structural comparison
                               |
                    portable .drawio MCP resource
```

The stdio and Streamable HTTP transports expose the same eleven tools. The server never calls an LLM and therefore needs no LLM API key. A plan uses canvas coordinates, layers, z-order, confidence, explicit parent relationships, connector ports, and waypoints. Rendering is deterministic and objects remain independently editable.

Remote assets pass through URL policy, DNS/public-address checks on every redirect, byte and time limits, SVG active-content rejection, and raster decode/re-encode. The final Draw.io file contains only embedded image data.

Plan approvals are HMAC-bound to `planId.revision`. Updating a plan creates a new immutable file and invalidates every previous token. Output filenames are basenames restricted to the configured root, and writes are validated and atomic.

The structural comparison proves that all planned editable elements are present. Pixel-level similarity remains the responsibility of the vision-capable host, which can inspect the generated preview, revise coordinates/styles/assets, and render another revision.
