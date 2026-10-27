"use client";

import Image from "next/image";
import Link from "next/link";
import { CircleAlert, ListVideo } from "lucide-react";
import { formatTimestamp } from "@/lib/chapters";
import { useAddVideo } from "./_hooks/use-add-video";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default function AddPage() {
  const {
    url,
    setUrl,
    manualMode,
    setManualMode,
    manualText,
    manualTitle,
    setManualTitle,
    loading,
    error,
    videoId,
    meta,
    chapters,
    warnings,
    handleFetch,
    handleManualTextChange,
    handleManualParse,
    handleSave,
  } = useAddVideo();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-4 pb-16">
      <h1 className="text-xl font-semibold tracking-tight">Add a video</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Paste a YouTube link or ID. We&apos;ll fetch its title + description and split it by timestamps.
      </p>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">YouTube link or ID</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="video-url">Video URL</Label>
            <Input
              id="video-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=… or dQw4w9WgXcQ"
              className="font-mono"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="manual-mode"
              checked={manualMode}
              onCheckedChange={(v) => setManualMode(v === true)}
            />
            <Label htmlFor="manual-mode" className="font-normal">
              Skip API / paste chapters manually (no key needed)
            </Label>
          </div>
          {manualMode && (
            <div className="space-y-2">
              <Label htmlFor="course-title">Course title</Label>
              <Input
                id="course-title"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="Course title (optional)"
              />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleFetch} disabled={loading}>
              {loading ? "Fetching…" : manualMode ? "Continue" : "Fetch chapters"}
            </Button>
            <Link
              href="/settings"
              className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground")}
            >
              Set API key
            </Link>
          </div>
          {error && (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertTitle>Something needs attention</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {(meta || manualMode) && videoId && (
        <Card className="mt-4">
          <CardContent className="space-y-4 pt-5">
            {meta && (
              <div className="flex gap-3">
                {meta.thumbnail && (
                  <Image
                    src={meta.thumbnail}
                    alt=""
                    width={160}
                    height={90}
                    className="h-17 w-30 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{meta.title}</div>
                  <div className="font-mono text-xs text-muted-foreground">{videoId}</div>
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="chapters" className="flex items-center gap-1.5">
                  <ListVideo className="size-4" /> Chapters
                </Label>
                {chapters.length > 0 && <Badge variant="secondary">{chapters.length} found</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                One per line: <code>00:00 Intro</code>, <code>05:12 Setup</code>,{" "}
                <code>1:02:03 Deep dive</code>
              </p>
              <Textarea
                id="chapters"
                value={manualText}
                onChange={(e) => handleManualTextChange(e.target.value)}
                rows={6}
                placeholder={"00:00 Intro\n05:12 Setup\n12:40 Demo"}
                className="font-mono"
              />
              {!manualMode && (
                <Button variant="outline" size="sm" onClick={handleManualParse}>
                  Parse pasted list instead
                </Button>
              )}
            </div>

            {warnings.length > 0 && chapters.length > 0 && (
              <Alert>
                <CircleAlert />
                <AlertDescription>
                  <ul className="space-y-1">
                    {warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {chapters.length > 0 && (
              <ol className="max-h-64 space-y-1 overflow-auto rounded-lg bg-muted p-2 text-sm">
                {chapters.map((c, i) => (
                  <li key={c.id} className="flex gap-2">
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {formatTimestamp(c.startSeconds)}
                    </span>
                    <span className="truncate">
                      {i + 1}. {c.title}
                    </span>
                  </li>
                ))}
              </ol>
            )}

            <Button
              onClick={handleSave}
              disabled={chapters.length === 0}
              className="w-full bg-green-700 text-white hover:bg-green-600"
            >
              Save as course →
            </Button>
          </CardContent>
        </Card>
      )}
    </main>
  );
}