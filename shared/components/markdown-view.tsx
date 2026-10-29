import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/shared/lib/utils";

/**
 * Read-only Markdown viewer (GFM: tables, task lists, strikethrough, autolinks)
 * with hand-rolled typography — the project doesn't ship a prose plugin.
 */
export function MarkdownView({
  markdown,
  className,
}: {
  markdown: string;
  className?: string;
}) {
  const source = (markdown ?? "").trim();
  if (!source) {
    return (
      <p className={cn("text-sm italic text-muted-foreground", className)}>
        Nothing here yet.
      </p>
    );
  }

  return (
    <div className={cn("text-sm leading-relaxed break-words", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h3 className="mt-4 mb-2 text-base font-bold first:mt-0">{children}</h3>
          ),
          h2: ({ children }) => (
            <h4 className="mt-4 mb-1.5 text-sm font-bold first:mt-0">{children}</h4>
          ),
          h3: ({ children }) => (
            <h5 className="mt-3 mb-1.5 text-sm font-semibold first:mt-0">{children}</h5>
          ),
          h4: ({ children }) => (
            <p className="mt-3 mb-1 text-sm font-semibold first:mt-0">{children}</p>
          ),
          p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="my-2 list-disc space-y-1 pl-5 marker:text-primary">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-primary marker:font-semibold">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-primary/50 pl-3 text-muted-foreground italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-border" />,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          code: ({ children }) => (
            <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[13px]">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="my-2 overflow-x-auto rounded-lg border bg-muted/60 p-3 font-mono text-xs leading-relaxed [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-xs">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border">
              <table className="w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b px-2.5 py-1.5 text-left font-semibold">{children}</th>
          ),
          td: ({ children }) => <td className="border-b px-2.5 py-1.5">{children}</td>,
          input: (props) => (
            <input
              {...props}
              type="checkbox"
              disabled
              className="mr-1.5 size-3.5 align-middle accent-primary"
            />
          ),
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element -- user-authored markdown
            <img src={src} alt={alt ?? ""} className="my-2 max-w-full rounded-lg" />
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
