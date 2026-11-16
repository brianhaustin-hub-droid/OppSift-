import type { CollectorFramework, CollectorRequest } from "./contract.js";

export type CollectorRegistration = {
  framework: CollectorFramework;
  runtime: "node" | "python";
  packageVersion: string;
  supportedFormats: readonly ("html" | "xml")[];
  execute: "crawlee-http" | "cheerio-static" | "scrapy-spider" | "scrapling-parser";
};

export class CollectorRegistry {
  private readonly registrations = new Map<CollectorFramework, CollectorRegistration>();

  register(registration: CollectorRegistration) {
    if (this.registrations.has(registration.framework)) {
      throw new Error(`Collector framework "${registration.framework}" is already registered.`);
    }
    this.registrations.set(registration.framework, registration);
  }

  resolve(request: CollectorRequest): CollectorRegistration {
    const registration = this.registrations.get(request.collectorFramework);
    if (
      !registration ||
      !registration.supportedFormats.includes(request.adapter.format)
    ) {
      throw new Error("No compatible collector runtime is registered for this source.");
    }
    return registration;
  }

  list() {
    return [...this.registrations.values()].map((registration) => ({ ...registration }));
  }
}

export function createDefaultCollectorRegistry() {
  const registry = new CollectorRegistry();
  registry.register({
    framework: "crawlee",
    runtime: "node",
    packageVersion: "3.18.2",
    supportedFormats: ["html", "xml"],
    execute: "crawlee-http",
  });
  registry.register({
    framework: "cheerio",
    runtime: "node",
    packageVersion: "1.2.0",
    supportedFormats: ["html", "xml"],
    execute: "cheerio-static",
  });
  registry.register({
    framework: "scrapy",
    runtime: "python",
    packageVersion: "2.x",
    supportedFormats: ["html", "xml"],
    execute: "scrapy-spider",
  });
  registry.register({
    framework: "scrapling",
    runtime: "python",
    packageVersion: "0.5.1",
    supportedFormats: ["html"],
    execute: "scrapling-parser",
  });
  return registry;
}
