import { ThemeProvider } from '@/shared/providers';
import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';
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
				</ThemeProvider>
			</body>
		</html>
	);
}
