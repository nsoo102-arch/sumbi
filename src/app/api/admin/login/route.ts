import { NextResponse } from "next/server";
import {
  createAdminSessionToken,
  getAdminCookieOptions,
  getAdminPassword,
  passwordsMatch,
  ADMIN_COOKIE_NAME,
} from "@/lib/adminAuth";

export async function POST(request: Request) {
  try {
    const adminPassword = getAdminPassword();
    if (!adminPassword) {
      return NextResponse.json(
        {
          ok: false,
          error: "ADMIN_PASSWORD 환경변수가 설정되지 않았습니다.",
        },
        { status: 503 },
      );
    }

    const body = (await request.json()) as { password?: unknown };
    const password =
      typeof body.password === "string" ? body.password : "";

    if (!password) {
      return NextResponse.json(
        { ok: false, error: "비밀번호를 입력해 주세요." },
        { status: 400 },
      );
    }

    const matched = await passwordsMatch(password, adminPassword);
    if (!matched) {
      return NextResponse.json(
        { ok: false, error: "비밀번호가 올바르지 않습니다." },
        { status: 401 },
      );
    }

    const token = await createAdminSessionToken(adminPassword);
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "세션을 만들 수 없습니다." },
        { status: 500 },
      );
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE_NAME, token, getAdminCookieOptions());
    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "로그인에 실패했습니다." },
      { status: 500 },
    );
  }
}
