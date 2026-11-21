'use client';

import { useAllBookmarks } from '@/features/bookmarks';
import { selectQueuedInboxCount, useInbox } from '@/features/inbox';
import { AddPlaylistDialog } from '@/features/playlists';
import { useAllResources } from '@/features/resources';
import { openGlobalSearch } from '@/features/search';
import { LogoMark } from '@/features/shell/components/logo';
import { ThemeToggle } from '@/features/shell/components/theme-toggle';
import { useAllNotes } from '@/shared/lib/learning-notes';
import { cn } from '@/shared/lib/utils';
import { useLibrary } from '@/shared/store/library';
import { Button, buttonVariants } from '@/shared/ui/button';
import {
	Award,
	BarChart3,
	Bookmark,
	ChevronsLeft,
	Folder,
	Heart,
	History,
	Inbox,
	LayoutGrid,
	NotebookPen,
	Paperclip,
	Plus,
	Search,
	Settings,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV = [
	{ href: '/library', label: 'Library', icon: LayoutGrid },
	{ href: '/inbox', label: 'Inbox', icon: Inbox },
	{ href: '/recent', label: 'Recent', icon: History },
	{ href: '/notes', label: 'Notes', icon: NotebookPen },
	{ href: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
	{ href: '/resources', label: 'Resources', icon: Paperclip },
	{ href: '/analytics', label: 'Analytics', icon: BarChart3 },
	{ href: '/certificates', label: 'Certificates', icon: Award },
	{ href: '/categories', label: 'Categories', icon: Folder },
	{ href: '/favorites', label: 'Favorites', icon: Heart },
	{ href: '/settings', label: 'Settings', icon: Settings },
];

export function AppSidebar({
	collapsed,
	onToggle,
	onNavigate,
}: {
	collapsed: boolean;
	onToggle: () => void;
	onNavigate?: () => void;
}) {
	const {
		pathname,
		favCount,
		notesCount,
		inboxCount,
		bookmarkCount,
		resourceCount,
	} = useAppSidebar();
	const [dialogOpen, setDialogOpen] = useState(false);

	const counts: Record<string, number> = {
		'/favorites': favCount,
		'/notes': notesCount,
		'/inbox': inboxCount,
		'/bookmarks': bookmarkCount,
		'/resources': resourceCount,
	};

	const searchButton = (
		<button
			type="button"
			onClick={() => {
				openGlobalSearch();
				onNavigate?.();
			}}
			aria-keyshortcuts="Control+K Meta+K"
			title="Search everything (⌘K)"
			aria-label="Search everything"
			className={cn(
				'flex items-center gap-2 rounded-xl border bg-background text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
				collapsed ? 'w-full justify-center px-0 py-2' : 'w-full px-3 py-2',
			)}
		>
			<Search className="size-4 shrink-0" />
			{!collapsed && (
				<>
					<span className="flex-1 text-left">Search everything</span>
					<kbd className="shrink-0 rounded border bg-muted px-1 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
						⌘K
					</kbd>
				</>
			)}
		</button>
	);

	return (
		<aside
			className={cn(
				'flex h-full flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300',
				collapsed ? 'w-19' : 'w-72',
			)}
		>
			<div
				className={cn(
					'relative flex items-center gap-2 p-3',
					collapsed && 'justify-center',
				)}
			>
				<Link
					href="/"
					className={cn(
						'flex min-w-0 items-center gap-2.5 rounded-xl p-1.5 hover:bg-sidebar-accent',
						!collapsed && 'flex-1',
					)}
				>
					<LogoMark size={36} />
					{!collapsed && (
						<span className="truncate leading-tight">
							<span className="block truncate text-sm font-extrabold">
								Focus<span className="text-primary">y</span>
							</span>
							<span className="block text-[11px] text-muted-foreground">
								focus mode
							</span>
						</span>
					)}
				</Link>
				<Button
					variant="ghost"
					size="icon"
					onClick={onToggle}
					aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
					className={cn(
						'shrink-0',
						collapsed &&
							'absolute -right-3 top-1/2 z-20 h-6 w-6 -translate-y-1/2 rounded-full border bg-sidebar shadow-sm [&_svg]:size-3.5',
					)}
				>
					<ChevronsLeft
						className={cn(
							'size-4 transition-transform',
							collapsed && 'rotate-180',
						)}
					/>
				</Button>
			</div>

			<div className="px-3 pb-3">{searchButton}</div>

			<nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
				{NAV.map((n) => {
					const active =
						pathname === n.href || pathname.startsWith(`${n.href}/`);
					const count = counts[n.href] ?? 0;
					return (
						<Link
							key={n.href}
							href={n.href}
							onClick={onNavigate}
							title={n.label}
							className={cn(
								'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
								active
									? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
									: 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
								collapsed && 'justify-center px-0',
							)}
						>
							<n.icon className="size-4 shrink-0" />
							{!collapsed && <span>{n.label}</span>}
							{!collapsed && count > 0 && (
								<span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">
									{count}
								</span>
							)}
						</Link>
					);
				})}
			</nav>

			<div className="px-3 my-3">
				{collapsed ? (
					<Button
						variant="outline"
						size="icon"
						onClick={() => setDialogOpen(true)}
						aria-label="Add playlist"
						className="mt-2 w-full"
					>
						<Plus className="size-4" />
					</Button>
				) : (
					<div className="mt-2 flex gap-2">
						<Link
							href="/add"
							onClick={onNavigate}
							className={cn(
								buttonVariants({ variant: 'outline' }),
								'h-9 flex-1 px-3',
							)}
						>
							<Plus className="size-4" /> Add video
						</Link>
						<Button
							onClick={() => setDialogOpen(true)}
							className="h-9 flex-1 px-3"
						>
							<Plus className="size-4" /> Playlist
						</Button>
					</div>
				)}
			</div>

			<div className="mt-auto border-t p-3">
				<ThemeToggle collapsed={collapsed} />
			</div>

			<AddPlaylistDialog open={dialogOpen} onOpenChange={setDialogOpen} />
		</aside>
	);
}

/**
 * Navigation state and badge counts for `AppSidebar` — kept out of the JSX.
 */
function useAppSidebar() {
	const pathname = usePathname();
	const favCount = useLibrary(
		(s) => s.favorites.length + s.courseFavorites.length,
	);
	const notesCount = useAllNotes().length;
	const inboxCount = useInbox(selectQueuedInboxCount);
	const bookmarkCount = useAllBookmarks().length;
	const resourceCount = useAllResources().length;

	return {
		pathname,
		favCount,
		notesCount,
		inboxCount,
		bookmarkCount,
		resourceCount,
	};
}
