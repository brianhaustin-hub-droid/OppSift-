import {
  runCollector,
  type CollectorDependencies,
} from "../../../collectors/node/src/index.js";
import type { IngestionRepository } from "./ingestion";
import {
  createCollectorApprovalAuthority,
  createCollectorSourceConnector as createSourceConnector,
  type CollectorIngestionOptions,
} from "./collector-source-connector";
import type { CollectorExecution } from "./collector-source-connector";

export {
  createCollectorApprovalAuthority,
  type CollectorIngestionOptions,
};

export type CollectorRuntimeDependencies = Omit<CollectorDependencies, "approvalAuthority">;

export function createCollectorSourceConnector(
  sourceId: string,
  repository: Pick<IngestionRepository, "getSourceForIngestion">,
  options: CollectorIngestionOptions,
  runtime: CollectorRuntimeDependencies,
) {
  const execute: CollectorExecution = (request, approvalAuthority, signal) =>
    runCollector(request, {
      ...runtime,
      approvalAuthority,
      signal,
    });
  return createSourceConnector(sourceId, repository, options, execute);
}
