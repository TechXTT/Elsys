export type ClassValue = string | number | false | null | undefined;

/**
 * Join truthy class names with a single space. A dependency-free stand-in for
 * `clsx` — sufficient for the design-system primitives, which compose static
 * variant/size class maps rather than merging conflicting Tailwind utilities.
 */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
