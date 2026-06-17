/**
 * DeepL wrapper (J). Translates human-readable strings only and preserves block
 * shape/markup. Env-gated on DEEPL_API_KEY (DEEPL_AUTH_KEY also accepted for
 * back-compat). When the key is absent the wrapper does NOT crash — callers
 * check `isDeeplConfigured()` and surface a clear message.
 *
 * DeepL Free tier: ~500,000 characters / month on a single key, billed on
 * SOURCE characters. Free endpoint host: api-free.deepl.com. Every translate
 * call here returns the source-character count so callers can report usage.
 */

const FREE_ENDPOINT = "https://api-free.deepl.com/v2/translate";
const PRO_ENDPOINT = "https://api.deepl.com/v2/translate";

export type DeeplLocale = "bg" | "en";

export class DeeplNotConfiguredError extends Error {
  constructor() {
    super(
      "DEEPL_API_KEY не е конфигуриран — машинният превод е недостъпен. Добавете ключа в средата, за да активирате превода.",
    );
    this.name = "DeeplNotConfiguredError";
  }
}

function getKey(): string | null {
  return process.env.DEEPL_API_KEY || process.env.DEEPL_AUTH_KEY || null;
}

/** True when the server can call DeepL. Callers gate on this for a clean message. */
export function isDeeplConfigured(): boolean {
  return getKey() !== null;
}

/** Free keys end in ":fx"; route to the matching host. */
function endpointFor(key: string): string {
  return key.endsWith(":fx") ? FREE_ENDPOINT : PRO_ENDPOINT;
}

/**
 * Translate a batch of strings in one request (order preserved). Empty/blank
 * strings are passed through untouched and cost no characters. Returns the
 * translations plus the total SOURCE character count actually sent to DeepL.
 */
export async function translateBatch(
  texts: string[],
  opts: { source?: DeeplLocale; target: DeeplLocale },
): Promise<{ texts: string[]; chars: number }> {
  const key = getKey();
  if (!key) throw new DeeplNotConfiguredError();

  // Only send non-blank entries; keep a map back to original positions.
  const sendIdx: number[] = [];
  texts.forEach((t, i) => {
    if (typeof t === "string" && t.trim()) sendIdx.push(i);
  });
  if (sendIdx.length === 0) return { texts: [...texts], chars: 0 };

  const params = new URLSearchParams();
  for (const i of sendIdx) params.append("text", texts[i]);
  if (opts.source) params.append("source_lang", opts.source.toUpperCase());
  params.append("target_lang", opts.target.toUpperCase());
  params.append("preserve_formatting", "1");

  const res = await fetch(endpointFor(key), {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`DeepL API error ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
  }
  const json = (await res.json()) as { translations?: { text: string }[] };
  const translations = json.translations ?? [];

  const out = [...texts];
  sendIdx.forEach((origIdx, k) => {
    const t = translations[k]?.text;
    if (typeof t === "string") out[origIdx] = t;
  });
  const chars = sendIdx.reduce((sum, i) => sum + texts[i].length, 0);
  return { texts: out, chars };
}

/** Translate a single string. */
export async function translateText(
  text: string,
  opts: { source?: DeeplLocale; target: DeeplLocale },
): Promise<{ text: string; chars: number }> {
  const { texts, chars } = await translateBatch([text], opts);
  return { text: texts[0], chars };
}

// --- Block-aware translation -------------------------------------------------
// Translate only human-readable string props; everything else (href, src, url,
// image, level, type, id, ids, sizes, ratios, numbers, booleans) is preserved.
const TRANSLATABLE_KEYS = new Set([
  "title",
  "subtitle",
  "subheading",
  "heading",
  "eyebrow",
  "highlight",
  "description",
  "markdown",
  "value",
  "text",
  "content",
  "label",
  "quote",
  "author",
  "role",
  "meta",
  "caption",
  "alt",
  "name",
]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Collect every translatable string in a value tree, in deterministic order. */
function collectStrings(node: unknown, out: { ref: Record<string, unknown>; key: string }[]): void {
  if (Array.isArray(node)) {
    for (const item of node) collectStrings(item, out);
    return;
  }
  if (!isRecord(node)) return;
  for (const [key, val] of Object.entries(node)) {
    if (typeof val === "string" && TRANSLATABLE_KEYS.has(key) && val.trim()) {
      out.push({ ref: node, key });
    } else if (val && typeof val === "object") {
      collectStrings(val, out);
    }
  }
}

/**
 * Deep-clone `blocks`, translate its human-readable strings, and return the new
 * block array (same shape) plus the source-character count. Non-string and
 * non-whitelisted props are preserved exactly.
 */
export async function translateBlocks(
  blocks: unknown,
  opts: { source?: DeeplLocale; target: DeeplLocale },
): Promise<{ blocks: unknown; chars: number }> {
  if (!Array.isArray(blocks) || blocks.length === 0) return { blocks: blocks ?? null, chars: 0 };
  const clone = structuredClone(blocks);
  const slots: { ref: Record<string, unknown>; key: string }[] = [];
  collectStrings(clone, slots);
  if (slots.length === 0) return { blocks: clone, chars: 0 };

  const { texts, chars } = await translateBatch(
    slots.map((s) => s.ref[s.key] as string),
    opts,
  );
  slots.forEach((s, i) => {
    s.ref[s.key] = texts[i];
  });
  return { blocks: clone, chars };
}
