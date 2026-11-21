export { ResourcesPanel } from "./components/resources-panel";
export { ResourcesView } from "./components/resources-view";
export { ResourceRow } from "./components/resource-row";
export {
  allResources,
  resourceCount,
  useAllResources,
  useCourseResources,
  usePlaylistResources,
  addTextResource,
  addFileResource,
  removeResource,
  removeResourcesForCourse,
  removeResourcesForPlaylist,
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
export { RESOURCE_KIND_LABELS } from "./lib/resource";
export type {
  Resource,
  ResourceKind,
  ResourceDraft,
  ResourceError,
  ResourceResult,
} from "./lib/resource";
