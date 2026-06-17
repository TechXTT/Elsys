import { ImageResponse } from "next/og";

export const runtime = "edge";

// Dynamic Open Graph image (R2). /og?title=...&subtitle=... → 1200×630 PNG on the
// brand palette. Used as the default ogImage when a page/post has no explicit one.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") ?? "ТУЕС").slice(0, 140);
  const subtitle = (searchParams.get("subtitle") ?? "Технологично училище „Електронни системи“").slice(0, 160);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0b2a4a 0%, #14508c 100%)",
          padding: "72px",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 40, fontWeight: 700, letterSpacing: 2 }}>
          ТУЕС <span style={{ fontSize: 24, fontWeight: 400, opacity: 0.7, marginLeft: 16 }}>CMS</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
          <div style={{ fontSize: 30, opacity: 0.85 }}>{subtitle}</div>
        </div>
        <div style={{ fontSize: 26, opacity: 0.7 }}>elsys-bg.org</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
