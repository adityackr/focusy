const DEFAULT_MAX_LENGTH = 180;

/**
 * Condense note Markdown into a single readable line for list previews.
 * Fenced code is flattened into the text, headings/lists/links lose their
 * markers, and the result is length-capped before CSS clamps it to one line.
 */
export function notePreview(
  markdown: string,
  maxLength = DEFAULT_MAX_LENGTH,
): string {
  if (!markdown) return "";

  let text = markdown.replace(/\r\n?/g, "\n");

  // Keep fenced code content, but not the fence or language label.
  text = text.replace(/```[^\n]*\n([\s\S]*?)```/g, " $1 ");
  text = text.replace(/```[^\n]*/g, " ");

  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  text = text.replace(/^\s*#{1,6}\s+/gm, "");
  text = text.replace(/^\s*>\s?/gm, "");
  text = text.replace(/^\s*(?:[-+*]|\d+[.)])\s+/gm, "");
  text = text.replace(/^\s*(?:[-*_]\s*){3,}$/gm, "");
  text = text.replace(/\[(?:x|X| )\]\s*/g, "");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/[*_~]{1,3}/g, "");
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/\|/g, " ");
  text = text.replace(/\s+/g, " ").trim();

  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}
