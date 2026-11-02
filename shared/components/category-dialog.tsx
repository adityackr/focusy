"use client";

import { useEffect, useState } from "react";
import { Check, Folder, Plus } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import type { Category } from "@/shared/lib/types";
import { useLibrary } from "@/shared/store/library";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/utils";

/** Folder picker: choose a category or create one inline. `null` = no category. */
export function CategoryPicker({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (categoryId: string | null) => void;
}) {
  const { categories, newName, setNewName, handleCreate } =
    useCategoryPicker(onSelect);

  return (
    <div className="space-y-2">
      <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
        <CategoryOption
          label="No category"
          selected={selectedId === null}
          onSelect={() => onSelect(null)}
          muted
        />
        {categories.map((c) => (
          <CategoryOption
            key={c.id}
            label={c.name}
            selected={selectedId === c.id}
            onSelect={() => onSelect(c.id)}
          />
        ))}
      </div>
      {categories.length === 0 && (
        <p className="px-1 text-xs text-muted-foreground">
          No categories yet — create one below.
        </p>
      )}
      <form onSubmit={handleCreate} className="flex items-center gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name"
          aria-label="New category name"
          className="h-9"
        />
        <Button type="submit" variant="outline" size="sm" disabled={!newName.trim()}>
          <Plus className="size-4" /> Create
        </Button>
      </form>
    </div>
  );
}

function CategoryOption({
  label,
  selected,
  onSelect,
  muted = false,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors",
        selected
          ? "border-primary bg-primary/5 text-foreground"
          : "border-input hover:bg-accent",
        muted && !selected && "text-muted-foreground"
      )}
    >
      <Folder
        className={cn(
          "size-4 shrink-0",
          selected ? "text-primary" : "text-muted-foreground"
        )}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {selected && <Check className="size-4 shrink-0 text-primary" />}
    </button>
  );
}

/** Modal folder picker — used when saving something and when re-filing it later. */
export function CategoryDialog({
  open,
  onOpenChange,
  onSave,
  initialCategoryId = null,
  title = "Save to a category",
  description = "Pick a folder, or create a new one. Categories are shown on the Categories page.",
  confirmLabel = "Save",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** `undefined` files the item without a category. */
  onSave: (categoryId?: string) => void;
  /** Category selected when the dialog opens (existing saves). */
  initialCategoryId?: string | null;
  title?: string;
  description?: string;
  confirmLabel?: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Each open starts from the item's current folder.
  useEffect(() => {
    if (!open) return;
    const known = initialCategoryId
      ? useLibrary.getState().categories[initialCategoryId]
      : undefined;
    setSelectedId(known ? initialCategoryId : null);
  }, [open, initialCategoryId]);

  function handleSave() {
    onSave(selectedId ?? undefined);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <CategoryPicker selectedId={selectedId} onSelect={setSelectedId} />

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Category list + create-form state for `CategoryPicker` — kept out of the JSX. */
function useCategoryPicker(onSelect: (categoryId: string | null) => void) {
  const [newName, setNewName] = useState("");
  const categories = useLibrary(
    useShallow((s) =>
      s.categoryOrder
        .map((id) => s.categories[id])
        .filter((c): c is Category => Boolean(c))
    )
  );
  const addCategory = useLibrary((s) => s.addCategory);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const id = addCategory(newName);
    if (!id) return;
    // Creating a folder selects it, so saving finishes in one more click.
    onSelect(id);
    setNewName("");
  }

  return { categories, newName, setNewName, handleCreate };
}
