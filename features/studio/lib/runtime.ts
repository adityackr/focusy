import type { SandpackStatus } from "@codesandbox/sandpack-react";

/** A runtime error reduced to the parts a learner can act on. */
export interface StudioRuntimeIssue {
  title: string;
  message: string;
  location: string | null;
}

/** Last state reported by the live Sandpack instance. */
export interface StudioRuntimeSnapshot {
  workspaceId: string;
  dependencySignature: string;
  status: SandpackStatus;
  issue: StudioRuntimeIssue | null;
}

export const EMPTY_STUDIO_RUNTIME_SNAPSHOT: StudioRuntimeSnapshot = {
  workspaceId: "",
  dependencySignature: "",
  status: "initial",
  issue: null,
};

type RuntimeErrorLike = {
  title?: string;
  message: string;
  path?: string;
  line?: number;
  column?: number;
};

/** Label for the Sandpack client state shown in the preview toolbar. */
export function runtimeStatusLabel(status: SandpackStatus): string {
  switch (status) {
    case "initial":
      return "Starting runtime…";
    case "idle":
      return "Runtime idle";
    case "running":
      return "Runtime active";
    case "timeout":
      return "Runtime timed out";
    case "done":
      return "Runtime stopped";
    default:
      return status;
  }
}

/**
 * True when the runtime needs a manual retry. Sandpack reports a timeout when
 * the hosted bundler cannot be reached or never finishes booting.
 */
export function isRuntimeUnavailable(status: SandpackStatus): boolean {
  return status === "timeout";
}

function errorLocation(error: RuntimeErrorLike): string | null {
  if (error.path) {
    const line = error.line ? `:${error.line}` : "";
    const column = error.line && error.column ? `:${error.column}` : "";
    return `${error.path}${line}${column}`;
  }
  if (error.line) {
    return `Line ${error.line}${error.column ? `, column ${error.column}` : ""}`;
  }
  return null;
}

/**
 * Normalizes a Sandpack error for display. Messages can be long bundler
 * output, so the caller renders them in a wrapping panel rather than a toast.
 */
export function describeRuntimeError(
  error: RuntimeErrorLike | null
): StudioRuntimeIssue | null {
  if (!error) return null;
  return {
    title: error.title?.trim() || "Compilation error",
    message: error.message.trim() || "The preview could not compile this project.",
    location: errorLocation(error),
  };
}
