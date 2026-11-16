"use client";

import { useEffect, useState } from "react";
import {
  Award,
  BookCheck,
  Code2,
  Flame,
  GraduationCap,
  Target,
  Timer,
  Trophy,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Progress } from "@/shared/ui/progress";
import { goalValueLabel } from "../lib/analytics-selectors";
import type {
  Achievement,
  GoalProgress,
  LearningGoals,
} from "../types/analytics.types";

type GoalForm = Record<keyof LearningGoals, string>;

const GOAL_FIELDS: {
  key: keyof LearningGoals;
  label: string;
  placeholder: string;
}[] = [
  { key: "dailyMinutes", label: "Daily learning (minutes)", placeholder: "30" },
  { key: "weeklyMinutes", label: "Weekly learning (minutes)", placeholder: "180" },
  { key: "weeklyLessons", label: "Weekly lessons", placeholder: "5" },
  { key: "monthlyCourses", label: "Monthly courses", placeholder: "1" },
  { key: "weeklyStudioMinutes", label: "Weekly Studio (minutes)", placeholder: "60" },
];

function formFromGoals(goals: LearningGoals): GoalForm {
  return {
    dailyMinutes: goals.dailyMinutes?.toString() ?? "",
    weeklyMinutes: goals.weeklyMinutes?.toString() ?? "",
    weeklyLessons: goals.weeklyLessons?.toString() ?? "",
    monthlyCourses: goals.monthlyCourses?.toString() ?? "",
    weeklyStudioMinutes: goals.weeklyStudioMinutes?.toString() ?? "",
  };
}

function goalsFromForm(form: GoalForm): LearningGoals {
  const read = (value: string): number | null => {
    const n = Number(value.trim());
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  };
  return {
    dailyMinutes: read(form.dailyMinutes),
    weeklyMinutes: read(form.weeklyMinutes),
    weeklyLessons: read(form.weeklyLessons),
    monthlyCourses: read(form.monthlyCourses),
    weeklyStudioMinutes: read(form.weeklyStudioMinutes),
  };
}

export function LearningGoalsCard({
  goals,
  progress,
  onSave,
}: {
  goals: LearningGoals;
  progress: GoalProgress[];
  onSave: (goals: LearningGoals) => void;
}) {
  const [form, setForm] = useState<GoalForm>(() => formFromGoals(goals));
  const [editing, setEditing] = useState(!progress.length);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm(formFromGoals(goals));
  }, [goals]);

  function handleSave() {
    onSave(goalsFromForm(form));
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="size-4" /> Learning goals
        </CardTitle>
        {progress.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setEditing((value) => !value)}
          >
            {editing ? "Close" : "Edit goals"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {progress.length > 0 && (
          <ul className="space-y-3">
            {progress.map((goal) => (
              <li key={goal.key}>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium">{goal.label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {goalValueLabel(goal)}
                  </span>
                </div>
                <Progress
                  value={goal.percent}
                  className={cn(goal.percent >= 100 && "[&>div]:bg-success")}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {goal.percent >= 100
                    ? "Goal reached — nice work."
                    : `${goal.percent}% complete · ${goal.remaining} ${goal.unit} to go`}
                </p>
              </li>
            ))}
          </ul>
        )}

        {editing && (
          <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">
              Optional. Leave a field blank to skip that target. Weeks run Monday–Sunday.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {GOAL_FIELDS.map((field) => (
                <div key={field.key} className="space-y-1">
                  <label
                    htmlFor={`goal-${field.key}`}
                    className="text-[11px] font-medium text-muted-foreground"
                  >
                    {field.label}
                  </label>
                  <Input
                    id={`goal-${field.key}`}
                    type="number"
                    min={1}
                    inputMode="numeric"
                    placeholder={field.placeholder}
                    value={form[field.key]}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                    className="h-9"
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" onClick={handleSave}>
                Save goals
              </Button>
              {saved && <span className="text-xs text-muted-foreground">Saved</span>}
            </div>
          </div>
        )}

        {progress.length === 0 && !editing && (
          <p className="text-xs text-muted-foreground">
            Set a target to track progress here.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const ACHIEVEMENT_ICONS = {
  lesson: BookCheck,
  course: GraduationCap,
  hours: Timer,
  lessons: Award,
  streak: Flame,
  studio: Code2,
} satisfies Record<Achievement["icon"], React.ComponentType<{ className?: string }>>;

export function AchievementsCard({
  achievements,
}: {
  achievements: Achievement[];
}) {
  const unlocked = achievements.filter((achievement) => achievement.unlocked).length;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="size-4" /> Achievements
        </CardTitle>
        <span className="text-xs text-muted-foreground tabular-nums">
          {unlocked}/{achievements.length}
        </span>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {achievements.map((achievement) => {
            const Icon = ACHIEVEMENT_ICONS[achievement.icon];
            return (
              <li
                key={achievement.id}
                title={achievement.description}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-2.5 py-2 transition-colors",
                  achievement.unlocked
                    ? "border-primary/30 bg-primary/5"
                    : "opacity-55"
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg",
                    achievement.unlocked
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold">{achievement.label}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {achievement.unlocked ? "Unlocked" : achievement.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Achievements are optional markers, not a score.
        </p>
      </CardContent>
    </Card>
  );
}
