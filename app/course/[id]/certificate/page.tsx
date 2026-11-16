import type { Metadata } from "next";
import { CourseCertificateView } from "@/features/certificates";

export const metadata: Metadata = {
  title: "Course certificate",
  robots: { index: false, follow: true },
};

export default async function CourseCertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CourseCertificateView courseId={id} />;
}
