import Link from "next/link";
import { AddPlaylistButton } from "@/features/playlists";
import { buttonVariants } from "@/shared/ui/button";
import { Reveal } from "@/features/landing/components/reveal";
import { cn } from "@/shared/lib/utils";

export function CtaSection() {
  return (
		<section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
			<Reveal>
			<div className="relative overflow-hidden rounded-3xl bg-[#0B1226] p-8 text-white sm:p-12">
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_20rem_at_80%_0%,oklch(0.63_0.165_258/0.55),transparent)]"
				/>
				<div className="relative flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<h2 className="max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">
							Ready to learn without getting sidetracked?
						</h2>
						<p className="mt-3 max-w-xl text-zinc-400">
							Add a video or import a playlist now. It stays in your browser library —
							ready whenever you are.
						</p>
					</div>
					<div className="flex flex-wrap gap-3">
						<Link
							href="/add"
							className={cn(buttonVariants({ size: 'lg' }), 'h-12 px-7 text-base')}
						>
							Add a video
						</Link>
						<AddPlaylistButton
							variant="secondary"
							className="h-12 px-7 text-base"
						/>
						<Link
							href="/library"
							className={cn(
								buttonVariants({ variant: 'secondary', size: 'lg' }),
							)}
						>
							Open library
						</Link>
					</div>
				</div>
			</div>
			</Reveal>
			<footer className="mt-10 space-y-4 text-sm text-muted-foreground">
				<nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:justify-start">
					{[
						{ href: "/#features", label: "Features" },
						{ href: "/#how", label: "How it works" },
						{ href: "/#faq", label: "FAQ" },
						{ href: "/add", label: "Add video" },
						{ href: "/library", label: "Library" },
						{ href: "/settings", label: "Settings" },
					].map((l) => (
						<Link
							key={l.label}
							href={l.href}
							className="font-medium hover:text-foreground"
						>
							{l.label}
						</Link>
					))}
				</nav>
				<div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
					<p>Focusy · distraction-free YouTube learning</p>
					<div>
						&copy; {new Date().getFullYear()} · All rights reserved ·{' '}
						<Link href={'https://adityackr.vercel.app'} className='text-primary underline'>Aditya Chakraborty</Link>
					</div>
				</div>
			</footer>
		</section>
	);
}
