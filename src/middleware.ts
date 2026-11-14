import { NextResponse, type NextRequest } from "next/server";
import { isUnavailableInPublicMode } from "@/services/deployment/public-mode";
import { isLocalEnvironment } from "@/services/deployment/auth-config";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Local development / local server: Không yêu cầu mật khẩu
  if (isLocalEnvironment()) {
    return NextResponse.next();
  }

  // Đang trên máy chủ (Vercel / Production)
  const isProtectedPath =
    pathname === "/" ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/batch");

  // Kiểm tra cookie xác thực
  const hasAuthCookie =
    request.cookies.get("studio_access_token")?.value ===
    "unlocked_studio_session";

  if (isProtectedPath && !hasAuthCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Khóa các API nhạy cảm nếu chưa xác thực
  if (isUnavailableInPublicMode(pathname) && !hasAuthCookie) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/studio/:path*",
    "/batch/:path*",
    "/api/ai/:path*",
    "/api/batch/:path*",
    "/api/docx-files/:path*",
    "/api/docx-ingest/:path*",
    "/api/portfolios/:path*",
  ],
};
