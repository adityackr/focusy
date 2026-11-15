/** Monaco language id for a Studio file path (extension based). */
export function monacoLanguageForPath(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  switch (extension) {
    case "html":
    case "htm":
      return "html";
    case "css":
      return "css";
    case "js":
    case "mjs":
    case "cjs":
    case "jsx":
      return "javascript";
    case "ts":
    case "mts":
    case "cts":
    case "tsx":
      return "typescript";
    case "json":
      return "json";
    case "md":
      return "markdown";
    default:
      return "plaintext";
  }
}

/**
 * Data-URL model path keeps JSX/TSX parsed as TSX rather than plain TS. The
 * workspace scope stops two projects with the same filenames from sharing an
 * editor model (and its undo stack).
 */
export function monacoModelPath(path: string, workspaceId: string): string {
  return `file:///${encodeURIComponent(workspaceId)}/${path.replace(/^\/+/, "")}`;
}
