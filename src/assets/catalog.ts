import { readFileSync } from "node:fs";

export interface BundledAsset {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly provider: "drawarch";
  readonly tags: readonly string[];
  readonly aliases: readonly string[];
  readonly mediaType: "image/svg+xml";
  readonly license: "MIT";
  readonly source: "bundled";
  readonly svg: string;
}

interface AssetDefinition extends Omit<BundledAsset, "svg" | "provider" | "mediaType" | "license" | "source"> {
  readonly file: string;
}

const DEFINITIONS: readonly AssetDefinition[] = [
  { id: "user", title: "User", category: "actor", tags: ["person", "customer"], aliases: ["human", "operator"], file: "user.svg" },
  { id: "mobile-device", title: "Mobile Device", category: "client", tags: ["phone", "smartphone", "app"], aliases: ["mobile", "handset"], file: "mobile-device.svg" },
  { id: "web-application", title: "Web Application", category: "client", tags: ["browser", "frontend", "website"], aliases: ["webapp", "ui"], file: "web-application.svg" },
  { id: "api-service", title: "API Service", category: "service", tags: ["api", "backend", "endpoint"], aliases: ["microservice", "service"], file: "api-service.svg" },
  { id: "server", title: "Server", category: "compute", tags: ["host", "compute", "machine"], aliases: ["vm", "instance"], file: "server.svg" },
  { id: "database", title: "Database", category: "data", tags: ["sql", "postgres", "mysql"], aliases: ["db", "datastore"], file: "database.svg" },
  { id: "message-queue", title: "Message Queue", category: "messaging", tags: ["kafka", "rabbitmq", "broker"], aliases: ["queue", "event-bus"], file: "message-queue.svg" },
  { id: "object-storage", title: "Object Storage", category: "storage", tags: ["bucket", "files", "archive"], aliases: ["blob-storage", "data-lake"], file: "object-storage.svg" },
  { id: "cloud", title: "Cloud", category: "platform", tags: ["aws", "azure", "gcp"], aliases: ["cloud-platform"], file: "cloud.svg" },
  { id: "ai-model", title: "AI Model", category: "ai", tags: ["ml", "model", "inference", "training"], aliases: ["neural-network", "machine-learning"], file: "ai-model.svg" },
  { id: "iot-sensor", title: "IoT Sensor", category: "edge", tags: ["sensor", "esp32", "telemetry", "device"], aliases: ["iot-device", "embedded-device"], file: "iot-sensor.svg" },
  { id: "monitoring", title: "Monitoring", category: "observability", tags: ["telemetry", "metrics", "logs", "traces"], aliases: ["dashboard", "observability"], file: "monitoring.svg" },
];

const assets: readonly BundledAsset[] = Object.freeze(
  DEFINITIONS.map((definition) =>
    Object.freeze({
      id: definition.id,
      title: definition.title,
      category: definition.category,
      provider: "drawarch" as const,
      tags: Object.freeze([...definition.tags]),
      aliases: Object.freeze([...definition.aliases]),
      mediaType: "image/svg+xml" as const,
      license: "MIT" as const,
      source: "bundled" as const,
      svg: readFileSync(new URL(`./svg/${definition.file}`, import.meta.url), "utf8"),
    }),
  ),
);

export function listBundledAssets(): readonly BundledAsset[] {
  return assets;
}

export function getBundledAsset(id: string): BundledAsset | undefined {
  const normalized = id.trim().toLowerCase();
  return assets.find((asset) => asset.id === normalized);
}

export function searchBundledAssets(query: string): readonly BundledAsset[] {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return assets;
  return assets
    .map((asset) => {
      const exact = asset.id === terms.join("-") ? 100 : 0;
      const haystack = [asset.id, asset.title, asset.category, ...asset.tags, ...asset.aliases].join(" ").toLowerCase();
      const score = exact + terms.reduce((total, term) => total + (haystack.includes(term) ? 10 : 0), 0);
      return { asset, score };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.asset.id.localeCompare(right.asset.id))
    .map((candidate) => candidate.asset);
}
