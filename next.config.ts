import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{ protocol: 'https', hostname: 'i.ytimg.com' },
			{ protocol: 'https', hostname: 'img.youtube.com' },
		],
	},
	allowedDevOrigins: ['192.168.0.105'],
};

export default nextConfig;
