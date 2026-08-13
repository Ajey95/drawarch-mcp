# SafeSense MCP Redraw Design

## Objective

Use the existing DrawArch MCP server, without expanding its schema or renderer, to recreate the supplied `SafeSense_System_Architecture.gif` as an editable and validated diagrams.net file. This is an acceptance test of the current MCP rather than a pixel-perfect tracing exercise.

## Deliverable

- Output file: `outputs/safesense-system-architecture.drawio`
- Title: `SafeSense System Architecture`
- Theme: `animated-sketch-light`
- Online assets: disabled
- Existing output: overwritten when the acceptance test is rerun

The file must be created through the MCP `create_drawio` tool and independently checked through the MCP `validate_drawio` tool.

## Architecture Mapping

The source diagram will be represented by six editable DrawArch groups:

1. Environmental Sensing
2. Wi-Fi CSI Acquisition
3. TinyML Edge Intelligence
4. Fusion and Incident Decision
5. Communication and Response (Cloud)
6. System Services

Major source boxes become editable DrawArch nodes. The redraw will preserve the following semantic chain:

1. Environmental sensors feed an ESP32 sensor node.
2. The ESP32 validates, filters, calibrates, and thresholds readings into an environmental risk state.
3. Wi-Fi CSI flows from an ESP32 transmitter through the wireless channel to an ESP32 receiver, CSI callback, and buffer/quality check.
4. Buffered CSI is normalized and windowed, processed by a TinyML model, and emitted as an activity class with confidence.
5. Environmental risk, activity confidence, and sensor/node health feed the fusion and incident decision stage.
6. Confirmed incidents become structured JSON and pass through MQTT/HTTPS, an incident API, database, dashboard, operator, and alert acknowledgement.
7. A feedback edge represents acknowledgement/closure returning to the incident decision stage.

System Services will retain Power, Watchdog, Time Sync, Configuration, and Diagnostics as separate nodes so that every listed service remains editable and visible.

## Visual Translation

The redraw will use the closest supported current-MCP representation:

- light sketch styling for the monochrome hand-drawn appearance;
- grouped containers for the numbered regions and services panel;
- bundled SVGs for IoT sensors, servers, AI, queues, APIs, databases, dashboards, monitoring, cloud, and users;
- dashed animated connectors for the main data and feedback paths;
- labels and subtitles copied or normalized from the source where required by DrawArch's node-card format.

The acceptance test does not claim pixel identity. The current MCP does not expose manual coordinates, photographic sensor assets, custom document/oval shapes, footer ownership boxes, or exact connector waypoint control. These details will be represented semantically using automatic layout, standard cards, and bundled assets. The four footer identifiers are presentation metadata rather than system components and will not be added as architecture nodes.

## Validation and Acceptance Criteria

The redraw passes when all of the following are verified:

- `create_drawio` completes through a real MCP client and returns no generation warnings that invalidate the file;
- the result reports six groups and includes all mapped system stages and services;
- all declared edges reference existing nodes;
- bundled SVG assets are embedded in the `.drawio` document;
- `validate_drawio` returns `valid: true` with no issues for the saved filename;
- the file exists inside the configured `outputs` directory and contains the SafeSense title and representative labels from each major section;
- the original GIF remains unchanged.

## Out of Scope

- changing DrawArch's schema, renderer, themes, or layout algorithms;
- manually editing generated Draw.io XML to improve fidelity;
- downloading or embedding the source diagram's photographic sensor images;
- exporting a replacement GIF or PNG;
- claiming pixel-perfect reproduction.
