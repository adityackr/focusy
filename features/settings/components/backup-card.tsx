'use client';

import { useLibrary } from '@/shared/store/library';
import {
	applyBackup,
	backupSummary,
	downloadBackup,
	readBackupFile,
	type Backup,
} from '@/shared/lib/backup';
import { Button } from '@/shared/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/shared/ui/card';
import { HardDriveDownload, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

/**
 * Download the whole library (playlists, videos, folders, progress, notes) as
 * a JSON file, or replace this browser's data with such a file. No server is
 * involved — it's the only way to move data between devices without an account.
 */
export function BackupCard() {
	const hydrated = useLibrary((s) => s.hydrated);
	const fileInput = useRef<HTMLInputElement>(null);
	const [message, setMessage] = useState<{ text: string; error: boolean } | null>(
		null
	);
	const [busy, setBusy] = useState(false);

	function handleDownload() {
		try {
			const name = downloadBackup();
			setMessage({ text: `Saved ${name}`, error: false });
		} catch {
			setMessage({ text: "Couldn't create the backup file.", error: true });
		}
	}

	async function handleFile(file: File) {
		setBusy(true);
		try {
			const result = await readBackupFile(file);
			if (!result.ok) {
				setMessage({ text: result.error, error: true });
				return;
			}
			if (!confirmReplace(result.backup)) {
				setMessage({ text: 'Restore cancelled — nothing was changed.', error: false });
				return;
			}
			applyBackup(result.backup);
			setMessage({ text: `Restored ${backupSummary(result.backup)}.`, error: false });
		} catch {
			setMessage({ text: "Couldn't restore that backup.", error: true });
		} finally {
			setBusy(false);
		}
	}

	return (
		<Card className="mt-4">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<HardDriveDownload className="size-4" /> Backup &amp; restore
				</CardTitle>
				<CardDescription>
					Move your playlists, videos, folders, watch progress and notes to
					another browser or device with one JSON file. Your API key and player
					settings stay on this device.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex flex-wrap gap-2">
					<Button onClick={handleDownload} disabled={!hydrated}>
						<HardDriveDownload className="size-4" /> Download backup
					</Button>
					<Button
						variant="outline"
						onClick={() => fileInput.current?.click()}
						disabled={!hydrated || busy}
					>
						<Upload className="size-4" /> {busy ? 'Restoring…' : 'Restore from file'}
					</Button>
					<input
						ref={fileInput}
						type="file"
						accept="application/json,.json"
						className="hidden"
						onChange={(e) => {
							const file = e.target.files?.[0];
							// Reset so picking the same file twice still fires onChange.
							e.target.value = '';
							if (file) void handleFile(file);
						}}
					/>
				</div>
				<p className="text-xs text-muted-foreground">
					Restoring <strong>replaces</strong> what&apos;s saved in this browser —
					it isn&apos;t a merge. Export first if you want to keep both.
				</p>
				{message && (
					<p
						className={
							message.error
								? 'text-sm text-destructive'
								: 'text-sm text-muted-foreground'
						}
					>
						{message.text}
					</p>
				)}
			</CardContent>
		</Card>
	);
}

/** Spell out what restoring replaces before touching anything. */
function confirmReplace(backup: Backup): boolean {
	return window.confirm(
		`Restore ${backupSummary(backup)} from ${backup.exportedAt.slice(0, 10)}?\n\n` +
			'This replaces the playlists, videos, progress and notes currently saved in this browser.',
	);
}
