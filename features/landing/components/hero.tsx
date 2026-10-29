'use client';

import {
	Reveal,
	prefersReducedMotion,
	useInView,
} from '@/features/landing/components/reveal';
import { Typewriter } from '@/features/landing/components/typewriter';
import { AddPlaylistButton } from '@/features/playlists';
import { cn } from '@/shared/lib/utils';
import { Badge } from '@/shared/ui/badge';
import { buttonVariants } from '@/shared/ui/button';
import { ArrowRight, Clapperboard, LibraryBig } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/** Rotating phrases typed into the second line of the headline. */
const HEADLINE_PHRASES = [
	'without the rabbit hole.',
	'one lesson at a time.',
	'with zero distractions.',
];

const stats: Array<[string, string]> = [
	['100%', 'distraction-free'],
	['0', 'accounts needed'],
	['1-click', 'video & playlist import'],
];

const mockLessons = [
	'01 · Getting started',
	'02 · Core concepts',
	'03 · Build & ship',
];

/**
 * Animates the leading number of a stat ("100%", "1-click") from 0 once it
 * scrolls into view. Renders the final value on the server and keeps it there
 * under prefers-reduced-motion.
 */
function CountUp({ text }: { text: string }) {
	const { ref, visible } = useInView<HTMLSpanElement>();
	const match = /^(\d+)(.*)$/.exec(text);
	const target = match ? Number(match[1]) : null;
	const suffix = match ? match[2] : '';
	const [value, setValue] = useState(text);

	useEffect(() => {
		if (!visible || target === null || prefersReducedMotion()) return;

		let raf = 0;
		const duration = 1200;
		const start = performance.now();
		const step = (now: number) => {
			const p = Math.min(1, (now - start) / duration);
			const eased = 1 - Math.pow(1 - p, 3);
			setValue(`${Math.round(target * eased)}${suffix}`);
			if (p < 1) raf = requestAnimationFrame(step);
		};

		setValue(`0${suffix}`);
		raf = requestAnimationFrame(step);
		return () => cancelAnimationFrame(raf);
	}, [visible, target, suffix]);

	return <span ref={ref}>{value}</span>;
}

function HeroCopy() {
	return (
		<div>
			<h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
				<span className="sr-only">
					Learn from YouTube {HEADLINE_PHRASES[0]}
				</span>
				<span aria-hidden className="block">
					Learn from YouTube
					<span className="mt-1 block min-h-[2.1em] animate-gradient-text bg-linear-to-r from-primary via-[#5B78F0] to-[#8AA5FF] bg-clip-text text-transparent">
						<Typewriter
							phrases={HEADLINE_PHRASES}
							caretClassName="text-primary"
						/>
					</span>
				</span>
			</h1>
			<p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
				Paste a video or a playlist link and get a calm, course-style classroom:
				chapter-by-chapter lessons, a collapsible sidebar, and nothing else
				competing for your attention.
			</p>
			<div className="flex flex-col gap-y-3">
				<div className="mt-8 flex items-center justify-between sm:justify-start gap-3">
					<Link
						href="/add"
						className={cn(
							buttonVariants({ size: 'lg' }),
							'h-12 px-4 text-base sm:px-7 flex-1',
						)}
					>
						Add a video <ArrowRight className="size-4" />
					</Link>
					<AddPlaylistButton
						variant="outline"
						className="h-12 px-4 text-base sm:px-7 flex-1"
					/>
				</div>
				<Link
					href="/library"
					className={cn(buttonVariants({ size: 'lg', variant: 'secondary' }))}
				>
					<LibraryBig className="size-4" /> Explore library
				</Link>
			</div>
			<dl className="mt-10 flex flex-wrap gap-8">
				{stats.map(([v, l], i) => (
					<div
						key={l}
						className="animate-pop"
						style={{ animationDelay: `${450 + i * 120}ms` }}
					>
						<dt className="text-2xl font-extrabold tracking-tight">
							<CountUp text={v} />
						</dt>
						<dd className="text-sm text-muted-foreground">{l}</dd>
					</div>
				))}
			</dl>
		</div>
	);
}

function HeroVisual() {
	const cardRef = useRef<HTMLDivElement>(null);
	const [tilt, setTilt] = useState({ x: 0, y: 0 });

	/** Subtle 3D parallax while the pointer is over the classroom mock. */
	const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		if (e.pointerType !== 'mouse' || prefersReducedMotion()) return;
		const el = cardRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const px = (e.clientX - rect.left) / rect.width - 0.5;
		const py = (e.clientY - rect.top) / rect.height - 0.5;
		setTilt({ x: -py * 5, y: px * 7 });
	};

	return (
		<div className="relative">
			<div className="animate-float">
				<div
					ref={cardRef}
					onPointerMove={handlePointerMove}
					onPointerLeave={() => setTilt({ x: 0, y: 0 })}
					style={{
						transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
					}}
					className="rounded-3xl border bg-card p-3 shadow-2xl shadow-primary/10 transition-transform duration-500 ease-out will-change-transform"
				>
					<div className="overflow-hidden rounded-2xl bg-black">
						<div className="relative flex aspect-video flex-col items-center justify-center gap-3 bg-linear-to-br from-zinc-900 via-zinc-900 to-[#251a10] text-white">
							<span className="relative flex size-16 items-center justify-center rounded-full bg-primary shadow-xl shadow-primary/40">
								<span aria-hidden className="ping-ring text-primary" />
								<Clapperboard className="size-7" />
							</span>
							<p className="text-sm font-medium text-zinc-300">
								Your YouTube, as a classroom
							</p>
							<div
								aria-hidden
								className="absolute inset-x-0 bottom-0 h-1.5 bg-white/15"
							>
								<div className="progress-fill h-full bg-primary" />
							</div>
						</div>
					</div>
					<div className="space-y-2 p-2">
						{mockLessons.map((t, i) => (
							<div
								key={t}
								className={cn(
									'animate-pop flex items-center gap-3 rounded-xl border p-2.5 text-sm',
									i === 0 ? 'border-primary/50 bg-primary/5' : 'opacity-70',
								)}
								style={{ animationDelay: `${300 + i * 130}ms` }}
							>
								<span className="flex size-9 items-center justify-center rounded-lg bg-muted font-bold">
									{i + 1}
								</span>
								<span className="font-medium">{t}</span>
								{i === 0 && (
									<Badge className="relative ml-auto gap-1.5">
										<span className="relative flex size-1.5 rounded-full bg-primary">
											<span aria-hidden className="ping-ring text-primary" />
										</span>
										Now playing
									</Badge>
								)}
							</div>
						))}
					</div>
				</div>
			</div>
			<div
				aria-hidden
				className="animate-orb absolute -right-6 -top-6 -z-10 size-40 rounded-full bg-primary/20 blur-3xl"
			/>
			<div
				aria-hidden
				className="animate-orb absolute -bottom-8 -left-8 -z-10 size-48 rounded-full bg-[#5B78F0]/25 blur-3xl"
				style={{ animationDelay: '-6s' }}
			/>
		</div>
	);
}

export function HeroSection() {
	return (
		<section className="relative overflow-hidden">
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_50%_-8rem,oklch(0.55_0.2_262/0.18),transparent)]"
			/>
			<div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-24">
				<Reveal>
					<HeroCopy />
				</Reveal>
				<Reveal delay={150}>
					<HeroVisual />
				</Reveal>
			</div>
		</section>
	);
}
