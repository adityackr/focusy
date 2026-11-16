export type CertificateOrientation = "landscape" | "portrait";

export interface CertificateImageInput {
  name: string;
  courseTitle: string;
  channelTitle?: string;
  completedLabel: string;
  issuedLabel: string;
  reference: string;
  completed: number;
  total: number;
}

export const CERTIFICATE_IMAGE_SIZE = {
  landscape: { width: 1600, height: 1131 },
  portrait: { width: 1131, height: 1600 },
} as const;

const FONT =
  "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

function escapeXml(value: string): string {
  return value.replace(
    /[<>&'"]/g,
    (character) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;",
      })[character] ?? character
  );
}

function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [""];
  const lines: string[] = [];
  let current = "";

  for (const word of normalized.split(" ")) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    if (word.length <= maxChars) {
      current = word;
    } else {
      lines.push(word.slice(0, maxChars));
      current = word.slice(maxChars);
    }
  }
  if (current) lines.push(current);

  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1]
    .slice(0, Math.max(1, maxChars - 1))
    .trimEnd()}…`;
  return kept;
}

function textLines(
  lines: string[],
  x: number,
  startY: number,
  lineHeight: number,
  attributes: string
): string {
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${startY + index * lineHeight}" text-anchor="middle" ${attributes}>${escapeXml(line)}</text>`
    )
    .join("");
}

export function certificateSvg(
  input: CertificateImageInput,
  orientation: CertificateOrientation = "landscape"
): string {
  const portrait = orientation === "portrait";
  const { width: WIDTH, height: HEIGHT } = CERTIFICATE_IMAGE_SIZE[orientation];
  const centerX = WIDTH / 2;

  const nameLines = wrapText(
    input.name || "Your name",
    portrait ? 26 : 32,
    2
  );
  const titleLines = wrapText(
    input.courseTitle,
    portrait ? 42 : 58,
    3
  );
  const hasChannel = Boolean(input.channelTitle?.trim());

  const nameSize = portrait ? 50 : 56;
  const nameLine = portrait ? 58 : 64;
  const titleSize = portrait ? 30 : 32;
  const titleLine = portrait ? 38 : 40;
  const certifyY = portrait ? 390 : 330;

  let y = certifyY + 58;
  const nameStart = y;
  y = nameStart + nameLines.length * nameLine;
  const dividerY = y - 22;
  const introY = y + 24;
  y = introY + 44;
  const titleStart = y;
  y = titleStart + titleLines.length * titleLine;
  if (hasChannel) y += 28;
  const statsTop = Math.max(y + 54, portrait ? 880 : 760);
  const statsBottom = statsTop + (portrait ? 120 : 108);
  const statsInset = portrait ? 120 : 220;
  const statsColumns = portrait ? [265, 565, 865] : [420, 800, 1180];
  const statsValueSize = portrait ? 20 : 22;
  const footerY = portrait ? 1260 : 974;
  const sealX = portrait ? 160 : 180;
  const footerRightX = WIDTH - (portrait ? 160 : 220);
  const disclaimerY = portrait ? 1460 : 1072;
  const badgeWidth = 354;
  const badgeHeight = 36;
  const badgeX = WIDTH - 98 - badgeWidth;
  const badgeY = portrait ? 86 : 82;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#3E5CEB"/>
      <stop offset="0.55" stop-color="#7C93FF"/>
      <stop offset="1" stop-color="#3E5CEB"/>
    </linearGradient>
    <linearGradient id="logo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8FA8FF"/>
      <stop offset="1" stop-color="#3E5CEB"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#fffdf8"/>
  <circle cx="${WIDTH - 80}" cy="60" r="300" fill="#3E5CEB" opacity="0.045"/>
  <circle cx="60" cy="${HEIGHT - 31}" r="320" fill="#E8B85C" opacity="0.065"/>
  <rect x="40" y="40" width="${WIDTH - 80}" height="8" rx="4" fill="url(#accent)"/>
  <rect x="40" y="40" width="${WIDTH - 80}" height="${HEIGHT - 80}" rx="30" fill="none" stroke="#3E5CEB" stroke-opacity="0.22" stroke-width="2"/>
  <rect x="58" y="58" width="${WIDTH - 116}" height="${HEIGHT - 116}" rx="24" fill="none" stroke="#e2e8f0" stroke-width="1.5"/>

  <g transform="translate(100 76)">
    <rect width="56" height="56" rx="16" fill="url(#logo)"/>
    <rect x="16" y="14" width="8" height="28" rx="3" fill="#ffffff"/>
    <rect x="16" y="14" width="23" height="8" rx="3" fill="#ffffff"/>
    <rect x="16" y="26" width="19" height="7.5" rx="3" fill="#ffffff"/>
  </g>
  <text x="176" y="102" font-family="${FONT}" font-size="25" font-weight="800" fill="#0f172a">Focus<tspan fill="#3E5CEB">y</tspan></text>
  <text x="176" y="126" font-family="${FONT}" font-size="11" font-weight="600" letter-spacing="2.6" fill="#64748b">LOCAL LEARNING RECORD</text>

  <rect x="${badgeX}" y="${badgeY}" width="${badgeWidth}" height="${badgeHeight}" rx="18" fill="#3E5CEB" fill-opacity="0.055" stroke="#3E5CEB" stroke-opacity="0.24"/>
  <text x="${badgeX + badgeWidth / 2}" y="${badgeY + 23}" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="700" letter-spacing="2.1" fill="#3E5CEB">CERTIFICATE OF COMPLETION</text>

  <circle cx="${centerX}" cy="${portrait ? 300 : 242}" r="${portrait ? 50 : 48}" fill="#3E5CEB" fill-opacity="0.08" stroke="#3E5CEB" stroke-opacity="0.2"/>
  <g transform="translate(${centerX} ${portrait ? 300 : 242})">
    <path d="M0 -24 l8 17 18 3 -13 13 3 18 -16 -8 -16 8 3 -18 -13 -13 18 -3 z" fill="#3E5CEB"/>
  </g>

  <text x="${centerX}" y="${certifyY}" text-anchor="middle" font-family="${FONT}" font-size="14" font-weight="700" letter-spacing="6" fill="#64748b">THIS CERTIFIES THAT</text>
  ${textLines(nameLines, centerX, nameStart, nameLine, `font-family="${FONT}" font-size="${nameSize}" font-weight="800" fill="#0f172a"`)}
  <line x1="${centerX - (portrait ? 120 : 140)}" y1="${dividerY}" x2="${centerX + (portrait ? 120 : 140)}" y2="${dividerY}" stroke="#cbd5e1" stroke-width="1.5"/>
  <text x="${centerX}" y="${introY}" text-anchor="middle" font-family="${FONT}" font-size="18" fill="#475569">has successfully completed the course</text>
  ${textLines(titleLines, centerX, titleStart, titleLine, `font-family="${FONT}" font-size="${titleSize}" font-weight="700" fill="#0f172a"`)}
  ${hasChannel ? `<text x="${centerX}" y="${titleStart + titleLines.length * titleLine + 6}" text-anchor="middle" font-family="${FONT}" font-size="17" fill="#64748b">Created by ${escapeXml(input.channelTitle!.trim())}</text>` : ""}

  <line x1="${statsInset}" y1="${statsTop}" x2="${WIDTH - statsInset}" y2="${statsTop}" stroke="#e2e8f0" stroke-width="1.5"/>
  <line x1="${statsInset}" y1="${statsBottom}" x2="${WIDTH - statsInset}" y2="${statsBottom}" stroke="#e2e8f0" stroke-width="1.5"/>
  <text x="${statsColumns[0]}" y="${statsTop + 38}" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="700" letter-spacing="2.6" fill="#64748b">LESSONS COMPLETED</text>
  <text x="${statsColumns[0]}" y="${statsTop + 76}" text-anchor="middle" font-family="${FONT}" font-size="${statsValueSize}" font-weight="700" fill="#0f172a">${input.completed} of ${input.total}</text>
  <text x="${statsColumns[1]}" y="${statsTop + 38}" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="700" letter-spacing="2.6" fill="#64748b">COMPLETED</text>
  <text x="${statsColumns[1]}" y="${statsTop + 76}" text-anchor="middle" font-family="${FONT}" font-size="${statsValueSize}" font-weight="700" fill="#0f172a">${escapeXml(input.completedLabel)}</text>
  <text x="${statsColumns[2]}" y="${statsTop + 38}" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="700" letter-spacing="2.6" fill="#64748b">REFERENCE</text>
  <text x="${statsColumns[2]}" y="${statsTop + 76}" text-anchor="middle" font-family="${FONT}" font-size="${statsValueSize}" font-weight="700" fill="#0f172a">${escapeXml(input.reference)}</text>

  <circle cx="${sealX}" cy="${footerY}" r="40" fill="#3E5CEB" fill-opacity="0.06" stroke="#3E5CEB" stroke-opacity="0.28" stroke-width="2"/>
  <path d="M${sealX - 9} ${footerY + 6} l9 9 l18 -20" fill="none" stroke="#3E5CEB" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="${sealX - 30}" y="${footerY + 28}" width="60" height="18" rx="9" fill="#3E5CEB"/>
  <text x="${sealX}" y="${footerY + 41}" text-anchor="middle" font-family="${FONT}" font-size="8" font-weight="700" letter-spacing="1" fill="#ffffff">COMPLETE</text>
  <text x="${sealX + 60}" y="${footerY - 8}" font-family="${FONT}" font-size="15" font-weight="700" fill="#0f172a">All lessons complete</text>
  <text x="${sealX + 60}" y="${footerY + 13}" font-family="${FONT}" font-size="13" fill="#64748b">Progress saved in this browser.</text>

  <text x="${footerRightX}" y="${footerY - 14}" text-anchor="end" font-family="${FONT}" font-size="10" font-weight="700" letter-spacing="2.4" fill="#64748b">GENERATED LOCALLY</text>
  <text x="${footerRightX}" y="${footerY + 10}" text-anchor="end" font-family="${FONT}" font-size="17" font-weight="700" fill="#0f172a">${escapeXml(input.issuedLabel)}</text>

  <text x="${centerX}" y="${disclaimerY}" text-anchor="middle" font-family="${FONT}" font-size="10" fill="#94a3b8">This personal completion record was generated in this browser from saved course progress.</text>
  <text x="${centerX}" y="${disclaimerY + 17}" text-anchor="middle" font-family="${FONT}" font-size="10" fill="#94a3b8">It is not an accredited credential or a public verification.</text>
</svg>`;
}

export function certificateImageFileName(
  courseTitle: string,
  extension: "png" | "svg",
  orientation: CertificateOrientation = "landscape"
): string {
  const slug = courseTitle
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const suffix = orientation === "portrait" ? "-portrait" : "";
  return `focusy-certificate-${slug || "course"}${suffix}.${extension}`;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not rasterize the certificate."));
    image.src = url;
  });
}

/**
 * Download a PNG rendered from the same data as the on-page certificate. When
 * canvas rasterization is unavailable, the SVG itself is downloaded instead.
 */
export async function downloadCertificateImage(
  input: CertificateImageInput,
  orientation: CertificateOrientation = "landscape"
): Promise<"png" | "svg"> {
  const svg = certificateSvg(input, orientation);
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const { width, height } = CERTIFICATE_IMAGE_SIZE[orientation];

  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable.");
    context.fillStyle = "#fffdf8";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const png = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    if (!png) throw new Error("Could not create the PNG.");
    downloadBlob(
      png,
      certificateImageFileName(input.courseTitle, "png", orientation)
    );
    return "png";
  } catch {
    downloadBlob(
      svgBlob,
      certificateImageFileName(input.courseTitle, "svg", orientation)
    );
    return "svg";
  } finally {
    URL.revokeObjectURL(url);
  }
}
