import Link from "next/link";
import { AddPlaylistButton } from "@/components/add-playlist-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CtaSection() {
  return (
		<section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
			<div className="relative overflow-hidden rounded-3xl bg-zinc-950 p-8 text-white sm:p-12">
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_20rem_at_80%_0%,oklch(0.68_0.13_64/0.45),transparent)]"
				/>
				<div className="relative flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<h2 className="max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">
							Ready to learn without getting sidetracked?
						</h2>
						<p className="mt-3 max-w-xl text-zinc-400">
							Import your first playlist now. It stays in your browser library —
							ready whenever you are.
						</p>
					</div>
					<div className="flex flex-wrap gap-3">
						<AddPlaylistButton className="h-12 px-7 text-base" />
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
			<footer className="mt-10 flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
				<p>FocusTube · distraction-free YouTube playlists</p>
				<div>
					&copy; {new Date().getFullYear()} · All rights reserved ·{' '}
					<Link href={'https://adityackr.vercel.app'} className='text-primary underline'>Aditya Chakraborty</Link>
				</div>
			</footer>
		</section>
	);
}
