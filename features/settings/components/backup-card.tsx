'use client';

import { useLibrary } from '@/shared/store/library';
import {
	applyBackup,
	backupPreview,
	backupSummary,
	downloadBackup,
	mergeBackup,
	readBackupFile,
	type Backup,
	type BackupPreview,
	type MergeReport,
} from '@/shared/lib/backup';
import { Button } from '@/shared/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/shared/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/shared/ui/dialog';
import { HardDriveDownload, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

type RestoreMode = 'replace' | 'merge';

/** How many names to spell out per group before collapsing into `+N more`. */
const NAMES_SHOWN = 5;

/**
 * Download the whole library (playlists, videos, folders, progress, notes) as
 * a JSON file, or bring such a file into this browser — either replacing its
 * data or merging into it, after showing what the file contains. No server is
 * involved; it's the only way to move data between devices without an account.
 */
export function BackupCard() {
	const hydrated = useLibrary((s) => s.hydrated);
	const fileInput = useRef<HTMLInputElement>(null);
	const [mode, setMode] = useState<RestoreMode>('replace');
	const [pending, setPending] = useState<Backup | null>(null);
	const [message, setMessage] = useState<{ text: string; error: boolean } | null>(
		null
	);
	const [busy, setBusy] = useState(false);
	const preview = pending ? backupPreview(pending) : null;

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
		setMessage(null);
		try {
			const result = await readBackupFile(file);
			if (!result.ok) {
				setMessage({ text: result.error, error: true });
				return;
			}
			// Show what's inside before anything is written.
			setPending(result.backup);
		} catch {
			setMessage({ text: "Couldn't read that backup file.", error: true });
		} finally {
			setBusy(false);
		}
	}

	function confirmRestore() {
		if (!pending) return;
		try {
			if (mode === 'merge') {
				setMessage({ text: mergeMessage(mergeBackup(pending)), error: false });
			} else {
				applyBackup(pending);
				setMessage({
					text: `Replaced this browser's data with ${backupSummary(pending)}.`,
					error: false,
				});
			}
		} catch {
			setMessage({ text: "Couldn't restore that backup.", error: true });
		} finally {
			setPending(null);
		}
	}

	return (
		<>
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
					<fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
						<legend className="mb-1 text-xs text-muted-foreground">
							When restoring
						</legend>
						<label className="flex cursor-pointer items-center gap-1.5">
							<input
								type="radio"
								name="restore-mode"
								className="size-3.5"
								checked={mode === 'replace'}
								onChange={() => setMode('replace')}
							/>
							Replace everything here
						</label>
						<label className="flex cursor-pointer items-center gap-1.5">
							<input
								type="radio"
								name="restore-mode"
								className="size-3.5"
								checked={mode === 'merge'}
								onChange={() => setMode('merge')}
							/>
							Merge into what&apos;s here
						</label>
					</fieldset>

					<div className="flex flex-wrap gap-2">
						<Button onClick={handleDownload} disabled={!hydrated}>
							<HardDriveDownload className="size-4" /> Download backup
						</Button>
						<Button
							variant="outline"
							onClick={() => fileInput.current?.click()}
							disabled={!hydrated || busy}
						>
							<Upload className="size-4" />{' '}
							{busy ? 'Reading…' : 'Restore from file'}
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
						<strong>Replace</strong> overwrites what&apos;s saved in this browser.{' '}
						<strong>Merge</strong> keeps it, adds what the file has, and takes the
						newest watch progress and notes — nothing is deleted.
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

			<Dialog
				open={pending !== null}
				onOpenChange={(open) => {
					if (!open) setPending(null);
				}}
			>
				{pending && preview && (
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Restore this backup?</DialogTitle>
							<DialogDescription>
								Exported {pending.exportedAt.slice(0, 10)} — here&apos;s what the
								file contains.
							</DialogDescription>
						</DialogHeader>

						<BackupContents preview={preview} />

						<p className="mt-4 text-xs text-muted-foreground">
							{mode === 'merge'
								? 'These are added to what is already saved here. Nothing is removed, and the newest watch progress and notes win.'
								: 'This overwrites the playlists, videos, progress and notes saved here. Download a backup first if you want to keep them.'}
						</p>

						<DialogFooter>
							<Button variant="outline" onClick={() => setPending(null)}>
								Cancel
							</Button>
							<Button
								variant={mode === 'replace' ? 'destructive' : 'default'}
								onClick={confirmRestore}
							>
								{mode === 'replace'
									? 'Replace everything'
									: 'Merge into this browser'}
							</Button>
						</DialogFooter>
					</DialogContent>
				)}
			</Dialog>
		</>
	);
}

function BackupContents({ preview }: { preview: BackupPreview }) {
	const groups = [
		{ label: 'Playlists', names: preview.playlists },
		{ label: 'Videos', names: preview.videos },
		{ label: 'Folders', names: preview.folders },
	].filter((group) => group.names.length > 0);

	return (
		<div className="space-y-3">
			<div className="grid grid-cols-3 gap-3 rounded-xl border bg-muted/30 p-3 text-center">
				<PreviewStat value={preview.playlists.length} label="playlists" />
				<PreviewStat value={preview.videos.length} label="videos" />
				<PreviewStat value={preview.folders.length} label="folders" />
				<PreviewStat value={preview.playlistProgress} label="with progress" />
				<PreviewStat value={preview.courseProgress} label="chapter states" />
				<PreviewStat value={preview.notes} label="notes" />
			</div>

			{groups.length > 0 && (
				<ul className="space-y-1 text-xs text-muted-foreground">
					{groups.map((group) => (
						<li key={group.label}>
							<span className="font-medium text-foreground">
								{group.label}:
							</span>{' '}
							{summarizeNames(group.names)}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function PreviewStat({ value, label }: { value: number; label: string }) {
	return (
		<div>
			<div className="text-lg font-semibold tabular-nums">{value}</div>
			<div className="text-[11px] text-muted-foreground">{label}</div>
		</div>
	);
}

/** `A, B, C, D, E +4 more` — long libraries stay glanceable. */
function summarizeNames(names: string[]): string {
	const shown = names.slice(0, NAMES_SHOWN).join(', ');
	const rest = names.length - NAMES_SHOWN;
	return rest > 0 ? `${shown} +${rest} more` : shown;
}

function mergeMessage(report: MergeReport): string {
	const parts: string[] = [];
	if (report.playlistsAdded > 0) {
		parts.push(
			`${report.playlistsAdded} new playlist${report.playlistsAdded === 1 ? '' : 's'}`
		);
	}
	if (report.coursesAdded > 0) {
		parts.push(
			`${report.coursesAdded} new video${report.coursesAdded === 1 ? '' : 's'}`
		);
	}
	if (report.notesUpdated > 0) {
		parts.push(
			`${report.notesUpdated} note${report.notesUpdated === 1 ? '' : 's'} updated`
		);
	}
	if (parts.length === 0) {
		return 'Merged — everything in that file was already saved here.';
	}
	return `Merged — ${parts.join(' · ')}.`;
}
