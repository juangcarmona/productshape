export {
  productArtifactTypes,
  markdownDocumentTypes,
  idPrefixByType,
  idPrefixFor,
  modelSubdirByType,
  requiredBodySections,
  expectedFileName,
  isMarkdownDocumentType,
  isProductArtifactType,
} from './artifact.js';
export type { ProductArtifactType, MarkdownDocumentType, ParsedArtifact } from './artifact.js';
export { appliedArtifacts, executeApply, planApply, preflightApply, withStatus } from './apply.js';
export type {
  ApplyAction,
  ApplyPlan,
  PlanApplyOptions,
  ProductDiff,
  ProductDiffEntry,
  ProductDiffKind,
} from './apply.js';
export { checkRequiredBodySections } from './body-sections.js';
export { discoverChanges, loadChange } from './changes.js';
export type { ChangeOperations, LoadedChange } from './changes.js';
export { configSchemaId, defaultConfig, loadConfig, parseConfig } from './config.js';
export type { ConfigResult, ProductConfig } from './config.js';
export { codes, compareCodeUnits, escalateWarnings, sortDiagnostics } from './diagnostics.js';
export type { Diagnostic, DiagnosticSeverity } from './diagnostics.js';
export {
  buildArtifactIndex,
  buildCitationIndex,
  computeAffectedCitations,
  discoverConsumerDocs,
  emitCitation,
  parseCitations,
  scanCitations,
  verifyCitation,
  verifyCitations,
} from './citations.js';
export type {
  AffectedCitation,
  CitationRecord,
  CitationStatus,
  CitationVerification,
  CiteOptions,
} from './citations.js';
export { parseDriftFile, parseDriftMarkers, scanDriftMarkers } from './drift.js';
export type { DriftRecord } from './drift.js';
export {
  classifyConsumerDocument,
  classifyConsumerDocuments,
  extractScopeDeclaration,
} from './consumers.js';
export type {
  ClassifiedConsumerDocument,
  ConsumerDocument,
  ConsumerDocumentEnumeration,
  ConsumerScopeState,
  EnumerateConsumerDocumentsOptions,
  ScopeDeclaration,
  ScopeDeclarationValue,
  SddIntegrationProvider,
} from './consumers.js';
export { contentDigest, contentDigestBytes, normalizeToLf } from './digest.js';
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
export { gitHead, gitShow, gitShowBytes } from './git.js';
export { compileGraph, ownedTerms } from './graph.js';
export type { GraphNode, ProductGraph } from './graph.js';
export { analyzeImpact } from './impact.js';
export type { ImpactDirection, ImpactEntry, ImpactOptions, ImpactReport } from './impact.js';
export { inspectArtifact } from './inspect.js';
export type { InspectReport } from './inspect.js';
export { discoverModelFiles, loadArtifactFile, loadModel, toPosixRelative } from './model.js';
export type { LoadedArtifact, LoadedModel } from './model.js';
export {
  applyOverlay,
  validateChange,
  validateConcurrency,
  validateOpenQuestions,
  validateOperations,
} from './overlay.js';
export type { ChangeValidation } from './overlay.js';
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
  defaultRecoveryBrief,
  findingClassifications,
  isValidSessionId,
  nextSequentialId,
  parseRecoveryBrief,
  readRecoverySessionFiles,
  recoveryBriefSchemaId,
  recoveryChangeId,
  recoveryCoverageSchemaId,
  recoveryFormatVersion,
  recoveryInventorySchemaId,
  recoveryLeadsSchemaId,
  recoveryQuestionsSchemaId,
  recoveryStateSchemaId,
  RecoveryStateError,
  sessionFileNames,
  validateRecoveryInventory,
  validateRecoveryLeadsFile,
  validateRecoveryQuestionsFile,
  validateRecoveryState,
  validateSessionConsistency,
  writeJsonAtomic,
  writeRecoverySessionFiles,
} from './recovery.js';
export type {
  EvidenceFinding,
  EvidenceItem,
  EvidenceKind,
  EvidenceStatus,
  FamilyProbe,
  FindingClassification,
  LeadKind,
  LoadedRecoverySession,
  ModelSnapshotEntry,
  RecoveryBrief,
  RecoveryBriefResult,
  RecoveryInventory,
  RecoveryLead,
  RecoveryLeadsFile,
  RecoveryQuestion,
  RecoveryQuestionsFile,
  RecoveryState,
  SecondaryEvidencePolicy,
  ValidationRecord,
} from './recovery.js';
export {
  addEvidence,
  addLead,
  addQuestion,
  answerQuestion,
  assertInitialRecoveryIsLegitimate,
  buildRecoveryReport,
  checkRecoverySession,
  computeCoverage,
  deferQuestion,
  discoverRepositoryEvidence,
  findEvidence,
  listRecoverySessions,
  loadRecoverySession,
  markEvidence,
  markFamilyProbe,
  nextBatch,
  RecoveryUsageError,
  resolveLead,
  resolveSessionId,
  scanCandidates,
  sessionDirRel,
  snapshotEvidence,
  startRecoverySession,
  writeRecoveryReport,
} from './recovery-session.js';
export type {
  AddEvidenceOptions,
  CandidateArtifact,
  CompletionCriteria,
  MarkEvidenceOptions,
  RecoveryCheckResult,
  RecoveryClock,
  RecoveryCoverage,
  RecoveryIssue,
  StartRecoveryOptions,
} from './recovery-session.js';
export { escapeHtml, renderMarkdown } from './markdown.js';
export { buildSnapshotHtml } from './snapshot.js';
export { parseArtifactDocument } from './parse.js';
export type { ParseResult } from './parse.js';
export { allowedTargets, extractEdges, relationshipSpecs } from './relationships.js';
export type { Edge, RelationshipSpec } from './relationships.js';
export { findRepositoryRoot, openRepository, validateBaseline } from './repository.js';
export type { BaselineValidation, ProductRepository } from './repository.js';
export { SchemaRegistry } from './schema-registry.js';
export type { RawSchema } from './schema-registry.js';
export { validateModel } from './validate.js';
export type { ValidateModelOptions } from './validate.js';
