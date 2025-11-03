import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const me = await prisma.user.findUnique({
      where: { id: (session.user as any).id as string },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        gradeLevel: true,
        gradeClass: true,
      } as any,
    });
    if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ user: me });
  } catch (err) {
    console.error("/api/admin/me GET error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const body = (await req.json().catch(() => null)) as {
      email?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      gradeLevel?: number | null;
      gradeClass?: "A" | "B" | "V" | "G" | null;
      changePassword?: { currentPassword: string; newPassword: string };
    } | null;
    if (!body) return NextResponse.json({ error: "Missing body" }, { status: 400 });

    // Password change first (if requested)
    if (body.changePassword) {
      const { currentPassword, newPassword } = body.changePassword;
      if (!currentPassword || !newPassword) return NextResponse.json({ error: "Missing passwords" }, { status: 400 });
      const me = await prisma.user.findUnique({ where: { id: userId } });
      if (!me || !me.password) return NextResponse.json({ error: "Password change not available" }, { status: 400 });
      const valid = await bcrypt.compare(currentPassword, me.password);
      if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      const hash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({ where: { id: userId }, data: { password: hash } as any });
    }

    const update: any = {};
    if (body.email !== undefined) {
      const email = body.email?.trim().toLowerCase() || null;
      if (email) {
        const exists = await prisma.user.findUnique({ where: { email } });
        if (exists && exists.id !== userId) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
      update.email = email;
    }
    if (body.firstName !== undefined) update.firstName = body.firstName?.trim() || null;
    if (body.lastName !== undefined) update.lastName = body.lastName?.trim() || null;
    if (body.gradeLevel !== undefined) update.gradeLevel = body.gradeLevel;
    if (body.gradeClass !== undefined) update.gradeClass = body.gradeClass;

    if ("firstName" in (body ?? {}) || "lastName" in (body ?? {})) {
      const fn = (body?.firstName ?? "").trim();
      const ln = (body?.lastName ?? "").trim();
      const full = `${fn} ${ln}`.trim();
      update.name = full || null;
    }

    if (Object.keys(update).length > 0) {
      await prisma.user.update({ where: { id: userId }, data: update });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("/api/admin/me PATCH error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
