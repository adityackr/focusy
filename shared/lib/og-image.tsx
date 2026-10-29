import { ImageResponse } from "next/og";
import { SITE } from "@/shared/lib/site";

/**
 * OpenGraph / Twitter card artwork (1200×630), rendered with `next/og`.
 *
 * Deliberately free of `fontWeight`: the bundled default font ships a single
 * (400) weight, so hierarchy comes from size and colour instead.
 */

export const OG_ALT = `${SITE.name} — ${SITE.tagline}`;

export const OG_SIZE = { width: 1200, height: 630 } as const;

/** The Focusy mark: gradient squircle with a white play triangle. */
function LogoTile() {
	return (
		<div
			style={{
				width: 96,
				height: 96,
				borderRadius: 28,
				background: "linear-gradient(135deg, #8FA8FF 0%, #3E5CEB 100%)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<svg width="52" height="52" viewBox="0 0 48 48" fill="none">
				<path
					d="M20.5 17.8v12.4c0 1.1 1.2 1.8 2.2 1.2l9.6-6.2c.9-.6.9-1.9 0-2.5l-9.6-6.2c-1-.6-2.2.1-2.2 1.3z"
					fill="#FFFFFF"
					stroke="#FFFFFF"
					strokeWidth="2.5"
					strokeLinejoin="round"
				/>
			</svg>
		</div>
	);
}

export function ogImage() {
	return new ImageResponse(
		(
			<div
				style={{
					width: "100%",
					height: "100%",
					display: "flex",
					flexDirection: "column",
					justifyContent: "space-between",
					padding: 72,
					background:
						"linear-gradient(135deg, #06101D 0%, #0B1226 55%, #16224A 100%)",
					color: "#F6FAFE",
				}}
			>
				{/* brand row */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						width: "100%",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: 24 }}>
						<LogoTile />
						<div style={{ display: "flex", flexDirection: "column" }}>
							<span style={{ fontSize: 44, letterSpacing: -1 }}>
								Focus
								<span style={{ color: "#8FA8FF" }}>y</span>
							</span>
							<span style={{ fontSize: 22, color: "#93A4C7" }}>
								{SITE.tagline}
							</span>
						</div>
					</div>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							padding: "10px 22px",
							borderRadius: 999,
							border: "1px solid rgba(143,168,255,0.45)",
							color: "#8FA8FF",
							fontSize: 22,
						}}
					>
						Free · no account
					</div>
				</div>

				{/* headline */}
				<div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
					<span style={{ fontSize: 84, letterSpacing: -3, lineHeight: 1.05 }}>
						Learn from YouTube
					</span>
					<span
						style={{
							fontSize: 84,
							letterSpacing: -3,
							lineHeight: 1.05,
							color: "#8FA8FF",
						}}
					>
						without the rabbit hole.
					</span>
					<span style={{ fontSize: 32, color: "#A9B7D8", maxWidth: 940 }}>
						Paste any video or playlist and get a calm, course-style classroom:
						chapter lessons, progress tracking, zero distractions.
					</span>
				</div>

				{/* footer row */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						width: "100%",
						borderTop: "1px solid rgba(255,255,255,0.12)",
						paddingTop: 24,
					}}
				>
					<span style={{ fontSize: 26, color: "#F6FAFE" }}>
						YouTube → course-style classroom
					</span>
					<span style={{ fontSize: 26, color: "#93A4C7" }}>
						No account · No tracking · Works offline
					</span>
				</div>
			</div>
		),
		{ ...OG_SIZE }
	);
}
