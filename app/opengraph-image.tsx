import { ogImage, OG_ALT, OG_SIZE } from "@/shared/lib/og-image";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
	return ogImage();
}
