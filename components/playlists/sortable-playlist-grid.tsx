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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Playlist } from "@/lib/types";
import { useLibrary, selectPlaylistList } from "@/store/library";
import { PlaylistCard } from "@/components/playlists/playlist-card";
import { PlaylistGrid } from "@/components/playlists/playlist-grid";

function SortableCard({ playlist }: { playlist: Playlist }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: playlist.playlistId });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("group relative", isDragging && "z-10")}
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

export function SortablePlaylistGrid() {
  const items = useLibrary(useShallow(selectPlaylistList));
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
    setOrder(arrayMove(ids, oldIndex, newIndex));
  }

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
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => (
            <SortableCard key={p.playlistId} playlist={p} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
