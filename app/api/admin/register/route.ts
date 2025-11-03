import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const REGISTRATION_ENABLED = process.env.ALLOW_ADMIN_REGISTRATION === "true" || process.env.NODE_ENV !== "production";

// Temporary admin registration endpoint; remove after initial setup.
export async function POST(req: Request) {
  if (!REGISTRATION_ENABLED) {
    return NextResponse.json({ error: "Регистрацията е изключена" }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch (error) {
    console.error("Register payload error", error);
    return NextResponse.json({ error: "Невалидно JSON тяло" }, { status: 400 });
  }

  if (typeof payload !== "object" || payload === null) {
    return NextResponse.json({ error: "Липсват данни за регистрация" }, { status: 400 });
  }

  const { email, password, name } = payload as { email?: string; password?: string; name?: string };

  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const rawPassword = typeof password === "string" ? password : "";
  const trimmedName = typeof name === "string" ? name.trim() : undefined;

  if (!normalizedEmail || !rawPassword) {
    return NextResponse.json({ error: "Имейл и парола са задължителни" }, { status: 400 });
  }

  if (rawPassword.length < 8) {
    return NextResponse.json({ error: "Паролата трябва да е поне 8 символа" }, { status: 400 });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return NextResponse.json({ error: "Потребителят вече съществува" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 12);
    await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: trimmedName,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Register handler error", error);
    return NextResponse.json({ error: "Неуспешна регистрация" }, { status: 500 });
  }
}
