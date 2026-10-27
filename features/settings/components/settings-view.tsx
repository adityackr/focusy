"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpenText, Check, ExternalLink, KeyRound, ShieldCheck } from "lucide-react";
import { getApiKey, setApiKey, fetchTest } from "@/features/settings/lib/actions-client";
import { Button, buttonVariants } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { cn } from "@/shared/lib/utils";

const CONSOLE = "https://console.cloud.google.com";
const API_LIBRARY = "https://console.cloud.google.com/apis/library/youtube.googleapis.com";
const CREDENTIALS = "https://console.cloud.google.com/apis/credentials";

const STEPS = [
  {
    title: "Create a Google Cloud project",
    body: "Open Google Cloud Console and sign in with your Google account. Click the project dropdown (top-left) → New Project, give it any name like “Focusy”, and create it. It's free — no billing needed for YouTube API quota.",
    link: { href: CONSOLE, label: "Open Cloud Console" },
  },
  {
    title: "Enable the YouTube Data API v3",
    body: "Open the API Library page below, make sure your new project is selected, then click Enable. This turns on YouTube access for your project.",
    link: { href: API_LIBRARY, label: "Open API Library (YouTube Data API v3)" },
  },
  {
    title: "Create an API key",
    body: "Go to Credentials → Create Credentials → API key. Google will show you a key starting with “AIza…”. Copy it.",
    link: { href: CREDENTIALS, label: "Open Credentials page" },
  },
  {
    title: "Restrict the key (recommended)",
    body: "Click Edit on the new key → under API restrictions choose “Restrict key” and select only “YouTube Data API v3”. This keeps the key safe even if someone sees it. Then click Save.",
  },
  {
    title: "Paste it below and test",
    body: "Paste the key into the input below, hit Save key, then Test key. A ✓ message means you're ready to import playlists and auto-fetch video chapters.",
  },
];

export function SettingsView() {
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState("");

  useEffect(() => {
    setKey(getApiKey());
  }, []);

  function handleSave() {
    setApiKey(key);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleTest() {
    setTesting(true);
    setTestMsg("");
    setTestMsg(await fetchTest(key.trim()));
    setTesting(false);
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-4 pb-16">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <Badge variant="secondary">Takes ~2 minutes</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Your key is stored only in this browser&apos;s localStorage — it never touches our servers
        (there are none).
      </p>

      {/* key input */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4" /> YouTube Data API v3 key
          </CardTitle>
          <CardDescription>
            Needed to import playlists and auto-fetch video chapters. No key? Video chapters still
            work via manual paste on the Add video page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            type="password"
            placeholder="AIza…"
            className="font-mono"
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave}>
              {saved ? (
                <>
                  <Check className="size-4" /> Saved
                </>
              ) : (
                "Save key"
              )}
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing || !key.trim()}>
              {testing ? "Testing…" : "Test key"}
            </Button>
            <Link
              href="/add"
              className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground")}
            >
              ← Back to Add video
            </Link>
          </div>
          {testMsg && <p className="text-sm text-muted-foreground">{testMsg}</p>}
        </CardContent>
      </Card>

      {/* tutorial */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpenText className="size-4" /> How to get a free API key
          </CardTitle>
          <CardDescription>
            Step-by-step — keep this page open and work through the links in new tabs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-5">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0 space-y-1.5">
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-sm text-muted-foreground">{s.body}</p>
                  {s.link && (
                    <a
                      href={s.link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      {s.link.label} <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <Separator className="my-4" />
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-green-600" />
            Quota note: Google&apos;s free tier allows ~10,000 units/day (≈ 6,000 video lookups).
            If you ever hit the limit, the app tells you and you can paste chapters manually
            instead.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}