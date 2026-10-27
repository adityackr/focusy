'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Chapter } from '@/lib/types';
import { formatDuration, formatTimestamp } from '@/lib/chapters';
import { Check, Clock, Flag, Play } from 'lucide-react';

/** Short, clearly-a-duration label (e.g. "45s", "5m 30s", "1h 2m") so it can't be mistaken for a timestamp. */
function formatShortDuration(totalSeconds: number): string {
	const s = Math.max(0, Math.round(totalSeconds));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
	if (m > 0) return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
	return `${sec}s`;
}

interface Props {
	chapters: Chapter[];
	activeId: string | null;
	completedIds: string[];
	onSelect: (id: string) => void;
	onToggleComplete: (id: string) => void;
}

export default function ChapterSidebar({
	chapters,
	activeId,
	completedIds,
	onSelect,
	onToggleComplete,
}: Props) {
	return (
		<ol className="divide-y">
			{chapters.map((c, i) => {
				const active = c.id === activeId;
				const done = completedIds.includes(c.id);
				return (
					<li key={c.id} className={active ? 'bg-muted' : ''}>
						<div className="flex items-start gap-2 px-3 py-2.5">
							<Button
								variant="outline"
								size="icon"
								onClick={() => onToggleComplete(c.id)}
								aria-label={
									done
										? `Mark "${c.title}" incomplete`
										: `Mark "${c.title}" complete`
								}
								title={done ? 'Mark incomplete' : 'Mark complete'}
								className={`mt-0.5 size-5 rounded-full p-0 ${
									done
										? 'border-green-600 bg-green-600 text-white hover:bg-green-600 hover:text-white dark:border-green-600 dark:bg-green-600 dark:text-white dark:hover:bg-green-600 dark:hover:text-white'
										: 'text-transparent'
								}`}
							>
								<Check className="size-3" />
							</Button>
							<Button
								variant="ghost"
								onClick={() => onSelect(c.id)}
								className="h-auto min-w-0 flex-1 justify-start px-1 py-0.5 text-left font-normal"
							>
								<span className="min-w-0">
									<span className="flex items-baseline gap-2">
										<Badge
											variant="secondary"
											className="shrink-0 font-mono"
											title={`Starts at ${formatTimestamp(c.startSeconds)}`}
										>
											<Play className="size-3" aria-hidden />
											{formatTimestamp(c.startSeconds)}
										</Badge>
										<span
											title={`${i + 1}. ${c.title}`}
											className={`min-w-0 flex-1 line-clamp-2 text-sm break-words ${active ? 'font-semibold' : ''} ${done ? 'text-muted-foreground line-through' : ''}`}
										>
											{i + 1}. {c.title}
										</span>
									</span>
									<span className="mt-0.5 flex items-center gap-1.5 pl-1 font-mono text-xs text-muted-foreground">
										{c.endSeconds != null ? (
											<>
												<span
													className="inline-flex items-center gap-1"
													title={`Ends at ${formatTimestamp(c.endSeconds)}`}
												>
													<Flag className="size-3" aria-hidden />
													<span className="sr-only">Ends at </span>
													{formatTimestamp(c.endSeconds)}
												</span>
												<span aria-hidden>•</span>
												<span
													className="inline-flex items-center gap-1"
													title={`Lesson length ${formatDuration(Math.max(1, Math.round(c.endSeconds - c.startSeconds)))}`}
												>
													<Clock className="size-3" aria-hidden />
													{formatShortDuration(
														Math.max(
															1,
															Math.round(c.endSeconds - c.startSeconds),
														),
													)}
												</span>
											</>
										) : (
											<span>Plays to end</span>
										)}
									</span>
								</span>
							</Button>
						</div>
					</li>
				);
			})}
		</ol>
	);
}