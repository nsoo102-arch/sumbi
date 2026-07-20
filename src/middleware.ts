import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  isValidAdminSessionToken,
} from "@/lib/adminAuth";

function isAdminLoginPath(pathname: string): boolean {
  return pathname === "/admin/login";
}

function isAdminPagePath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isProtectedAdminApi(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/api/sheets/admin-summary" ||
    pathname === "/api/sheets/admin-stats" ||
    pathname === "/api/sheets/admin-note" ||
    pathname === "/api/sheets/admin-inactive-week" ||
    pathname === "/api/sheets/daily" ||
    pathname === "/api/sheets/member" ||
    pathname === "/api/sheets/letters/unread" ||
    pathname === "/api/sheets/letters/replies/unread" ||
    pathname === "/api/sheets/letters/replies/read"
  ) {
    return true;
  }

  // 회원 목록 조회만 관리자 전용 (POST는 회원가입용)
  if (pathname === "/api/sheets/members" && request.method === "GET") {
    return true;
  }

  return false;
}

async function hasValidAdminSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return isValidAdminSessionToken(token);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAdminLoginPath(pathname)) {
    const authenticated = await hasValidAdminSession(request);
    if (authenticated) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  const needsAuth =
    (isAdminPagePath(pathname) && !isAdminLoginPath(pathname)) ||
    isProtectedAdminApi(request);

  if (!needsAuth) {
    return NextResponse.next();
  }

  const authenticated = await hasValidAdminSession(request);
  if (authenticated) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { ok: false, error: "관리자 인증이 필요합니다." },
      { status: 401 },
    );
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/api/sheets/admin-summary",
    "/api/sheets/admin-stats",
    "/api/sheets/admin-note",
    "/api/sheets/admin-inactive-week",
    "/api/sheets/daily",
    "/api/sheets/member",
    "/api/sheets/members",
    "/api/sheets/letters/unread",
    "/api/sheets/letters/replies/unread",
    "/api/sheets/letters/replies/read",
  ],
};
