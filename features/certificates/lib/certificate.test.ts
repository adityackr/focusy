import { beforeEach, describe, expect, test } from "bun:test";
import {
  CERTIFICATE_NAME_KEY,
  certificateProgress,
  certificateReference,
  readCertificateName,
  saveCertificateName,
} from "./certificate";
import {
  certificateImageFileName,
  certificateSvg,
} from "./certificate-image";
import {
  collectCertificateBackup,
  restoreCertificateBackup,
} from "./certificate-backup";

const course = {
  chapters: [{ id: "a" }, { id: "b" }, { id: "c" }],
};

describe("certificate completion", () => {
  test("only counts chapters that still belong to the course", () => {
    const result = certificateProgress(course, {
      completedIds: ["a", "b", "removed"],
    });
    expect(result.completed).toBe(2);
    expect(result.total).toBe(3);
    expect(result.percent).toBe(67);
    expect(result.complete).toBe(false);
  });

  test("unlocks only when every lesson is complete", () => {
    const result = certificateProgress(course, {
      completedIds: ["c", "a", "b"],
    });
    expect(result.percent).toBe(100);
    expect(result.complete).toBe(true);
  });

  test("an empty course never earns a certificate", () => {
    const result = certificateProgress({ chapters: [] }, { completedIds: [] });
    expect(result).toEqual({
      total: 0,
      completed: 0,
      percent: 0,
      complete: false,
    });
  });
});

describe("certificate reference", () => {
  test("is stable for the same course and completion time", () => {
    expect(certificateReference("course-1", 123456)).toBe(
      certificateReference("course-1", 123456)
    );
    expect(certificateReference("course-1", 123456)).toMatch(
      /^FY-[0-9A-Z]{7}$/
    );
  });

  test("changes with the course or completion time", () => {
    expect(certificateReference("course-1", 1)).not.toBe(
      certificateReference("course-2", 1)
    );
    expect(certificateReference("course-1", 1)).not.toBe(
      certificateReference("course-1", 2)
    );
  });
});

describe("certificate image", () => {
  const input = {
    name: "Ada Lovelace",
    courseTitle: "Building a Compiler",
    channelTitle: "Focusy Labs",
    completedLabel: "November 16, 2026",
    issuedLabel: "November 16, 2026",
    reference: "FY-ABC1234",
    completed: 12,
    total: 12,
  };

  test("renders a standalone SVG with the certificate details", () => {
    const svg = certificateSvg(input);
    expect(svg).toContain("<svg");
    expect(svg).toContain("CERTIFICATE OF COMPLETION");
    expect(svg).toContain("Ada Lovelace");
    expect(svg).toContain("Building a Compiler");
    expect(svg).toContain("12 of 12");
    expect(svg).toContain("FY-ABC1234");
  });

  test("escapes text instead of injecting markup", () => {
    const svg = certificateSvg({
      ...input,
      name: 'Ada <&> "Lovelace"',
      courseTitle: "JS & <TypeScript>",
    });
    expect(svg).toContain("Ada &lt;&amp;&gt; &quot;Lovelace&quot;");
    expect(svg).toContain("JS &amp; &lt;TypeScript&gt;");
    expect(svg).not.toContain("<TypeScript>");
  });

  test("uses a safe file name for the downloaded image", () => {
    expect(certificateImageFileName("Advanced JS: <Patterns> & More", "png")).toBe(
      "focusy-certificate-advanced-js-patterns-more.png"
    );
    expect(certificateImageFileName("Café", "svg")).toBe(
      "focusy-certificate-cafe.svg"
    );
    expect(certificateImageFileName("", "png")).toBe(
      "focusy-certificate-course.png"
    );
    expect(certificateImageFileName("Café", "png", "portrait")).toBe(
      "focusy-certificate-cafe-portrait.png"
    );
  });

  test("generates a taller portrait image", () => {
    const svg = certificateSvg(input, "portrait");
    expect(svg).toContain('width="1131" height="1600"');
    expect(svg).toContain("Ada Lovelace");
    expect(svg).toContain("12 of 12");
  });
});

describe("certificate name backups", () => {
  beforeEach(() => localStorage.clear());

  test("collects the name only when one is saved", () => {
    expect(collectCertificateBackup()).toBeNull();
    saveCertificateName("Ada");
    expect(collectCertificateBackup()).toEqual({ name: "Ada" });
  });

  test("merge keeps this browser's name and fills an empty one", () => {
    saveCertificateName("Local");
    expect(restoreCertificateBackup({ name: "Backup" }, "merge")).toBe(false);
    expect(readCertificateName()).toBe("Local");

    saveCertificateName("");
    expect(restoreCertificateBackup({ name: "Backup" }, "merge")).toBe(true);
    expect(readCertificateName()).toBe("Backup");
  });

  test("replace overwrites the local name", () => {
    saveCertificateName("Local");
    expect(restoreCertificateBackup({ name: "Backup" }, "replace")).toBe(
      true
    );
    expect(readCertificateName()).toBe("Backup");
  });

  test("ignores malformed sections", () => {
    saveCertificateName("Local");
    expect(restoreCertificateBackup({ name: 42 }, "replace")).toBe(false);
    expect(restoreCertificateBackup(null, "replace")).toBe(false);
    expect(readCertificateName()).toBe("Local");
  });
});

describe("certificate name", () => {
  beforeEach(() => localStorage.clear());

  test("saves and reads the locally chosen name", () => {
    saveCertificateName("  Ada Lovelace  ");
    expect(localStorage.getItem(CERTIFICATE_NAME_KEY)).toBe("Ada Lovelace");
    expect(readCertificateName()).toBe("Ada Lovelace");
  });

  test("clearing the name removes the saved value", () => {
    saveCertificateName("Ada");
    saveCertificateName("   ");
    expect(readCertificateName()).toBe("");
  });
});
