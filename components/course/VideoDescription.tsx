"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { stripTimestampLines } from "@/lib/chapters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const URL_RE = /(https?:\/\/[^\s<>()]+|www\.[^\s<>()]+)/g;
const TRAILING_PUNCT = /[).!?,;:]+$/;

function linkify(text: string, keyPrefix: string) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(URL_RE)) {
    const idx = m.index ?? 0;
    const raw = m[0];
    const trail = raw.match(TRAILING_PUNCT)?.[0] ?? "";
    const url = trail ? raw.slice(0, -trail.length) : raw;
    if (idx > last) parts.push(text.slice(last, idx));
    const href = url.startsWith("http") ? url : `https://${url}`;
    parts.push(
      <Link
        key={`${keyPrefix}-${i++}`}
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="break-all text-sky-600 underline decoration-sky-600/40 underline-offset-2 hover:text-sky-500"
      >
        {url}
      </Link>
    );
    if (trail) parts.push(trail);
    last = idx + raw.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function VideoDescription({
  description,
  title = "ABOUT THIS VIDEO",
}: {
  description: string;
  title?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const cleaned = useMemo(() => stripTimestampLines(description), [description]);
  if (!cleaned) return null;

  const lines = cleaned.split("\n");
  const COLLAPSED_LINES = 6;
  const long = lines.length > COLLAPSED_LINES;
  const visible = expanded || !long ? lines : lines.slice(0, COLLAPSED_LINES);

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-xs font-medium tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5 text-sm wrap-break-word whitespace-pre-wrap">
          {visible.map((line, i) =>
            line === "" ? (
              <div key={i} className="h-2" />
            ) : (
              <p key={i}>{linkify(line, `l${i}`)}</p>
            )
          )}
        </div>
        {long && (
          <Button variant="link" size="sm" onClick={() => setExpanded((v) => !v)} className="mt-2 px-0">
            {expanded ? "Show less" : `Show more (${lines.length - COLLAPSED_LINES} more lines)`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}