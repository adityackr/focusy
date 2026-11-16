export { AnalyticsView } from "./components/analytics-view";
export { AnalyticsSummaryWidget } from "./components/analytics-summary-widget";
export {
  useAnalyticsData,
  usePresenceActivity,
  useStudioAnalytics,
} from "./hooks/use-analytics";
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
