"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Skeleton } from "@/shared/ui/skeleton";
import { monacoLanguageForPath, monacoModelPath } from "../lib/monaco";

// Monaco touches `window` on import — keep it out of the server bundle.
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((module) => module.Editor),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-none" />,
  }
);

/** Monaco wrapper for the prototype: one model per file path. */
export function StudioEditor({
  workspaceId,
  filePath,
  value,
  onChange,
  fontSize,
  wordWrap,
}: {
  workspaceId: string;
  filePath: string;
  value: string;
  onChange: (value: string) => void;
  fontSize: number;
  wordWrap: boolean;
}) {
  const { resolvedTheme } = useTheme();

  return (
    <MonacoEditor
      height="100%"
      path={monacoModelPath(filePath, workspaceId)}
      language={monacoLanguageForPath(filePath)}
      value={value}
      onChange={(next) => onChange(next ?? "")}
      theme={resolvedTheme === "light" ? "light" : "vs-dark"}
      loading={<Skeleton className="h-full w-full rounded-none" />}
      options={{
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize,
        lineHeight: 20,
        tabSize: 2,
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        wordWrap: wordWrap ? "on" : "off",
        padding: { top: 12, bottom: 12 },
        renderLineHighlight: "line",
        overviewRulerBorder: false,
      }}
    />
  );
}
