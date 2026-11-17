"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Clock3,
  Database,
  HardDrive,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";
import {
  backupAgeLabel,
  collectStorageSnapshot,
  formatBytes,
  type BackupStatus,
  type StorageSnapshot,
} from "../lib/storage-usage";

function backupBadge(status: BackupStatus): {
  label: string;
  variant: "default" | "secondary" | "outline";
} {
  switch (status.state) {
    case "never":
      return { label: "No backup yet", variant: "outline" };
    case "changed":
      return {
        label: `${status.itemsSince} new item${status.itemsSince === 1 ? "" : "s"}`,
        variant: "secondary",
      };
    case "current":
      return { label: "No new items", variant: "secondary" };
    default:
      return { label: "Nothing saved yet", variant: "secondary" };
  }
}

function backupDescription(backup: BackupStatus): string {
  switch (backup.state) {
    case "empty":
      return "Nothing is saved in this browser yet. Playlists, notes and Studio projects will show up here once you add them.";
    case "never":
      return `${backup.itemsNow} item${backup.itemsNow === 1 ? "" : "s"} saved here ${backup.itemsNow === 1 ? "has" : "have"} never been backed up. Use Backup & restore above to download a copy.`;
    case "changed":
      return `Last backup ${backupAgeLabel(backup.daysSince)}, with ${backup.itemsAtBackup} item${backup.itemsAtBackup === 1 ? "" : "s"}. ${backup.itemsSince} new item${backup.itemsSince === 1 ? " has" : "s have"} been added since — download a fresh copy above.`;
    default:
      return `Last backup ${backupAgeLabel(backup.daysSince)}, with ${backup.itemsAtBackup} item${backup.itemsAtBackup === 1 ? "" : "s"}. Nothing new has been added since.`;
  }
}

function formatWhen(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function percentLabel(percent: number | null): string {
  if (percent === null) return "unknown";
  if (percent > 0 && percent < 1) return "<1%";
  return `${percent.toFixed(1)}%`;
}

function StorageStat({
  value,
  label,
  hint,
}: {
  value: string;
  label: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-muted/30 p-3">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-xs font-medium">{label}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

/**
 * Read-only view of what Focusy keeps in this browser: origin storage usage,
 * IndexedDB (Studio files), a localStorage breakdown by feature, and whether
 * the last backup still matches the library. No data is changed or uploaded.
 */
export function StorageCard() {
  const [snapshot, setSnapshot] = useState<StorageSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSnapshot(await collectStorageSnapshot());
    } catch {
      setError("Couldn't measure storage in this browser.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const databaseCount = snapshot?.indexedDb.databases.length ?? 0;
  const badge = snapshot ? backupBadge(snapshot.backup) : null;
  const lastBackup = snapshot ? formatWhen(snapshot.backup.lastBackupAt) : null;
  const measuredAt = snapshot
    ? new Date(snapshot.measuredAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const usedGroups =
    snapshot?.localStorage.groups.filter((group) => group.bytes > 0) ?? [];

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="size-4" /> Data &amp; storage
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto text-muted-foreground"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw className={loading ? "size-3.5 animate-spin" : "size-3.5"} />
            {loading ? "Measuring…" : "Refresh"}
          </Button>
        </CardTitle>
        <CardDescription>
          Everything Focusy saves stays in this browser. See how much space it
          uses, what is stored in IndexedDB, and when your last backup was taken.
          Nothing here is uploaded or deleted.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {!snapshot && !error && (
          <p className="text-sm text-muted-foreground">Measuring this browser…</p>
        )}

        {snapshot && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StorageStat
                value={formatBytes(snapshot.browser.usage)}
                label="Browser storage"
                hint={
                  snapshot.browser.supported
                    ? `of ${formatBytes(snapshot.browser.quota)} available`
                    : "not reported by this browser"
                }
              />
              <StorageStat
                value={formatBytes(snapshot.localStorage.bytes)}
                label="localStorage"
                hint={`${snapshot.localStorage.entries} key${snapshot.localStorage.entries === 1 ? "" : "s"}`}
              />
              <StorageStat
                value={formatBytes(snapshot.indexedDb.bytes)}
                label="IndexedDB"
                hint={
                  snapshot.indexedDb.supported
                    ? `${snapshot.indexedDb.records} record${snapshot.indexedDb.records === 1 ? "" : "s"} · ${databaseCount} database${databaseCount === 1 ? "" : "s"}`
                    : "per-database size unavailable"
                }
              />
              <StorageStat
                value={
                  snapshot.backup.lastBackupAt
                    ? backupAgeLabel(snapshot.backup.daysSince)
                    : "Never"
                }
                label="Last backup"
                hint={
                  snapshot.backup.lastBackupAt
                    ? `${snapshot.backup.itemsAtBackup} item${snapshot.backup.itemsAtBackup === 1 ? "" : "s"} then`
                    : "download one above"
                }
              />
            </div>

            {snapshot.browser.supported && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium">
                    <HardDrive className="size-3.5 text-muted-foreground" />
                    Browser storage used
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatBytes(snapshot.browser.usage)} /{" "}
                    {formatBytes(snapshot.browser.quota)} ·{" "}
                    {percentLabel(snapshot.browser.percent)}
                  </span>
                </div>
                <Progress value={snapshot.browser.percent ?? 0} />
                <p className="text-[11px] text-muted-foreground">
                  Includes localStorage, IndexedDB and browser caches for this
                  site.
                  {snapshot.browser.persisted === true &&
                    " This site's storage is marked persistent."}
                  {snapshot.browser.persisted === false &&
                    " The browser may clear local data under storage pressure — keep occasional backups."}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">localStorage by feature</h3>
                <span className="text-xs text-muted-foreground">
                  {formatBytes(snapshot.localStorage.bytes)} total
                </span>
              </div>
              {!snapshot.localStorage.available ? (
                <p className="text-sm text-muted-foreground">
                  This browser doesn&apos;t expose localStorage.
                </p>
              ) : usedGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No localStorage entries yet.
                </p>
              ) : (
                <ul className="divide-y rounded-xl border text-sm">
                  {usedGroups.map((group) => (
                    <li
                      key={group.id}
                      className="flex items-baseline gap-3 px-3 py-2"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{group.label}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {group.detail}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {group.entries} key{group.entries === 1 ? "" : "s"}
                      </span>
                      <span className="w-16 shrink-0 text-right font-mono text-xs tabular-nums">
                        {formatBytes(group.bytes)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[11px] text-muted-foreground">
                Sizes are approximate — browsers count storage differently.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">IndexedDB</h3>
              {!snapshot.indexedDb.available ? (
                <p className="text-sm text-muted-foreground">
                  This browser doesn&apos;t expose IndexedDB. Studio projects
                  can&apos;t be saved here.
                </p>
              ) : !snapshot.indexedDb.supported ? (
                <p className="text-sm text-muted-foreground">
                  This browser doesn&apos;t list per-database sizes. IndexedDB
                  storage is still included in the browser total above.
                </p>
              ) : snapshot.indexedDb.error ? (
                <p className="text-sm text-muted-foreground">
                  {snapshot.indexedDb.error}
                </p>
              ) : snapshot.indexedDb.databases.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No IndexedDB data yet. Studio project files appear here once
                  you create a project.
                </p>
              ) : (
                <ul className="divide-y rounded-xl border text-sm">
                  {snapshot.indexedDb.databases.map((database) => (
                    <li key={database.name} className="px-3 py-2">
                      <div className="flex items-baseline gap-3">
                        <span className="min-w-0 flex-1 font-mono text-xs">
                          {database.name}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {database.records} record
                          {database.records === 1 ? "" : "s"}
                        </span>
                        <span className="w-16 shrink-0 text-right font-mono text-xs tabular-nums">
                          {formatBytes(database.bytes)}
                        </span>
                      </div>
                      {database.stores.length > 0 && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {database.stores
                            .map(
                              (store) =>
                                `${store.name}${store.error ? " (unreadable)" : ""}`,
                            )
                            .join(", ")}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-1.5 rounded-xl border bg-muted/30 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <Clock3 className="size-4 text-muted-foreground" /> Backup
                  status
                </span>
                {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
                {lastBackup && (
                  <span className="text-xs text-muted-foreground">
                    {lastBackup}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {backupDescription(snapshot.backup)}
              </p>
            </div>

            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
              All of this data lives on this device, with no Focusy account or
              server. Reminder settings, the API key and player preferences
              aren&apos;t in backups by design.
              {measuredAt && ` Measured at ${measuredAt}.`}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
