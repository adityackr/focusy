export { SettingsView } from "./components/settings-view";
export {
  collectSettingsBackup,
  normalizeSettingsBackup,
  restoreSettingsBackup,
  SETTINGS_BACKUP_SECTION_VERSION,
} from "./lib/settings-backup";
export type {
  SettingsBackupSection,
  SettingsRestoreMode,
} from "./lib/settings-backup";
