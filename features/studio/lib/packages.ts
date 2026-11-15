/**
 * Minimal validation for public npm packages. Studio only accepts package
 * names and version ranges — it never runs install commands.
 */
import type { StudioResult } from "../types/studio.types";

const PACKAGE_NAME_PATTERN =
  /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

/** One exact, partial, wildcard or comparator-prefixed version. */
const VERSION_PART =
  /^(?:[~^]|[<>]=?|=)?\s*(?:\d+|\d+\.(?:\d+|[xX*])|\d+\.(?:\d+\.(?:\d+|[xX*])|[xX*]\.[xX*])|[xX*])(?:-[0-9a-z.-]+)?(?:\+[0-9a-z.-]+)?$/i;

export const DEFAULT_DEPENDENCY_VERSION = "latest";

export function isValidPackageName(name: string): boolean {
  const trimmed = name.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length <= 214 &&
    PACKAGE_NAME_PATTERN.test(trimmed)
  );
}

export function isValidVersionRange(version: string): boolean {
  const trimmed = version.trim();
  if (!trimmed || trimmed.length > 256) return false;
  if (/^(?:latest|\*)$/i.test(trimmed)) return true;

  return trimmed.split(/\s*\|\|\s*/).every((range) => {
    const hyphenRange = range.split(/\s+-\s+/);
    if (hyphenRange.length === 2) {
      return (
        VERSION_PART.test(hyphenRange[0]) &&
        VERSION_PART.test(hyphenRange[1]) &&
        !/^[~^]/.test(hyphenRange[0]) &&
        !/^[~^]/.test(hyphenRange[1])
      );
    }
    const compact = range.replace(/([~^]|[<>]=?|=)\s+/g, "$1");
    return compact.split(/\s+/).every((part) => VERSION_PART.test(part));
  });
}

/** Validation error for a dependency, or null when both parts are valid. */
export function validateDependency(name: string, version: string): string | null {
  if (!isValidPackageName(name)) {
    return "Enter a valid npm package name, like lodash or @tanstack/react-query.";
  }
  if (version.trim() && !isValidVersionRange(version)) {
    return "Enter a valid version range, like 1.2.3, ^1.2.3, 1.x or latest.";
  }
  return null;
}

/** A blank version means the latest published release. */
export function normalizeDependencyVersion(version: string): string {
  return version.trim() || DEFAULT_DEPENDENCY_VERSION;
}

function invalid(message: string): StudioResult<never> {
  return { ok: false, error: { code: "invalid", message } };
}

function hasDependency(
  dependencies: Record<string, string>,
  name: string
): boolean {
  return Object.prototype.hasOwnProperty.call(dependencies, name);
}

/** Add a dependency, rejecting duplicates instead of silently overwriting. */
export function addStudioDependency(
  dependencies: Record<string, string>,
  rawName: string,
  rawVersion: string
): StudioResult<Record<string, string>> {
  const name = rawName.trim();
  const validationError = validateDependency(name, rawVersion);
  if (validationError) return invalid(validationError);
  if (hasDependency(dependencies, name)) {
    return invalid(`${name} is already in this project. Update its version instead.`);
  }

  return {
    ok: true,
    value: {
      ...dependencies,
      [name]: normalizeDependencyVersion(rawVersion),
    },
  };
}

/** Change an existing dependency's version. */
export function updateStudioDependency(
  dependencies: Record<string, string>,
  rawName: string,
  rawVersion: string
): StudioResult<Record<string, string>> {
  const name = rawName.trim();
  if (!hasDependency(dependencies, name)) {
    return invalid(`${name || "That package"} is not in this project.`);
  }
  const validationError = validateDependency(name, rawVersion);
  if (validationError) return invalid(validationError);

  const version = normalizeDependencyVersion(rawVersion);
  if (dependencies[name] === version) {
    return { ok: true, value: dependencies };
  }
  return {
    ok: true,
    value: { ...dependencies, [name]: version },
  };
}

/** Remove one dependency without touching the others. */
export function removeStudioDependency(
  dependencies: Record<string, string>,
  rawName: string
): StudioResult<Record<string, string>> {
  const name = rawName.trim();
  if (!hasDependency(dependencies, name)) {
    return invalid(`${name || "That package"} is not in this project.`);
  }
  const { [name]: _removed, ...rest } = dependencies;
  return { ok: true, value: rest };
}
