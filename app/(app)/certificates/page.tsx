import type { Metadata } from "next";
import { CertificatesGalleryView } from "@/features/certificates";

export const metadata: Metadata = {
  title: "Certificates",
  description:
    "Every course you have completed in Focusy, with locally generated certificates ready to view, print or download.",
};

export default CertificatesGalleryView;
