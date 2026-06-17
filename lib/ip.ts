// IP anonymization (G5-4 / GDPR data-minimization). Used wherever an IP would
// otherwise be stored or used as a rate-limit/log key. Drops the host portion so
// a stored value can't identify an individual: IPv4 → last octet zeroed; IPv6 →
// first 3 hextets kept. Returns undefined for empty/unknown input.
export function anonymizeIp(ip?: string | null): string | undefined {
  const v = ip?.split(",")[0]?.trim();
  if (!v || v === "unknown") return undefined;
  if (v.includes(".")) {
    const p = v.split(".");
    if (p.length === 4) return `${p[0]}.${p[1]}.${p[2]}.0`;
  }
  if (v.includes(":")) {
    const h = v.split(":");
    return `${h.slice(0, 3).join(":")}::`;
  }
  return undefined;
}
