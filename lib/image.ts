/**
 * CMS-supplied image URLs are arbitrary (admins/teachers paste any host).
 * next/image rejects remote hosts that aren't in next.config `images`, and
 * optimizing arbitrary external images would burn the free-tier optimization
 * quota. So: render remote images `unoptimized` (served directly), while local
 * `/public` assets keep optimization. Use as `unoptimized={isRemoteSrc(src)}`.
 */
export function isRemoteSrc(src?: string | null): boolean {
  return !!src && /^https?:\/\//i.test(src);
}
