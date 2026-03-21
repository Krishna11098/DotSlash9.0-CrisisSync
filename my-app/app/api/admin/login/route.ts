import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_AUTH_COOKIE_NAME,
  getAdminCredentials,
  getAdminSessionValue,
  verifyAdminCredentials,
} from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = typeof body?.id === "string" ? body.id : "";
    const password = typeof body?.password === "string" ? body.password : "";

    const { configured } = getAdminCredentials();
    if (!configured) {
      return NextResponse.json(
        {
          error:
            "Admin credentials are not configured. Set ADMIN_LOGIN_ID and ADMIN_LOGIN_PASSWORD in environment variables.",
        },
        { status: 500 }
      );
    }

    if (!verifyAdminCredentials(id, password)) {
      return NextResponse.json({ error: "Invalid admin ID or password" }, { status: 401 });
    }

    const sessionValue = await getAdminSessionValue();
    if (!sessionValue) {
      return NextResponse.json({ error: "Unable to establish admin session" }, { status: 500 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: ADMIN_AUTH_COOKIE_NAME,
      value: sessionValue,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}
