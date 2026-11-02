'use client';

import { parsePlaylistInput } from '@/shared/lib/utils';
import { useLibrary } from '@/shared/store/library';
import { Button, type ButtonProps } from '@/shared/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { CategoryPicker } from '@/shared/components/category-dialog';
import { Link2, Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function AddPlaylistButton({
	className,
	variant = 'default',
}: {
	className?: string;
	variant?: ButtonProps['variant'];
}) {
	const { open, setOpen } = useAddPlaylistButton();
	return (
		<>
			<Button
				size={'lg'}
				onClick={() => setOpen(true)}
				className={className}
				variant={variant}
			>
				<Plus className="size-4" /> Add playlist
			</Button>
			<AddPlaylistDialog open={open} onOpenChange={setOpen} />
		</>
	);
}

export function AddPlaylistDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
}) {
	const { value, setValue, categoryId, setCategoryId, busy, handleSubmit } =
		useAddPlaylistDialog(open, onOpenChange);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Add a playlist</DialogTitle>
					<DialogDescription>
						Paste a YouTube playlist ID or full link. We&apos;ll import it so
						you can watch it without recommendations or distractions.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="relative">
						<Link2 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							autoFocus
							value={value}
							onChange={(e) => setValue(e.target.value)}
							placeholder="e.g. https://www.youtube.com/playlist?list=PL…"
							className="pl-10"
						/>
					</div>
					<div className="space-y-2">
						<Label>Category (optional)</Label>
						<CategoryPicker
							selectedId={categoryId}
							onSelect={setCategoryId}
						/>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="ghost"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={busy}>
							{busy && <Loader2 className="size-4 animate-spin" />}
							{busy ? 'Importing…' : 'Import playlist'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

/** Open state for the `AddPlaylistButton` trigger. */
function useAddPlaylistButton() {
	const [open, setOpen] = useState(false);
	return { open, setOpen };
}

/** Import form state + submit handler for `AddPlaylistDialog` — kept out of the JSX. */
function useAddPlaylistDialog(
	open: boolean,
	onOpenChange: (v: boolean) => void,
) {
	const [value, setValue] = useState('');
	const [categoryId, setCategoryId] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const fetchPlaylist = useLibrary((s) => s.fetchPlaylist);
	const playlists = useLibrary((s) => s.playlists);
	const router = useRouter();

	// Every open starts from a clean form.
	useEffect(() => {
		if (!open) return;
		setValue('');
		setCategoryId(null);
	}, [open]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const id = parsePlaylistInput(value);
		if (!id) {
			toast.error('Paste a valid playlist ID or YouTube playlist link.');
			return;
		}
		if (playlists[id]) {
			toast.info('That playlist is already in your library.');
			onOpenChange(false);
			router.push(`/watch/${id}`);
			return;
		}
		setBusy(true);
		const ok = await fetchPlaylist(id);
		setBusy(false);
		if (ok) {
			if (categoryId) {
				useLibrary.getState().setPlaylistCategory(id, categoryId);
			}
			toast.success('Playlist added to your library.');
			setValue('');
			onOpenChange(false);
			router.push(`/watch/${id}`);
		} else {
			toast.error(
				useLibrary.getState().error ?? 'Could not fetch that playlist.',
			);
		}
	}

	return { value, setValue, categoryId, setCategoryId, busy, handleSubmit };
}
