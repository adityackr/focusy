'use client';

import {
	collectStudioBackup,
	restoreStudioBackup,
	type StudioRestoreReport,
} from '@/features/studio';
import {
	collectAnalyticsBackup,
	restoreAnalyticsBackup,
} from '@/features/analytics';
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
	const [exporting, setExporting] = useState(false);
	const preview = pending ? backupPreview(pending) : null;

	async function handleDownload() {
		if (exporting) return;
		setExporting(true);
		setMessage(null);
		try {
			const studio = await collectStudioBackup();
			if (!studio.ok) {
				setMessage({
					text: `Couldn't include Studio projects: ${studio.error.message}`,
					error: true,
				});
				return;
			}
			const name = downloadBackup(studio.value, collectAnalyticsBackup());
			setMessage({ text: `Saved ${name}`, error: false });
		} catch {
			setMessage({ text: "Couldn't create the backup file.", error: true });
		} finally {
			setExporting(false);
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

	async function confirmRestore() {
		if (!pending || busy) return;
		setBusy(true);
		try {
			let studioReport: StudioRestoreReport | null = null;
			if (pending.studio) {
				const studio = await restoreStudioBackup(pending.studio, mode);
				if (!studio.ok) {
					setMessage({
						text: `Couldn't restore Studio projects: ${studio.error.message}`,
						error: true,
					});
					return;
				}
				studioReport = studio.value;
			}

			let analyticsDays = 0;
			if (pending.analytics != null) {
				const analytics = restoreAnalyticsBackup(pending.analytics, mode);
				if (!analytics.ok) {
					setMessage({
						text: `Couldn't restore learning history: ${analytics.error}`,
						error: true,
					});
					return;
				}
				analyticsDays = analytics.daysImported;
			}

			if (mode === 'merge') {
				setMessage({
					text: mergeMessage(mergeBackup(pending), studioReport, analyticsDays),
					error: false,
				});
			} else {
				applyBackup(pending);
				setMessage({
					text: replaceMessage(pending, studioReport, analyticsDays),
					error: false,
				});
			}
		} catch {
			setMessage({ text: "Couldn't restore that backup.", error: true });
		} finally {
			setBusy(false);
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
						Move your playlists, videos, folders, progress, timestamped Markdown
						notes and Studio projects to another browser or device with one JSON
						file. Your API key and player settings stay on this device.
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
						<Button
							onClick={() => void handleDownload()}
							disabled={!hydrated || exporting || busy}
						>
							<HardDriveDownload className="size-4" />{' '}
							{exporting ? 'Preparing…' : 'Download backup'}
						</Button>
						<Button
							variant="outline"
							onClick={() => fileInput.current?.click()}
							disabled={!hydrated || busy || exporting}
						>
							<Upload className="size-4" />{' '}
							{busy ? 'Working…' : 'Restore from file'}
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
							? pending.studio
								? 'These are added to what is already saved here. Nothing is removed, and the newest progress and notes win. Studio projects already linked here are kept as they are.'
								: 'These are added to what is already saved here. Nothing is removed, and the newest progress and notes win. Your existing Studio projects are left unchanged because this backup has no Studio data.'
							: pending.studio
								? 'This overwrites the playlists, videos, progress, notes and Studio projects saved here. Download a backup first if you want to keep them.'
								: 'This overwrites the playlists, videos, progress and notes saved here. Your existing Studio projects are left unchanged because this backup has no Studio data.'}
						</p>

						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => setPending(null)}
								disabled={busy}
							>
								Cancel
							</Button>
							<Button
								variant={mode === 'replace' ? 'destructive' : 'default'}
								onClick={() => void confirmRestore()}
								disabled={busy}
							>
								{busy
									? 'Restoring…'
									: mode === 'replace'
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
				{preview.studioProjects !== null && (
					<PreviewStat value={preview.studioProjects} label="Studio projects" />
				)}
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

function replaceMessage(
	backup: Backup,
	studio: StudioRestoreReport | null,
	analyticsDays: number,
): string {
	const base = `Replaced this browser's data with ${backupSummary(backup)}.`;
	const analytics =
		analyticsDays > 0 ? ` ${analyticsDays} day${analyticsDays === 1 ? '' : 's'} of learning history imported.` : '';
	if (!backup.studio) {
		return `${base}${analytics} Your Studio projects were left unchanged because this older backup has no Studio data.`;
	}
	if (studio && studio.projectsSkipped > 0) {
		return `${base}${analytics} ${studio.projectsSkipped} unreadable Studio project${studio.projectsSkipped === 1 ? ' was' : 's were'} skipped.`;
	}
	return `${base}${analytics}`;
}

function mergeMessage(
	report: MergeReport,
	studio: StudioRestoreReport | null,
	analyticsDays: number,
): string {
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
	if (studio && studio.projectsAdded > 0) {
		parts.push(
			`${studio.projectsAdded} Studio project${studio.projectsAdded === 1 ? '' : 's'} added`
		);
	}
	if (analyticsDays > 0) {
		parts.push(
			`${analyticsDays} day${analyticsDays === 1 ? '' : 's'} of learning history`
		);
	}
	if (parts.length === 0) {
		return 'Merged — everything in that file was already saved here.';
	}
	return `Merged — ${parts.join(' · ')}.`;
}
