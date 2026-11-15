"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SandpackConsole,
  SandpackPreview,
  SandpackProvider,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { useTheme } from "next-themes";
import { RotateCcw, RefreshCw, Terminal, TriangleAlert } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  describeRuntimeError,
  isRuntimeUnavailable,
  runtimeStatusLabel,
  type StudioRuntimeSnapshot,
} from "../lib/runtime";
import type {
  StudioFile,
  StudioTemplateDefinition,
} from "../types/studio.types";

/**
 * Sandpack's incremental file updates can leave a preview client waiting for
 * an initialization message that already fired. Rebuild the runtime from a
 * file snapshot instead, debounced so typing does not trigger a build per key.
 */
function useRuntimeSnapshot(files: StudioFile[]) {
  const [snapshot, setSnapshot] = useState(files);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (snapshot === files) return;
    const timer = window.setTimeout(() => {
      setSnapshot(files);
      setVersion((value) => value + 1);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [files, snapshot]);

  const rebuild = () => {
    setSnapshot(files);
    setVersion((value) => value + 1);
  };

  return { snapshot, version, rebuild };
}

/** Reports Sandpack's real status to the package manager without owning UI. */
function RuntimeObserver({
  workspaceId,
  dependencySignature,
  onChange,
}: {
  workspaceId: string;
  dependencySignature: string;
  onChange: (snapshot: StudioRuntimeSnapshot) => void;
}) {
  const { sandpack } = useSandpack();

  useEffect(() => {
    onChange({
      workspaceId,
      dependencySignature,
      status: sandpack.status,
      issue: describeRuntimeError(sandpack.error),
    });
  }, [
    workspaceId,
    dependencySignature,
    sandpack.status,
    sandpack.error,
    onChange,
  ]);

  return null;
}

function RuntimeStatus() {
  const { sandpack } = useSandpack();
  const failed = Boolean(sandpack.error);
  const unavailable = isRuntimeUnavailable(sandpack.status);
  const label = failed ? "Preview error" : runtimeStatusLabel(sandpack.status);

  return (
    <div className="flex min-w-0 items-center gap-2 text-xs">
      <span
        className={
          failed || unavailable
            ? "size-2 shrink-0 rounded-full bg-destructive"
            : sandpack.status === "running"
              ? "size-2 shrink-0 rounded-full bg-success"
              : "size-2 shrink-0 animate-pulse rounded-full bg-primary"
        }
        aria-hidden
      />
      <span className="truncate font-medium">{label}</span>
    </div>
  );
}

function RuntimeToolbar({
  consoleOpen,
  onToggleConsole,
  onRefresh,
  onRestart,
}: {
  consoleOpen: boolean;
  onToggleConsole: () => void;
  onRefresh: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-2">
      <RuntimeStatus />
      <div className="ml-auto flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs"
          onClick={onRefresh}
        >
          <RefreshCw className="size-3.5" />
          Refresh
        </Button>
        <Button
          type="button"
          variant={consoleOpen ? "secondary" : "ghost"}
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs"
          onClick={onToggleConsole}
          aria-pressed={consoleOpen}
        >
          <Terminal className="size-3.5" />
          Console
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs"
          onClick={onRestart}
        >
          <RotateCcw className="size-3.5" />
          Restart
        </Button>
      </div>
    </div>
  );
}

function RuntimeUnavailable() {
  const { sandpack } = useSandpack();
  if (!isRuntimeUnavailable(sandpack.status)) return null;

  return (
    <div
      role="alert"
      className="flex shrink-0 items-start gap-2 border-b border-destructive/30 bg-destructive/5 px-3 py-2 text-xs"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
      <p className="min-w-0 flex-1 text-muted-foreground">
        The hosted runtime did not respond. Check your connection, then try
        again — your files are safe in this browser.
      </p>
    </div>
  );
}

function RuntimeErrorPanel({ onShowConsole }: { onShowConsole: () => void }) {
  const { sandpack } = useSandpack();
  const issue = describeRuntimeError(sandpack.error);
  if (!issue) return null;

  return (
    <div
      role="alert"
      className="flex max-h-36 shrink-0 items-start gap-2 overflow-auto border-t border-destructive/30 bg-destructive/5 px-3 py-2 text-xs"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium text-destructive">{issue.title}</p>
        <p className="break-words font-mono text-[11px] leading-relaxed text-foreground/90">
          {issue.message}
        </p>
        {issue.location ? (
          <p className="truncate font-mono text-[11px] text-muted-foreground">
            {issue.location}
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-[11px]"
        onClick={onShowConsole}
      >
        Console
      </Button>
    </div>
  );
}

function RuntimePanel({
  consoleOpen,
  onToggleConsole,
  onRefresh,
  onRestart,
}: {
  consoleOpen: boolean;
  onToggleConsole: () => void;
  onRefresh: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <RuntimeToolbar
        consoleOpen={consoleOpen}
        onToggleConsole={onToggleConsole}
        onRefresh={onRefresh}
        onRestart={onRestart}
      />
      <RuntimeUnavailable />
      <div className="min-h-0 flex-1">
        <SandpackPreview
          className="h-full"
          style={{ height: "100%" }}
          showOpenInCodeSandbox={false}
          showRefreshButton={false}
          showRestartButton={false}
        />
      </div>
      <RuntimeErrorPanel onShowConsole={onToggleConsole} />
      {consoleOpen ? (
        <div className="h-40 shrink-0 border-t">
          <SandpackConsole
            className="h-full"
            showHeader={false}
            showSyntaxError
            showResetConsoleButton={false}
            showRestartButton={false}
            resetOnPreviewRestart
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Sandpack side of Studio. The provider is keyed per workspace, template,
 * dependency set and file snapshot, so dependency changes and debounced edits
 * each get a clean runtime with the latest files.
 */
export function StudioRuntime({
  workspaceId,
  definition,
  files,
  dependencies,
  onStateChange,
}: {
  workspaceId: string;
  definition: StudioTemplateDefinition;
  files: StudioFile[];
  dependencies: Record<string, string>;
  onStateChange?: (snapshot: StudioRuntimeSnapshot) => void;
}) {
  const { resolvedTheme } = useTheme();
  const [consoleOpen, setConsoleOpen] = useState(false);
  const { snapshot, version, rebuild } = useRuntimeSnapshot(files);
  const dependenciesKey = JSON.stringify(dependencies);

  const runtimeFiles = useMemo(
    () =>
      Object.fromEntries(
        snapshot.map((file) => [file.path, { code: file.content }])
      ),
    [snapshot]
  );
  const customSetup = useMemo(
    () => ({ dependencies }),
    // The provider is remounted whenever the dependency key changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dependenciesKey]
  );

  return (
    <SandpackProvider
      key={`${workspaceId}:${definition.id}:${dependenciesKey}:${version}`}
      template={definition.sandpackTemplate}
      files={runtimeFiles}
      customSetup={customSetup}
      theme={resolvedTheme === "light" ? "light" : "dark"}
      options={{
        autorun: true,
        activeFile: definition.entryFile,
      }}
      className="h-full"
      // Sandpack's own stylesheet wins over Tailwind's h-full on .sp-wrapper,
      // so set the height inline or the preview collapses inside its card.
      style={{ height: "100%" }}
    >
      {onStateChange ? (
        <RuntimeObserver
          workspaceId={workspaceId}
          dependencySignature={dependenciesKey}
          onChange={onStateChange}
        />
      ) : null}
      <RuntimePanel
        consoleOpen={consoleOpen}
        onToggleConsole={() => setConsoleOpen((value) => !value)}
        onRefresh={rebuild}
        onRestart={rebuild}
      />
    </SandpackProvider>
  );
}
