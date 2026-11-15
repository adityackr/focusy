"use client";

import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { STUDIO_TEMPLATES, STUDIO_TEMPLATE_ORDER } from "../lib/templates";
import { DEFAULT_STUDIO_TEMPLATE } from "../lib/workspaces";
import type { StudioTemplate } from "../types/studio.types";

/** Shared name + template form for every new-project entry point. */
export function StudioProjectForm({
  defaultName = "",
  formTitle,
  description,
  submitLabel = "Create project",
  onCreate,
  onCancel,
}: {
  defaultName?: string;
  formTitle: string;
  description: string;
  submitLabel?: string;
  onCreate: (name: string, template: StudioTemplate) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const id = useId();
  const [name, setName] = useState(defaultName);
  const [template, setTemplate] = useState<StudioTemplate>(
    DEFAULT_STUDIO_TEMPLATE
  );
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;
    setCreating(true);
    setError(null);
    const message = await onCreate(name, template);
    if (message) {
      setError(message);
      setCreating(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <p className="text-sm font-medium">{formTitle}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,200px)]">
        <div className="space-y-1">
          <Label htmlFor={`${id}-name`} className="text-xs text-muted-foreground">
            Project name
          </Label>
          <Input
            id={`${id}-name`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Untitled project"
            autoComplete="off"
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label
            htmlFor={`${id}-template`}
            className="text-xs text-muted-foreground"
          >
            Template
          </Label>
          <select
            id={`${id}-template`}
            value={template}
            onChange={(event) =>
              setTemplate(event.target.value as StudioTemplate)
            }
            className="h-9 w-full cursor-pointer rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {STUDIO_TEMPLATE_ORDER.map((templateId) => (
              <option key={templateId} value={templateId}>
                {STUDIO_TEMPLATES[templateId].label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {STUDIO_TEMPLATES[template].description}. Files stay in this browser.
      </p>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={creating}>
          <Plus />
          {creating ? "Creating…" : submitLabel}
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
          >
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
