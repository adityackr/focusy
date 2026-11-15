"use client";

import { WrapText } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import {
  useStudioPreferences,
  type StudioFontSize,
} from "../store/studio-preferences-store";

const FONT_SIZES: StudioFontSize[] = [12, 13, 14, 16, 18];

/** Compact editor settings that persist across sessions. */
export function StudioEditorPreferences() {
  const fontSize = useStudioPreferences((state) => state.fontSize);
  const wordWrap = useStudioPreferences((state) => state.wordWrap);
  const setFontSize = useStudioPreferences((state) => state.setFontSize);
  const setWordWrap = useStudioPreferences((state) => state.setWordWrap);

  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor="studio-editor-font-size" className="sr-only">
        Editor font size
      </Label>
      <select
        id="studio-editor-font-size"
        value={fontSize}
        onChange={(event) =>
          setFontSize(Number(event.target.value) as StudioFontSize)
        }
        className="h-7 cursor-pointer rounded-md border border-input bg-background px-1.5 text-[11px] text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title="Editor font size"
      >
        {FONT_SIZES.map((size) => (
          <option key={size} value={size}>
            {size}px
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant={wordWrap ? "secondary" : "ghost"}
        size="icon"
        className="size-7 [&_svg]:size-3.5"
        aria-pressed={wordWrap}
        aria-label="Toggle word wrap"
        title="Word wrap"
        onClick={() => setWordWrap(!wordWrap)}
      >
        <WrapText />
      </Button>
    </div>
  );
}
