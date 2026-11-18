export { AnalyticsView } from "./components/analytics-view";
export { AnalyticsSummaryWidget } from "./components/analytics-summary-widget";
export {
  useAnalyticsData,
  usePresenceActivity,
  useStudioAnalytics,
} from "./hooks/use-analytics";
export { continueLearning } from "./lib/progress-snapshot";
export { getAnalyticsSnapshot } from "./lib/analytics-store";
export type {
  ContinueCourse,
  ContinueLearning,
  ContinuePlaylist,
} from "./lib/progress-snapshot";
export {
  saveLearningGoals,
  startPresenceActivity,
  startVideoActivity,
  trackCourseCompleted,
  trackLessonCompleted,
} from "./lib/activity-tracker";
export {
  analyticsBackupHasData,
  collectAnalyticsBackup,
  restoreAnalyticsBackup,
} from "./lib/analytics-backup";
export type {
  AnalyticsRestoreMode,
  AnalyticsRestoreResult,
} from "./lib/analytics-backup";
export type {
  Achievement,
  ActivityKind,
  AnalyticsBackupData,
  AnalyticsData,
  AnalyticsEvent,
  AnalyticsSource,
  CourseProgressItem,
  DayActivity,
  GoalProgress,
  LearningGoals,
  LearningInsight,
  PeriodComparison,
  PeriodSummary,
  TrendPeriodDays,
} from "./types/analytics.types";
