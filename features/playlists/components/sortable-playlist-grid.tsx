"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import type { Playlist } from "@/shared/lib/types";
import {
  useLibrary,
  selectPlaylistList,
  UNCATEGORIZED_CATEGORY_ID,
} from "@/shared/store/library";
import { reorderWithin } from "@/shared/lib/order";
import { PlaylistCard } from "@/features/playlists/components/playlist-card";
import { PlaylistGrid } from "@/features/playlists/components/playlist-grid";

function SortableCard({ playlist }: { playlist: Playlist }) {
  const { style, isDragging, attributes, listeners, setNodeRef } =
    useSortableCard(playlist.playlistId);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("group relative mb-5 break-inside-avoid", isDragging && "z-10")}
    >
      <div className={cn(isDragging && "scale-[1.02] opacity-90")}>
        <PlaylistCard playlist={playlist} />
      </div>
      <Button
        variant="secondary"
        size="icon"
        aria-label={`Drag to reorder "${playlist.playlistTitle}"`}
        title="Drag to reorder"
        {...attributes}
        {...listeners}
        className={cn(
          "absolute left-2 top-2 h-8 w-8 cursor-grab touch-none shadow-md active:cursor-grabbing",
          "md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100",
          isDragging && "opacity-100"
        )}
      >
        <GripVertical className="size-4" />
      </Button>
    </div>
  );
}

export function SortablePlaylistGrid({ categoryId }: { categoryId?: string } = {}) {
  const { items, sensors, handleDragEnd } = useSortablePlaylistGrid(categoryId);

  if (items.length === 0) return <PlaylistGrid items={items} />;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((p) => p.playlistId)}
        strategy={rectSortingStrategy}
      >
        <div className="columns-1 gap-5 sm:columns-2 xl:columns-3">
          {items.map((p) => (
            <SortableCard key={p.playlistId} playlist={p} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

/** Drag state for one sortable card — kept out of the JSX. */
function useSortableCard(playlistId: string) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: playlistId });

  return {
    style: { transform: CSS.Transform.toString(transform), transition },
    isDragging,
    attributes,
    listeners,
    setNodeRef,
  };
}

/** Items + sensors + reorder handler for `SortablePlaylistGrid` — kept out of the JSX. */
function useSortablePlaylistGrid(categoryId?: string) {
  const allItems = useLibrary(useShallow(selectPlaylistList));
  const categories = useLibrary((s) => s.categories);
  const items = categoryId
    ? allItems.filter((p) =>
        categoryId === UNCATEGORIZED_CATEGORY_ID
          ? !p.categoryId || !categories[p.categoryId]
          : p.categoryId === categoryId
      )
    : allItems;
  const setOrder = useLibrary((s) => s.setOrder);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = items.map((p) => p.playlistId);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    // Inside a category only its items move; everything else keeps its slot.
    const reordered = arrayMove(ids, oldIndex, newIndex);
    setOrder(reorderWithin(allItems.map((p) => p.playlistId), reordered));
  }

  return { items, sensors, handleDragEnd };
}
