import { normalizeFilePath } from "./file-utils";
import type {
  StudioFile,
  StudioResult,
  StudioWorkspace,
} from "../types/studio.types";

function invalid(message: string): StudioResult<never> {
  return { ok: false, error: { code: "invalid", message } };
}

/** Reject a path that would make one path both a file and a folder. */
function pathConflict(
  files: StudioFile[],
  path: string,
  ignorePath?: string
): string | null {
  for (const file of files) {
    if (file.path === ignorePath) continue;
    if (file.path === path) return `A file already exists at ${path}.`;
    if (file.path.startsWith(`${path}/`)) {
      return `"${path}" is already used as a folder.`;
    }
    if (path.startsWith(`${file.path}/`)) {
      return `"${file.path}" is a file, so it can't also be a folder.`;
    }
  }
  return null;
}

function activeAfterRemoval(
  workspace: StudioWorkspace,
  removedPath: string,
  remaining: StudioFile[]
): string {
  if (!remaining.some((file) => file.path === workspace.activeFile)) {
    const removedIndex = workspace.files.findIndex(
      (file) => file.path === removedPath
    );
    const fallback =
      remaining[Math.min(Math.max(removedIndex, 0), remaining.length - 1)];
    return fallback?.path ?? remaining[0].path;
  }
  return workspace.activeFile;
}

/** Add an empty file. Intermediate folders come from the path itself. */
export function addStudioFile(
  workspace: StudioWorkspace,
  rawPath: string
): StudioResult<StudioWorkspace> {
  const path = normalizeFilePath(rawPath);
  if (!path) {
    return invalid(
      "Enter a valid file path, like script.js or src/components/Button.jsx."
    );
  }
  const conflict = pathConflict(workspace.files, path);
  if (conflict) return invalid(conflict);

  return {
    ok: true,
    value: {
      ...workspace,
      files: [...workspace.files, { path, content: "" }],
      activeFile: path,
    },
  };
}

/** Rename a file to a new path, moving it between derived folders if needed. */
export function renameStudioFile(
  workspace: StudioWorkspace,
  from: string,
  to: string
): StudioResult<StudioWorkspace> {
  const sourcePath = normalizeFilePath(from);
  const nextPath = normalizeFilePath(to);
  if (!sourcePath || !nextPath) {
    return invalid("Enter a valid file path for the new name.");
  }
  if (!workspace.files.some((file) => file.path === sourcePath)) {
    return invalid("That file no longer exists in this project.");
  }
  if (sourcePath === nextPath) return { ok: true, value: workspace };
  const conflict = pathConflict(workspace.files, nextPath, sourcePath);
  if (conflict) return invalid(conflict);

  return {
    ok: true,
    value: {
      ...workspace,
      files: workspace.files.map((file) =>
        file.path === sourcePath ? { ...file, path: nextPath } : file
      ),
      activeFile:
        workspace.activeFile === sourcePath ? nextPath : workspace.activeFile,
    },
  };
}

/**
 * Delete a file. A project must keep at least one file, and the active file
 * falls back to its nearest surviving neighbour.
 */
export function deleteStudioFile(
  workspace: StudioWorkspace,
  rawPath: string
): StudioResult<StudioWorkspace> {
  const path = normalizeFilePath(rawPath);
  if (!path || !workspace.files.some((file) => file.path === path)) {
    return invalid("That file no longer exists in this project.");
  }
  if (workspace.files.length <= 1) {
    return invalid("A project needs at least one file, so this one can't be deleted.");
  }

  const remaining = workspace.files.filter((file) => file.path !== path);
  return {
    ok: true,
    value: {
      ...workspace,
      files: remaining,
      activeFile: activeAfterRemoval(workspace, path, remaining),
    },
  };
}

/** Files directly in or below a folder. */
function filesInFolder(
  workspace: StudioWorkspace,
  folderPath: string
): StudioFile[] {
  return workspace.files.filter((file) =>
    file.path.startsWith(`${folderPath}/`)
  );
}

/** Delete a folder and everything under it. Root can't be deleted as a unit. */
export function deleteStudioFolder(
  workspace: StudioWorkspace,
  rawPath: string
): StudioResult<StudioWorkspace> {
  const folderPath = normalizeFilePath(rawPath);
  if (!folderPath || folderPath === "/") {
    return invalid("Choose a folder inside the project to delete.");
  }

  const matches = filesInFolder(workspace, folderPath);
  if (matches.length === 0) {
    return invalid("That folder no longer has any files.");
  }
  const remaining = workspace.files.filter(
    (file) => !file.path.startsWith(`${folderPath}/`)
  );
  if (remaining.length === 0) {
    return invalid(
      "A project needs at least one file, so the project's only folder can't be deleted."
    );
  }

  return {
    ok: true,
    value: {
      ...workspace,
      files: remaining,
      activeFile: activeAfterRemoval(workspace, matches[0].path, remaining),
    },
  };
}

/** Rename a folder by rewriting the prefix of every file inside it. */
export function renameStudioFolder(
  workspace: StudioWorkspace,
  from: string,
  to: string
): StudioResult<StudioWorkspace> {
  const sourcePath = normalizeFilePath(from);
  const nextPath = normalizeFilePath(to);
  if (!sourcePath || !nextPath || sourcePath === "/" || nextPath === "/") {
    return invalid("Enter a valid folder path.");
  }
  if (sourcePath === nextPath) return { ok: true, value: workspace };
  if (nextPath.startsWith(`${sourcePath}/`)) {
    return invalid("A folder can't be moved inside itself.");
  }

  const matches = filesInFolder(workspace, sourcePath);
  if (matches.length === 0) {
    return invalid("That folder no longer has any files.");
  }
  if (workspace.files.some((file) => file.path === nextPath)) {
    return invalid(`A file already exists at ${nextPath}.`);
  }
  const nestedUnderFile = workspace.files.find(
    (file) =>
      !file.path.startsWith(`${sourcePath}/`) &&
      nextPath.startsWith(`${file.path}/`)
  );
  if (nestedUnderFile) {
    return invalid(`"${nestedUnderFile.path}" is a file, so it can't also be a folder.`);
  }

  const movedPaths = new Set(
    matches.map((file) => `${nextPath}${file.path.slice(sourcePath.length)}`)
  );
  const collisions = workspace.files.filter(
    (file) =>
      !file.path.startsWith(`${sourcePath}/`) && movedPaths.has(file.path)
  );
  if (collisions.length > 0) {
    return invalid(`A file already exists at ${collisions[0].path}.`);
  }

  return {
    ok: true,
    value: {
      ...workspace,
      files: workspace.files.map((file) =>
        file.path.startsWith(`${sourcePath}/`)
          ? { ...file, path: `${nextPath}${file.path.slice(sourcePath.length)}` }
          : file
      ),
      activeFile: workspace.activeFile.startsWith(`${sourcePath}/`)
        ? `${nextPath}${workspace.activeFile.slice(sourcePath.length)}`
        : workspace.activeFile,
    },
  };
}
