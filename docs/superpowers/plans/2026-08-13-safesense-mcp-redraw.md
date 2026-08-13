# SafeSense MCP Redraw Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate and validate an editable SafeSense architecture diagram through the existing DrawArch MCP server.

**Architecture:** Create a reusable JSON example that maps the supplied reference into the current six-group DrawArch schema. Submit that payload to the running stdio server through MCP Inspector, invoke `validate_drawio` on the generated file, and independently inspect the saved XML without modifying it.

**Tech Stack:** Node.js 22.23.2, TypeScript 7, DrawArch MCP over stdio, MCP Inspector 2.2.0, diagrams.net `.drawio` XML

## Global Constraints

- Do not modify DrawArch's schema, renderer, themes, or layout algorithms.
- Generate `outputs/safesense-system-architecture.drawio` with title `SafeSense System Architecture`.
- Use theme `animated-sketch-light`, layout `edge-cloud`, bundled assets only, and overwrite on reruns.
- Create the diagram through MCP `create_drawio`; validate it independently through MCP `validate_drawio`.
- Do not modify `C:\Users\srija\Downloads\SafeSense_System_Architecture.gif`.
- Do not claim pixel-perfect reproduction.
- This extracted folder has no Git metadata; commit steps are unavailable.

---

## File Structure

- Create `examples/safesense-system-architecture.json`: reusable, human-readable input payload for the acceptance test.
- Create `outputs/safesense-system-architecture.drawio`: MCP-generated editable diagram; never hand-edit this file.
- Inspect `src/domain/schema.ts`: authoritative input contract; no changes.
- Inspect `dist/src/validate/drawio.js`: independent disk-level validation API; no changes.

### Task 1: Create and schema-check the SafeSense MCP payload

**Files:**
- Create: `examples/safesense-system-architecture.json`
- Inspect: `src/domain/schema.ts`

**Interfaces:**
- Consumes: `ArchitectureSpecSchema` as defined in `src/domain/schema.ts`.
- Produces: one complete JSON object accepted as the `create_drawio` arguments.

- [ ] **Step 1: Create the exact architecture payload**

Use these top-level values:

```json
{
  "title": "SafeSense System Architecture",
  "theme": "animated-sketch-light",
  "layout": "edge-cloud",
  "outputFile": "safesense-system-architecture.drawio",
  "overwrite": true,
  "onlineAssets": false
}
```

Define these groups in this order:

| ID | Label | Subtitle |
|---|---|---|
| `environment` | `1. Environmental Sensing` | `Validate environmental conditions and derive risk` |
| `wifi-csi` | `2. Wi-Fi CSI Acquisition` | `I/Q, RSSI, time and sequence capture` |
| `tinyml` | `3. TinyML Edge Intelligence` | `Windowed activity inference at the edge` |
| `fusion` | `4. Fusion & Incident Decision` | `Persistent evidence and consecutive confirmation` |
| `cloud-response` | `5. Communication & Response (Cloud)` | `Reliable incident delivery and acknowledgement` |
| `services` | `System Services` | `Power, timing, configuration and diagnostics` |

Define these nodes in group order:

| ID | Group | Label | Subtitle | Asset |
|---|---|---|---|---|
| `environmental-sensors` | `environment` | `Environmental Sensors` | `Gas · Temperature · Humidity · Pressure` | `iot-sensor` |
| `esp32-sensor` | `environment` | `ESP32 Sensor Node` | `ADC · I²C · GPIO` | `iot-sensor` |
| `environment-processing` | `environment` | `Validate · Filter` | `Calibrate · Threshold` | `server` |
| `environmental-risk` | `environment` | `Environmental Risk State` | `Risk evidence` | `monitoring` |
| `esp32-tx` | `wifi-csi` | `ESP32 TX Node` | `Wi-Fi transmitter` | `iot-sensor` |
| `wifi-channel` | `wifi-csi` | `Wi-Fi Channel` | `CSI propagation` | `mobile-device` |
| `esp32-rx` | `wifi-csi` | `ESP32 RX Node` | `Wi-Fi receiver` | `iot-sensor` |
| `csi-callback` | `wifi-csi` | `CSI Callback` | `I/Q · RSSI · Time · Sequence` | `api-service` |
| `csi-buffer` | `wifi-csi` | `Buffer & Quality Check` | `Validated CSI windows` | `server` |
| `normalize-window` | `tinyml` | `Normalize & Window` | `Prepare inference input` | `server` |
| `tinyml-model` | `tinyml` | `TinyML Model` | `Edge activity inference` | `ai-model` |
| `activity-confidence` | `tinyml` | `Activity Class + Confidence` | `Class and confidence` | `ai-model` |
| `incident-fusion` | `fusion` | `Risk + Activity + Health` | `Persistence · Consecutive Confirmation` | `ai-model` |
| `sensor-health` | `fusion` | `Sensor & Node Health` | `Health evidence` | `monitoring` |
| `structured-json` | `cloud-response` | `Structured JSON` | `Confirmed incident` | `object-storage` |
| `mqtt-https` | `cloud-response` | `MQTT / HTTPS` | `Idempotency · Retry` | `message-queue` |
| `incident-api` | `cloud-response` | `Incident API` | `Incident ingestion` | `api-service` |
| `incident-database` | `cloud-response` | `Incident Database` | `Durable incident record` | `database` |
| `dashboard` | `cloud-response` | `Dashboard` | `Live incident view` | `web-application` |
| `operator` | `cloud-response` | `Response Operator` | `Human review` | `user` |
| `alert-ack` | `cloud-response` | `Alert & Acknowledgement` | `ACK / Close` | `monitoring` |
| `power` | `services` | `Power` | `System power service` | `server` |
| `watchdog` | `services` | `Watchdog` | `Liveness supervision` | `monitoring` |
| `time-sync` | `services` | `Time Sync` | `Clock alignment` | `server` |
| `configuration` | `services` | `Configuration` | `Runtime settings` | `api-service` |
| `diagnostics` | `services` | `Diagnostics` | `System diagnostics` | `monitoring` |

Define these edges with `animated: true` and `pattern: "dashed"`:

| ID | Source | Target | Label | Flow |
|---|---|---|---|---|
| `sense-to-esp32` | `environmental-sensors` | `esp32-sensor` | `Sensor readings` | `realtime` |
| `esp32-to-processing` | `esp32-sensor` | `environment-processing` | `Samples` | `realtime` |
| `processing-to-risk` | `environment-processing` | `environmental-risk` | `Risk state` | `realtime` |
| `tx-to-channel` | `esp32-tx` | `wifi-channel` | `Wi-Fi signal` | `realtime` |
| `channel-to-rx` | `wifi-channel` | `esp32-rx` | `CSI signal` | `realtime` |
| `rx-to-callback` | `esp32-rx` | `csi-callback` | `CSI frames` | `realtime` |
| `callback-to-buffer` | `csi-callback` | `csi-buffer` | `I/Q · RSSI · Time · Sequence` | `batch` |
| `buffer-to-normalize` | `csi-buffer` | `normalize-window` | `Quality-approved window` | `batch` |
| `normalize-to-model` | `normalize-window` | `tinyml-model` | `Normalized window` | `realtime` |
| `model-to-activity` | `tinyml-model` | `activity-confidence` | `Class + confidence` | `realtime` |
| `risk-to-fusion` | `environmental-risk` | `incident-fusion` | `Risk` | `realtime` |
| `activity-to-fusion` | `activity-confidence` | `incident-fusion` | `Class + confidence` | `realtime` |
| `health-to-fusion` | `sensor-health` | `incident-fusion` | `Health` | `monitoring` |
| `fusion-to-json` | `incident-fusion` | `structured-json` | `Confirmed incident` | `batch` |
| `json-to-mqtt` | `structured-json` | `mqtt-https` | `Structured incident` | `batch` |
| `mqtt-to-api` | `mqtt-https` | `incident-api` | `MQTT / HTTPS` | `request` |
| `api-to-database` | `incident-api` | `incident-database` | `Persist` | `batch` |
| `database-to-dashboard` | `incident-database` | `dashboard` | `Incident view` | `request` |
| `dashboard-to-operator` | `dashboard` | `operator` | `Notify` | `realtime` |
| `operator-to-alert` | `operator` | `alert-ack` | `Alert response` | `feedback` |
| `ack-to-fusion` | `alert-ack` | `incident-fusion` | `ACK / Close` | `feedback` |

- [ ] **Step 2: Parse the fixture with the production schema**

Run:

```powershell
@'
import { readFile } from "node:fs/promises";
import { parseArchitectureSpec } from "./dist/src/domain/schema.js";
const input = JSON.parse(await readFile("./examples/safesense-system-architecture.json", "utf8"));
const parsed = parseArchitectureSpec(input);
console.log(JSON.stringify({ groups: parsed.groups.length, nodes: parsed.nodes.length, edges: parsed.edges.length }));
'@ | node --input-type=module -
```

Expected: exit code `0` and `{"groups":6,"nodes":26,"edges":21}`.

### Task 2: Generate the diagram through MCP Inspector

**Files:**
- Consume: `examples/safesense-system-architecture.json`
- Create through MCP: `outputs/safesense-system-architecture.drawio`

**Interfaces:**
- Consumes: the full Task 1 JSON object as `create_drawio` arguments.
- Produces: MCP structured output containing `outputFile`, `outputPath`, `counts`, `assets`, `warnings`, and `validation`.

- [ ] **Step 1: Confirm the local Inspector and Node 22 DrawArch process are running**

Run:

```powershell
Get-NetTCPConnection -LocalPort 6274 -State Listen
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'dist/src/index.js' }
```

Expected: a listener on `localhost:6274` and a running DrawArch `node.exe` process using Node 22.23.2.

- [ ] **Step 2: Invoke `create_drawio` through the browser Inspector**

Open the running Inspector, connect the `node dist/src/index.js` stdio server, select `Tools`, select `Create Editable Architecture Diagram`, populate the form from the fixture, and execute it.

Expected structured result:

```json
{
  "outputFile": "safesense-system-architecture.drawio",
  "theme": "animated-sketch-light",
  "layout": "edge-cloud",
  "counts": { "groups": 6, "nodes": 26, "edges": 21 },
  "warnings": [],
  "validation": { "valid": true, "issues": [] }
}
```

Asset provenance entries must report `source: "bundled"` and `provider: "drawarch"`.

### Task 3: Validate the generated file through MCP and from disk

**Files:**
- Inspect: `outputs/safesense-system-architecture.drawio`
- Inspect: `dist/src/validate/drawio.js`

**Interfaces:**
- Consumes: filename `safesense-system-architecture.drawio`.
- Produces: MCP validation report and independent disk-level evidence.

- [ ] **Step 1: Invoke MCP `validate_drawio`**

In the same connected Inspector session, select `Validate a DrawArch File`, enter `safesense-system-architecture.drawio`, and execute it.

Expected:

```json
{
  "fileName": "safesense-system-architecture.drawio",
  "validation": { "valid": true, "issues": [] }
}
```

- [ ] **Step 2: Independently inspect and validate the saved file**

Run:

```powershell
@'
import { readFile } from "node:fs/promises";
import { validateDrawio } from "./dist/src/validate/drawio.js";
const path = "./outputs/safesense-system-architecture.drawio";
const xml = await readFile(path, "utf8");
const required = [
  "SafeSense System Architecture",
  "Environmental Sensing",
  "Wi-Fi CSI Acquisition",
  "TinyML Edge Intelligence",
  "Fusion &amp; Incident Decision",
  "Communication &amp; Response (Cloud)",
  "System Services"
];
console.log(JSON.stringify({
  bytes: Buffer.byteLength(xml),
  missingLabels: required.filter((label) => !xml.includes(label)),
  embeddedSvgCount: (xml.match(/data:image\/svg\+xml/g) ?? []).length,
  validation: validateDrawio(xml)
}, null, 2));
'@ | node --input-type=module -
```

Expected: nonzero `bytes`, `missingLabels: []`, `embeddedSvgCount: 26`, and `validation.valid: true` with no issues.

- [ ] **Step 3: Confirm the source GIF is unchanged**

Run:

```powershell
Get-FileHash 'C:\Users\srija\Downloads\SafeSense_System_Architecture.gif' -Algorithm SHA256
```

Record the hash as evidence; no step in this plan writes to that path.

- [ ] **Step 4: Report verified scope honestly**

Report the MCP calls, exact counts, validation result, output path, and the known automatic-layout limitations. Do not describe the output as pixel-perfect and do not claim visual details that were not inspected.
