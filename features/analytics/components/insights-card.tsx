"use client";

import { Lightbulb, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import type { LearningInsight } from "../types/analytics.types";

export function InsightsCard({ insights }: { insights: LearningInsight[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4" /> Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="flex items-start gap-3 rounded-xl border border-dashed px-3 py-4">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Insights appear once there is enough history to compare — usually after a
              couple of learning days. Nothing is guessed from incomplete data.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {insights.map((insight) => (
              <li
                key={insight.id}
                className={cn(
                  "rounded-xl border px-3 py-2",
                  insight.tone === "positive" && "border-success/30 bg-success/5",
                  insight.tone === "nudge" && "border-primary/25 bg-primary/5",
                  insight.tone === "neutral" && "bg-muted/20"
                )}
              >
                <p className="text-xs font-semibold">{insight.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{insight.text}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
