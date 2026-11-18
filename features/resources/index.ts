export { ResourcesPanel } from "./components/resources-panel";
export {
  allResources,
  resourceCount,
  useAllResources,
  useCourseResources,
  addTextResource,
  addFileResource,
  removeResource,
  removeResourcesForCourse,
  RESOURCES_STORAGE_KEY,
} from "./lib/resource-store";
export {
  collectResourcesBackup,
  restoreResourcesBackup,
  countResourcesBackup,
  RESOURCES_BACKUP_SECTION_VERSION,
} from "./lib/resource-backup";
export type {
  ResourcesRestoreMode,
  ResourcesBackupData,
  ResourceBackupFile,
  ResourcesRestoreReport,
} from "./lib/resource-backup";
export type {
  Resource,
  ResourceKind,
  ResourceDraft,
  ResourceError,
  ResourceResult,
} from "./lib/resource";
