export { StudioLessonPanel } from "./components/studio-lesson-panel";
export { StudioPrototype } from "./components/studio-prototype";
export {
  collectStudioBackup,
  restoreStudioBackup,
} from "./lib/studio-backup";
export { STUDIO_TEMPLATES, STUDIO_TEMPLATE_ORDER } from "./lib/templates";
export {
  DEFAULT_STUDIO_TEMPLATE,
  changeWorkspaceTemplate,
  createWorkspace,
  deleteWorkspace,
  ensureWorkspaceForSource,
  isStudioStorageAvailable,
  loadLastWorkspace,
  loadWorkspace,
  loadWorkspaceForSource,
  renameWorkspace,
  saveWorkspace,
} from "./lib/workspaces";
export {
  sourceKeyForSource,
  studioSourceForCourse,
  studioSourceForPlaylistVideo,
  studioSourceForVideo,
} from "./lib/workspace-utils";
export {
  selectWorkspaceMetaBySourceKey,
  selectWorkspaceMetaList,
  selectWorkspaceMetasBySourceKey,
  useStudioWorkspaces,
} from "./store/studio-store";
export type {
  StudioBackupData,
  StudioRestoreMode,
  StudioRestoreReport,
} from "./lib/studio-backup";
export type {
  StudioError,
  StudioErrorCode,
  StudioFile,
  StudioResult,
  StudioSource,
  StudioTemplate,
  StudioWorkspace,
  StudioWorkspaceMeta,
} from "./types/studio.types";
