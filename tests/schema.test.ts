import { describe, expect, it } from "vitest";

import { parseArchitectureSpec } from "../src/domain/schema.js";

const validSpec = {
  title: "IoT Safety",
  theme: "animated-sketch-dark",
  layout: "edge-cloud",
  outputFile: "iot-safety.drawio",
  groups: [
    { id: "edge", label: "Edge" },
    { id: "cloud", label: "Cloud" },
  ],
  nodes: [
    { id: "phone", label: "Phone", groupId: "edge", asset: "mobile-device" },
    { id: "api", label: "API", groupId: "cloud", asset: "api-service" },
  ],
  edges: [
    {
      id: "telemetry",
      source: "phone",
      target: "api",
      label: "MQTT",
      flow: "realtime",
      animated: true,
    },
  ],
};

describe("parseArchitectureSpec", () => {
  it("normalizes a valid architecture specification", () => {
    const result = parseArchitectureSpec(validSpec);

    expect(result.title).toBe("IoT Safety");
    expect(result.overwrite).toBe(false);
    expect(result.onlineAssets).toBe(false);
    expect(result.edges[0]?.flowDuration).toBe(700);
    expect(result.edges[0]?.flowTiming).toBe("linear");
    expect(result.edges[0]?.flowDirection).toBe("normal");
  });

  it("rejects duplicate component identifiers", () => {
    const input = {
      ...validSpec,
      nodes: [...validSpec.nodes, { id: "phone", label: "Duplicate", asset: "server" }],
    };

    expect(() => parseArchitectureSpec(input)).toThrow(/duplicate node id/i);
  });

  it("rejects nodes that reference an unknown group", () => {
    const input = {
      ...validSpec,
      nodes: [{ ...validSpec.nodes[0], groupId: "missing" }, validSpec.nodes[1]],
    };

    expect(() => parseArchitectureSpec(input)).toThrow(/unknown group/i);
  });

  it("rejects edges with dangling node references", () => {
    const input = {
      ...validSpec,
      edges: [{ ...validSpec.edges[0], target: "missing" }],
    };

    expect(() => parseArchitectureSpec(input)).toThrow(/unknown target node/i);
  });

  it("rejects self-referencing edges", () => {
    const input = {
      ...validSpec,
      edges: [{ ...validSpec.edges[0], target: "phone" }],
    };

    expect(() => parseArchitectureSpec(input)).toThrow(/cannot connect a node to itself/i);
  });

  it("rejects blank labels", () => {
    const input = {
      ...validSpec,
      nodes: [{ ...validSpec.nodes[0], label: "   " }, validSpec.nodes[1]],
    };

    expect(() => parseArchitectureSpec(input)).toThrow();
  });

  it("rejects unsupported themes and layouts", () => {
    expect(() => parseArchitectureSpec({ ...validSpec, theme: "unknown" })).toThrow();
    expect(() => parseArchitectureSpec({ ...validSpec, layout: "freeform" })).toThrow();
  });

  it("rejects output names that are not safe drawio basenames", () => {
    expect(() => parseArchitectureSpec({ ...validSpec, outputFile: "diagram.xml" })).toThrow();
    expect(() => parseArchitectureSpec({ ...validSpec, outputFile: "../escape.drawio" })).toThrow();
    expect(() => parseArchitectureSpec({ ...validSpec, outputFile: "/tmp/escape.drawio" })).toThrow();
  });
});
