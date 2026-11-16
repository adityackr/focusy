"use client";

import * as React from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { Placeholder } from "@tiptap/extensions";
import {
  Bold,
  Code,
  Code2,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

/** Extensions shared by the panel and the Markdown round-trip tests. */
export const NOTE_EDITOR_EXTENSIONS = [
  StarterKit.configure({
    link: { openOnClick: false, autolink: true },
  }),
  Markdown,
  Placeholder.configure({
    placeholder: "Write in Markdown…  ⌘B bold · # heading · ``` code",
  }),
];

/**
 * Markdown-first Tiptap editor for learning notes.
 *
 * The stored format stays Markdown (never Tiptap JSON/HTML): the editor parses
 * the initial Markdown and serializes every change back with `getMarkdown()`,
 * so notes remain portable and readable outside this app.
 */
export function NoteEditor({
  initialMarkdown = "",
  onChange,
  onSubmit,
  autoFocus = false,
  className,
  editorClassName,
  ariaLabel = "Note editor",
}: {
  /** Markdown to seed the editor with. Remount (via `key`) when this changes. */
  initialMarkdown?: string;
  onChange: (markdown: string) => void;
  /** Cmd/Ctrl+Enter — save without reaching for the mouse. */
  onSubmit?: () => void;
  autoFocus?: boolean;
  className?: string;
  editorClassName?: string;
  ariaLabel?: string;
}) {
  const onChangeRef = React.useRef(onChange);
  const onSubmitRef = React.useRef(onSubmit);
  React.useEffect(() => {
    onChangeRef.current = onChange;
    onSubmitRef.current = onSubmit;
  });

  const editor = useEditor({
    extensions: NOTE_EDITOR_EXTENSIONS,
    content: initialMarkdown,
    contentType: "markdown",
    immediatelyRender: false,
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        "aria-label": ariaLabel,
        class: cn(
          "tiptap min-h-36 px-3 py-2 text-sm leading-relaxed outline-none",
          editorClassName,
        ),
      },
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.preventDefault();
          onSubmitRef.current?.();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChangeRef.current(editor.getMarkdown());
    },
  });

  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor) return null;
      return {
        bold: editor.isActive("bold"),
        italic: editor.isActive("italic"),
        strike: editor.isActive("strike"),
        code: editor.isActive("code"),
        heading: editor.isActive("heading", { level: 2 }),
        bulletList: editor.isActive("bulletList"),
        orderedList: editor.isActive("orderedList"),
        blockquote: editor.isActive("blockquote"),
        codeBlock: editor.isActive("codeBlock"),
        canUndo: editor.can().chain().focus().undo().run(),
        canRedo: editor.can().chain().focus().redo().run(),
      };
    },
  });

  if (!editor) {
    return (
      <div className={cn("rounded-xl border border-input bg-background", className)}>
        <div className="h-10 border-b bg-muted/40" />
        <div className="min-h-36 px-3 py-2 text-sm text-muted-foreground">
          Loading editor…
        </div>
      </div>
    );
  }

  const run = (command: () => void) => {
    command();
    editor.commands.focus();
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-ring",
        className,
      )}
    >
      <div
        role="toolbar"
        aria-label="Formatting"
        className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 px-1.5 py-1"
      >
        <ToolButton
          label="Bold (⌘B)"
          active={state?.bold}
          onClick={() => run(() => editor.chain().focus().toggleBold().run())}
        >
          <Bold />
        </ToolButton>
        <ToolButton
          label="Italic (⌘I)"
          active={state?.italic}
          onClick={() => run(() => editor.chain().focus().toggleItalic().run())}
        >
          <Italic />
        </ToolButton>
        <ToolButton
          label="Strikethrough"
          active={state?.strike}
          onClick={() => run(() => editor.chain().focus().toggleStrike().run())}
        >
          <Strikethrough />
        </ToolButton>
        <ToolButton
          label="Inline code"
          active={state?.code}
          onClick={() => run(() => editor.chain().focus().toggleCode().run())}
        >
          <Code />
        </ToolButton>

        <span className="mx-1 h-5 w-px bg-border" aria-hidden />

        <ToolButton
          label="Heading"
          active={state?.heading}
          onClick={() =>
            run(() => editor.chain().focus().toggleHeading({ level: 2 }).run())
          }
        >
          <Heading2 />
        </ToolButton>
        <ToolButton
          label="Bullet list"
          active={state?.bulletList}
          onClick={() => run(() => editor.chain().focus().toggleBulletList().run())}
        >
          <List />
        </ToolButton>
        <ToolButton
          label="Numbered list"
          active={state?.orderedList}
          onClick={() => run(() => editor.chain().focus().toggleOrderedList().run())}
        >
          <ListOrdered />
        </ToolButton>
        <ToolButton
          label="Quote"
          active={state?.blockquote}
          onClick={() => run(() => editor.chain().focus().toggleBlockquote().run())}
        >
          <Quote />
        </ToolButton>
        <ToolButton
          label="Code block"
          active={state?.codeBlock}
          onClick={() => run(() => editor.chain().focus().toggleCodeBlock().run())}
        >
          <Code2 />
        </ToolButton>

        <span className="mx-1 h-5 w-px bg-border" aria-hidden />

        <ToolButton
          label="Undo"
          disabled={!state?.canUndo}
          onClick={() => run(() => editor.chain().focus().undo().run())}
        >
          <Undo2 />
        </ToolButton>
        <ToolButton
          label="Redo"
          disabled={!state?.canRedo}
          onClick={() => run(() => editor.chain().focus().redo().run())}
        >
          <Redo2 />
        </ToolButton>

        <span className="ml-auto hidden pr-1 text-[10px] font-medium text-muted-foreground sm:block">
          Markdown
        </span>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active ?? false}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-3.5",
        active && "bg-primary/10 text-primary",
      )}
    >
      {children}
    </button>
  );
}
