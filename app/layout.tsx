import { ThemeProvider } from '@/shared/providers';
import { ServiceWorkerRegister } from '@/shared/components/sw-register';
import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
	title: {
		default: 'Focusy — distraction-free YouTube learning',
		template: '%s · Focusy',
	},
	description:
		'Turn any YouTube video or playlist into a focused, course-style classroom — no recommendations, no shorts, no rabbit holes.',
	applicationName: 'Focusy',
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
		title: 'Focusy',
		statusBarStyle: 'default',
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
		<html lang="en" suppressHydrationWarning>
			<body className={`${inter.variable} font-sans antialiased`}>
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
