import type { Monaco } from "@monaco-editor/react";

/**
 * Monaco has no project `node_modules`, so it cannot resolve imports such as
 * `react`, `express`, or `./styles.css`. Sandpack owns dependency resolution;
 * keep syntax and real type diagnostics, but hide only module lookup errors.
 */
const IGNORED_MODULE_DIAGNOSTICS = [
  2307, // Cannot find module or its type declarations.
  2688, // Cannot find type definition file.
  2792, // Cannot find module; check moduleResolution.
];

export function configureMonaco(monaco: Monaco): void {
  const diagnostics = {
    noSemanticValidation: false,
    noSyntaxValidation: false,
    diagnosticCodesToIgnore: IGNORED_MODULE_DIAGNOSTICS,
  };

  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions(
    diagnostics
  );
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions(
    diagnostics
  );
}

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
