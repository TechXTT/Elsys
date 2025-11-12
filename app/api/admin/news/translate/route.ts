import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TranslatePayload = {
  sourceLocale: "bg" | "en";
  targetLocale: "bg" | "en";
  title?: string;
  excerpt?: string;
  markdown?: string;
};

async function translateText(
  text: string,
  source: string,
  target: string
): Promise<string> {
  const key = process.env.DEEPL_API_KEY || process.env.DEEPL_AUTH_KEY;
  if (!key) return text; // no-op when key missing
  let lastError: unknown = null;

  try {
    const params = new URLSearchParams();
    params.append("text", text);
    params.append("source_lang", source.toUpperCase());
    params.append("target_lang", target.toUpperCase());
    params.append("preserve_formatting", "1");
    const res = await fetch("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    if (!res.ok) {
      lastError = new Error(
        `DeepL API error: 403 at https://api-free.deepl.com/v2/translate`
      );

      throw new Error(
        `DeepL API error: ${res.status} at https://api-free.deepl.com/v2/translate`
      );
    }
    const json = (await res.json()) as any;
    const translated = json?.translations?.[0]?.text as string | undefined;
    return translated ?? text;
  } catch (err) {
    lastError = err;
  }
  throw lastError ?? new Error("DeepL: unknown error");
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 401 });

  let payload: TranslatePayload | null = null;
  try {
    payload = (await req.json()) as TranslatePayload;
  } catch {
    return NextResponse.json(
      { error: "Невалидно тяло на заявката" },
      { status: 400 }
    );
  }
  if (
    !payload ||
    (payload.targetLocale !== "bg" && payload.targetLocale !== "en") ||
    (payload.sourceLocale !== "bg" && payload.sourceLocale !== "en")
  ) {
    return NextResponse.json({ error: "Невалидни локали" }, { status: 400 });
  }

  const source = payload.sourceLocale;
  const target = payload.targetLocale;

  try {
    const [title, excerpt, markdown] = await Promise.all([
      payload.title
        ? translateText(payload.title, source, target)
        : Promise.resolve(undefined),
      payload.excerpt
        ? translateText(payload.excerpt, source, target)
        : Promise.resolve(undefined),
      payload.markdown
        ? translateText(payload.markdown, source, target)
        : Promise.resolve(undefined),
    ]);

    try {
      await recordAudit({
        req,
        userId: (session.user as any)?.id as string | undefined,
        action: "newsPost.translate",
        entity: "newsPost",
        details: { source, target, provider: "deepl" },
      });
    } catch {}

    return NextResponse.json({ title, excerpt, markdown });
  } catch (error) {
    console.error("Translate error", error);
    try {
      await recordAudit({
        req,
        userId: (session.user as any)?.id as string | undefined,
        action: "newsPost.translate.error",
        entity: "newsPost",
        details: { source, target, provider: "deepl" },
      });
    } catch {}
    return NextResponse.json({ error: "Грешка при превод" }, { status: 500 });
  }
}
