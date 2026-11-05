'use client';

import {
	backupReminder,
	dismissBackupReminder,
	downloadBackup,
	type BackupReminder as Reminder,
} from '@/shared/lib/backup';
import { useLibrary } from '@/shared/store/library';
import { Button } from '@/shared/ui/button';
import { DatabaseBackup, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

/**
 * Nudge on the library page when the saved data has outgrown its last backup
 * (or was never backed up at all), so clearing this browser isn't a surprise.
 * Dismissing hides it until the library or the last backup changes.
 */
export function BackupReminder() {
	const hydrated = useLibrary((s) => s.hydrated);
	// A number, so this re-renders only when the amount of content changes.
	const items = useLibrary(
		(s) => Object.keys(s.playlists).length + Object.keys(s.courses).length
	);
	const [reminder, setReminder] = useState<Reminder | null>(null);

	useEffect(() => {
		// localStorage is client-only: reading it during render would mismatch SSR.
		setReminder(hydrated ? backupReminder() : null);
	}, [hydrated, items]);

	if (!reminder) return null;

	function handleDownload() {
		try {
			downloadBackup();
			setReminder(null);
		} catch {
			toast.error("Couldn't create the backup file.");
		}
	}

	function handleDismiss() {
		dismissBackupReminder();
		setReminder(null);
	}

	return (
		<div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3 text-sm">
			<DatabaseBackup className="size-4 shrink-0 text-primary" />
			<p className="flex-1 text-muted-foreground">
				{reminder.neverBackedUp ? (
					<>
						<span className="font-medium text-foreground">
							Your library isn&apos;t backed up.
						</span>{' '}
						One file keeps your {plural(reminder.items, 'item')} safe if this
						browser&apos;s data is cleared.
					</>
				) : (
					<>
						<span className="font-medium text-foreground">
							{plural(reminder.itemsSince, 'new item')}
						</span>{' '}
						since your last backup {daysAgo(reminder.daysSince ?? 0)}.
					</>
				)}
			</p>
			<Button size="sm" onClick={handleDownload}>
				Download backup
			</Button>
			<Button
				variant="ghost"
				size="icon"
				aria-label="Dismiss backup reminder"
				onClick={handleDismiss}
			>
				<X className="size-4" />
			</Button>
		</div>
	);
}

function plural(n: number, word: string): string {
	return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function daysAgo(days: number): string {
	if (days <= 0) return 'today';
	if (days === 1) return 'yesterday';
	return `${days} days ago`;
}
