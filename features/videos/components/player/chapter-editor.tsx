'use client';

import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Chapter } from '@/lib/types';
import { formatTimestamp } from '@/lib/chapters';
import { ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import { useChapterEditor } from './hooks/use-chapter-editor';

interface Props {
	chapters: Chapter[];
	onChange: (chapters: Chapter[]) => void;
}

export default function ChapterEditor({ chapters, onChange }: Props) {
	const {
		editingId,
		title,
		setTitle,
		start,
		setStart,
		formError,
		startEdit,
		cancelEdit,
		saveEdit,
		remove,
		move,
	} = useChapterEditor(chapters, onChange);
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const deleteTarget = deleteId ? chapters.find((c) => c.id === deleteId) : null;

	return (
		<div className="space-y-2">
			{chapters.map((c, i) => (
				<div key={c.id} className="rounded-lg border p-2.5 text-sm">
					{editingId === c.id ? (
						<div className="space-y-2">
							<Input value={title} onChange={(e) => setTitle(e.target.value)} />
							{formError && (
								<Alert variant="destructive" className="py-2">
									<AlertDescription>{formError}</AlertDescription>
								</Alert>
							)}
							<div className="flex gap-2">
								<Input
									value={start}
									onChange={(e) => setStart(e.target.value)}
									placeholder="MM:SS"
									className="w-28 font-mono"
								/>
								<Button size="sm" onClick={saveEdit}>
									Save
								</Button>
								<Button variant="ghost" size="sm" onClick={cancelEdit}>
									Cancel
								</Button>
							</div>
						</div>
					) : (
						<div className="flex items-center justify-between gap-2">
							<span className="min-w-0 truncate">
								<span className="mr-2 font-mono text-xs text-muted-foreground">
									{i + 1}. {formatTimestamp(c.startSeconds)}
								</span>
								{c.title}
							</span>
							<span className="flex shrink-0 gap-1">
								<Button
									variant="ghost"
									size="icon"
									onClick={() => move(c.id, -1)}
									aria-label="Move up"
									className="size-7"
								>
									<ChevronUp />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => move(c.id, 1)}
									aria-label="Move down"
									className="size-7"
								>
									<ChevronDown />
								</Button>
								<Button variant="ghost" size="sm" onClick={() => startEdit(c)} className="h-7 px-2 text-xs">
									<Pencil /> Edit
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setDeleteId(c.id)}
									aria-label={`Delete "${c.title}"`}
									className="h-7 px-2 text-xs text-red-500 hover:bg-destructive/10 hover:text-destructive"
								>
									<Trash2 /> Del
								</Button>
							</span>
						</div>
					)}
				</div>
			))}

			<AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete this chapter?</AlertDialogTitle>
						<AlertDialogDescription>
							&ldquo;{deleteTarget?.title}&rdquo; will be permanently removed from this
							course. This can&apos;t be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (deleteId) remove(deleteId);
								setDeleteId(null);
							}}
							className="bg-destructive text-white hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}