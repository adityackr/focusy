import { ThemeProvider } from '@/shared/providers';
import { ServiceWorkerRegister } from '@/shared/components/sw-register';
import { KEYWORDS, SITE, SITE_URL } from '@/shared/lib/site';
import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
	metadataBase: new URL(SITE_URL),
	title: {
		default: SITE.title,
		template: `%s · ${SITE.name}`,
	},
	description: SITE.description,
	keywords: [...KEYWORDS],
	applicationName: SITE.name,
	manifest: '/manifest.webmanifest',
	icons: {
		icon: [
			{ url: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
			{ url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' },
			{ url: '/icons/icon-512.png', type: 'image/png', sizes: '512x512' },
		],
		apple: [{ url: '/icons/apple-touch-icon.png', type: 'image/png', sizes: '180x180' }],
	},
	appleWebApp: {
		capable: true,
		title: SITE.name,
		statusBarStyle: 'default',
	},
	authors: [{ name: SITE.author.name, url: SITE.author.url }],
	creator: SITE.author.name,
	publisher: SITE.author.name,
	category: 'education',
	// `title` / `description` are intentionally omitted from openGraph: they
	// inherit each route's own resolved values, so every page ships matching
	// og:title / og:description without repeating them. `url` lives on the
	// pages themselves so shares point at the right route.
	openGraph: {
		type: 'website',
		locale: SITE.locale,
		siteName: SITE.name,
	},
	twitter: {
		// Title, description and image are auto-filled from the OpenGraph tags.
		card: 'summary_large_image',
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			'max-image-preview': 'large',
			'max-snippet': -1,
			'max-video-preview': -1,
		},
	},
};

// Viewport theme colors match globals.css (dark is the default theme).
export const viewport: Viewport = {
	themeColor: [
		{ media: '(prefers-color-scheme: light)', color: '#f6fafe' },
		{ media: '(prefers-color-scheme: dark)', color: '#06101d' },
	],
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang={SITE.lang} suppressHydrationWarning>
			<body className={`${inter.variable} font-sans antialiased`}>
				{/* Hoisted to <head> by React: warm up the YouTube origins used by
				    thumbnails and the player (a page-speed win for media-heavy routes). */}
				<link rel="preconnect" href="https://i.ytimg.com" />
				<link rel="preconnect" href="https://www.youtube.com" />
				<ThemeProvider>
					{children}
					<Toaster richColors position="top-center" />
					<Analytics />
					<ServiceWorkerRegister />
				</ThemeProvider>
			</body>
		</html>
	);
}
