# DrawArch MCP V2: Reference-Image Recreation

## Status

Approved product design. This document defines V2 scope; the current V1 renderer remains available while V2 is implemented.

## Product outcome

An MCP-capable host such as ChatGPT or Claude accepts a user-provided reference image, uses its own vision-capable LLM to describe the diagram, and calls DrawArch MCP to create a high-fidelity, fully editable diagrams.net file. DrawArch does not require a separate LLM API key.

V2 is intentionally limited to architecture and system diagrams. It must recreate diagram structure, text, geometry, routing, visual style, and real-world assets without hiding the original image behind the generated content.

## Responsibility boundary

The host LLM is responsible for image understanding and planning:

- identify every visible element and its role;
- transcribe text exactly;
- select an asset mode for each visual element;
- provide absolute positions, dimensions, z-order, groups, connector ports, and waypoints;
- provide confidence values and ask the user about genuinely ambiguous content.

DrawArch MCP is responsible for deterministic, secure execution:

- validate and normalize the submitted recreation plan;
- resolve or ingest approved assets;
- generate editable diagrams.net XML;
- validate structural integrity and asset provenance;
- render and compare the output when a reference image is available.

## V2 MCP workflow

### 1. `prepare_reference_recreation`

Accepts reference-image metadata plus the host LLM scene graph. It validates the plan, resolves safe assets, and returns:

- normalized scene graph;
- missing or low-confidence elements;
- exact validation errors;
- proposed internet-image candidates;
- a stable approval token for candidates that require user consent.

This tool never downloads arbitrary internet images without explicit approval.

### 2. `update_reference_plan`

Allows the host LLM to correct text, geometry, layers, assets, styles, groups, or connectors without rebuilding the plan from scratch. The result is a new immutable plan revision.

### 3. Explicit approval step

The host presents arbitrary internet-image candidates to the user with source, license status, and intended placement. The user approves or rejects each candidate. Approved candidate IDs and the approval token are supplied to the creation tool.

Approved icon-library SVGs and user-provided images do not require this additional internet-download confirmation.

### 4. `create_reference_drawio`

Consumes an approved plan revision and generates the editable `.drawio` file. Every element remains independently selectable and editable. Embedded assets include provenance and integrity metadata.

### 5. `validate_reference_drawio`

Checks XML structure, duplicate IDs, parent relationships, connector endpoints, geometry, z-order, embedded assets, provenance, hotlinks, local paths, and fidelity-critical omissions.

### 6. `compare_reference_recreation`

Optionally renders the generated file to PNG and compares it with the supplied reference. It reports:

- element coverage;
- text accuracy;
- geometry and alignment similarity;
- connector/waypoint similarity;
- style and color similarity;
- asset similarity;
- missing semantic elements;
- actionable revision suggestions.

## Scene-graph contract

The host submits an absolute-position scene graph containing:

- canvas width, height, background, grid, and page settings;
- ordered layers;
- containers and nested groups;
- shape elements with absolute `x`, `y`, `width`, `height`, rotation, opacity, fill, stroke, radius, and z-order;
- text elements with exact content, font family, size, weight, color, alignment, wrapping, and bounds;
- asset elements with asset mode, query or source reference, crop mode, bounds, and confidence;
- connectors with source/target element IDs, source/target ports, arrowheads, style, label, and explicit waypoints;
- confidence and source evidence for each inferred element.

Coordinates are expressed in the reference image coordinate system and scaled deterministically to the requested output canvas. V2 does not run V1 auto-layout when explicit geometry is present.

## Asset modes

The host LLM chooses one mode per element:

1. Approved online SVG/icon collection.
2. User-provided image.
3. Arbitrary internet image or product photo.
4. Native diagrams.net shape when it more accurately represents the reference.
5. Safe placeholder when no approved asset is available.

Assets are embedded into the `.drawio`; generated files contain no hotlinks. V2 records provider, collection, source URL, license, retrieval timestamp, and SHA-256 integrity metadata. Unknown-license assets require an explicit warning and user approval.

## Security requirements

All network retrieval uses HTTPS and enforces:

- URL parsing and allow/deny policy before each request;
- DNS resolution checks that block loopback, link-local, private, multicast, metadata, and reserved ranges;
- redirect revalidation at every hop;
- connection, response, and total time limits;
- compressed-byte, decoded-byte, pixel, and dimension limits;
- MIME signature verification instead of trusting extensions or headers;
- SVG sanitization that removes scripts, event handlers, external references, unsafe URLs, foreign objects, and active content;
- raster decode and re-encode into a safe supported format;
- content hashing, deduplication, and provenance capture;
- safe placeholders when validation fails.

User-provided files receive the same MIME, SVG, raster, size, and pixel validation.

## Fidelity rules and acceptance thresholds

The generated result must preserve all submitted semantic elements. Comparison scoring is:

- excellent: 95% or higher;
- good: 85% to 94.99%;
- needs revision: below 85%, or any missing critical semantic element.

Scoring weights must make missing text, nodes, groups, or connectors more costly than small color or spacing differences. A high numeric score cannot override a missing critical semantic element.

## Non-goals

- General-purpose photo tracing or illustration recreation.
- A hidden reference image used as the final diagram background.
- Automatic use of arbitrary internet images without user approval.
- Requiring DrawArch customers to configure a separate LLM provider key when their MCP host already supplies vision and reasoning.

## Compatibility and rollout

V1 tools remain stable during V2 development. V2 tools use distinct names and schemas so existing clients are not broken. The package version should be bumped only when the V2 contracts and acceptance tests are implemented, documented, and released.
