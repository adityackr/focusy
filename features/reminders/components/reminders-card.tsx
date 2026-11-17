"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  notificationState,
  requestNotificationPermission,
  showReminderNotification,
  type NotificationState,
} from "../lib/notifications";
import { REMINDER_TAG, normalizeReminderTime } from "../lib/reminders";
import {
  updateReminderSettings,
  useReminderSettings,
} from "../lib/reminder-store";

function permissionLabel(permission: NotificationState): string {
  switch (permission) {
    case "granted":
      return "Allowed";
    case "denied":
      return "Blocked";
    case "unsupported":
      return "Unsupported";
    default:
      return "Not asked yet";
  }
}

/**
 * Settings for optional learning reminders. Turning them on asks the browser
 * for notification permission; the reminder itself is checked locally while a
 * Focusy tab is open.
 */
export function RemindersCard() {
  const settings = useReminderSettings();
  const [permission, setPermission] =
    useState<NotificationState>("unsupported");
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    setPermission(notificationState());
  }, []);

  async function handleEnabled(next: boolean) {
    if (!next) {
      updateReminderSettings({ enabled: false });
      return;
    }

    const current = notificationState();
    if (current === "unsupported") {
      toast.error("This browser doesn't support notifications.");
      return;
    }
    if (current === "denied") {
      toast.error(
        "Notifications are blocked for this site. Allow them in your browser settings first.",
      );
      return;
    }

    let effective: NotificationState = current;
    if (current === "default") {
      setAsking(true);
      effective = await requestNotificationPermission();
      setPermission(effective);
      setAsking(false);
    }
    if (effective !== "granted") {
      toast.error("Reminders need notification permission to appear.");
      return;
    }

    updateReminderSettings({ enabled: true });
    toast.success("Daily learning reminders are on");
  }

  async function handleAllow() {
    setAsking(true);
    const next = await requestNotificationPermission();
    setPermission(next);
    setAsking(false);
    if (next === "granted" && !settings.enabled) {
      updateReminderSettings({ enabled: true });
      toast.success("Daily learning reminders are on");
    } else if (next !== "granted") {
      toast.error("Reminders need notification permission to appear.");
    }
  }

  function handleTest() {
    const shown = showReminderNotification({
      title: "Focusy reminders are on",
      body: `You'll get a nudge after ${settings.time} when a lesson is waiting or today's goal isn't met.`,
      href: "/library",
      tag: REMINDER_TAG,
    });
    if (shown) toast.success("Test notification sent");
    else toast.error("Couldn't show a notification. Check your browser settings.");
  }

  const nothingSelected = !settings.unfinishedLessons && !settings.studyGoals;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BellRing className="size-4" /> Learning reminders
          <Badge variant="secondary" className="ml-auto">
            Optional
          </Badge>
        </CardTitle>
        <CardDescription>
          Get a browser notification when a lesson is waiting or today&apos;s
          study goal isn&apos;t met. Focusy has no server, so reminders are
          checked while a Focusy tab is open — at most once a day.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <label className="flex cursor-pointer items-start gap-2.5">
          <Checkbox
            className="mt-0.5"
            checked={settings.enabled}
            disabled={asking}
            onCheckedChange={(checked) => void handleEnabled(checked)}
          />
          <span className="text-sm">
            <span className="font-medium">Enable daily reminders</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              No email, no account — just a local browser notification.
            </span>
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="reminder-time" className="text-sm font-normal">
              Remind me after
            </Label>
            <Input
              id="reminder-time"
              type="time"
              value={settings.time}
              disabled={!settings.enabled}
              onChange={(event) => {
                const time = normalizeReminderTime(event.target.value);
                if (time) updateReminderSettings({ time });
              }}
              className="h-9 w-32 font-mono"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            Local time · one reminder per day
          </span>
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-1 text-xs font-medium text-muted-foreground">
            Include
          </legend>
          <label className="flex items-center gap-2.5 text-sm">
            <Checkbox
              checked={settings.unfinishedLessons}
              onCheckedChange={(checked) =>
                updateReminderSettings({ unfinishedLessons: checked })
              }
            />
            Unfinished lessons — playlists and courses you haven&apos;t
            completed
          </label>
          <label className="flex items-center gap-2.5 text-sm">
            <Checkbox
              checked={settings.studyGoals}
              onCheckedChange={(checked) =>
                updateReminderSettings({ studyGoals: checked })
              }
            />
            Today&apos;s study goal — only while it isn&apos;t met yet
          </label>
          {nothingSelected && (
            <p className="text-xs text-destructive">
              Choose at least one reminder, otherwise nothing will be sent.
            </p>
          )}
        </fieldset>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 p-3 text-xs">
          <Bell className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 text-muted-foreground">
            Browser notifications:{" "}
            <span className="font-medium text-foreground">
              {permissionLabel(permission)}
            </span>
            {permission === "denied" &&
              " — allow them for this site in your browser settings, then reload."}
            {permission === "unsupported" &&
              " — this browser can't show notifications."}
            {permission === "default" &&
              " — allow them to receive reminders."}
          </span>
          {permission === "granted" && (
            <Button type="button" variant="outline" size="sm" onClick={handleTest}>
              Send a test
            </Button>
          )}
          {permission === "default" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleAllow()}
              disabled={asking}
            >
              {asking ? "Asking…" : "Allow notifications"}
            </Button>
          )}
        </div>

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
          Reminder settings stay on this device and aren&apos;t included in
          backups. Closing every Focusy tab pauses reminders until you come
          back.
        </p>
      </CardContent>
    </Card>
  );
}
