export {
  productArtifactTypes,
  markdownDocumentTypes,
  idPrefixByType,
  requiredBodySections,
  expectedFileName,
  isMarkdownDocumentType,
} from './artifact.js';
export type { ProductArtifactType, MarkdownDocumentType, ParsedArtifact } from './artifact.js';
export { checkRequiredBodySections } from './body-sections.js';
export { discoverChanges, loadChange } from './changes.js';
export type { ChangeOperations, LoadedChange, LoadedSlice } from './changes.js';
export { configSchemaId, defaultConfig, loadConfig, parseConfig } from './config.js';
export type { ConfigResult, ProductConfig } from './config.js';
export { codes, escalateWarnings, sortDiagnostics } from './diagnostics.js';
export type { Diagnostic, DiagnosticSeverity } from './diagnostics.js';
export { contentDigest, normalizeToLf } from './digest.js';
export { computeClosureFromSeeds } from './closure.js';
export {
  applyFilenameFixes,
  applyFilenameRecovery,
  discoverFixTempFiles,
  fixTempSuffix,
  planFilenameFixes,
  planFilenameRecovery,
  recoverFilenameFixes,
} from './fix-filenames.js';
export type {
  FilenameBlockReason,
  FilenameFix,
  FilenamePlan,
  FilenameRecovery,
  FilenameRecoveryPlan,
  RenameFs,
} from './fix-filenames.js';
export {
  describeAllKinds,
  describeKind,
  frontmatterTableHeader,
  renderKindMarkdownTable,
  renderKindText,
} from './frontmatter-reference.js';
export type { FieldDescriptor, FieldKind, KindDescriptor } from './frontmatter-reference.js';
export { gitHead, gitShow } from './git.js';
export { compileGraph, ownedTerms } from './graph.js';
export {
  checkHandoffClosure,
  computeClosure,
  generateHandoff,
  handoffSchemaId,
  handoffStatus,
  parseWorkItemRef,
} from './handoff.js';
export type {
  GeneratedHandoff,
  GenerateHandoffOptions,
  HandoffDocument,
  HandoffState,
  HandoffStatusReport,
  WorkItemRef,
} from './handoff.js';
export type { GraphNode, ProductGraph } from './graph.js';
export { analyzeImpact } from './impact.js';
export type { ImpactDirection, ImpactEntry, ImpactOptions, ImpactReport } from './impact.js';
export { inspectArtifact } from './inspect.js';
export type { InspectReport } from './inspect.js';
export { discoverModelFiles, loadArtifactFile, loadModel, toPosixRelative } from './model.js';
export type { LoadedArtifact, LoadedModel } from './model.js';
export {
  buildGeneratedOutputs,
  buildGraphJson,
  buildIndexJson,
  buildMermaid,
  buildTraceabilityJson,
  graphSchemaId,
  stableJson,
  writeGeneratedOutputs,
} from './outputs.js';
export type { GeneratedOutputs } from './outputs.js';
export {
  applyOverlay,
  validateChange,
  validateConcurrency,
  validateOpenQuestions,
  validateOperations,
} from './overlay.js';
export type { ChangeValidation } from './overlay.js';
export { parseArtifactDocument } from './parse.js';
export type { ParseResult } from './parse.js';
export { applyPromotion, modelSubdirByType, planPromotion } from './promote.js';
export type {
  CoverageEvidenceProvider,
  PlanPromotionOptions,
  PromotionAction,
  PromotionPlan,
  SliceEvidence,
} from './promote.js';
export { changesAffecting, handoffsReferencing, slicesReferencing } from './references.js';
export type { HandoffReference } from './references.js';
export { allowedTargets, extractEdges, relationshipSpecs } from './relationships.js';
export type { Edge, RelationshipSpec } from './relationships.js';
export { findRepositoryRoot, openRepository, validateBaseline } from './repository.js';
export type { BaselineValidation, ProductRepository } from './repository.js';
export { SchemaRegistry } from './schema-registry.js';
export type { RawSchema, YamlDocumentKind } from './schema-registry.js';
export { sliceAffects, sliceImplements, validateSlices } from './slices.js';
export { validateModel } from './validate.js';
export type { ValidateModelOptions } from './validate.js';
