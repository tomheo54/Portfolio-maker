import { NextResponse, type NextRequest } from "next/server";
import { isUnavailableInPublicMode } from "@/services/deployment/public-mode";
import { isLocalEnvironment } from "@/services/deployment/auth-config";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Local development / local server: Không yêu cầu mật khẩu
  if (isLocalEnvironment()) {
    return NextResponse.next();
  }

  // Các trang công khai hoặc trang login: Cho qua tự do
  if (pathname === "/login") {
    return NextResponse.next();
  }

  // Kiểm tra cookie phiên đăng nhập đã mở khóa
  const hasAuthCookie =
    request.cookies.get("studio_access_token")?.value ===
    "unlocked_studio_session";

  // Các trang quản trị / tạo web cần mật khẩu: Trang chủ (/), /studio, /batch
  const isProtectedPath =
    pathname === "/" ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/batch");

  // Nếu truy cập trang bảo vệ mà chưa đăng nhập -> chuyển hướng về /login
  if (isProtectedPath && !hasAuthCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Các API xử lý nội bộ nếu chưa đăng nhập -> chặn 401
  if (isUnavailableInPublicMode(pathname) && !hasAuthCookie) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Nếu đã đăng nhập rồi HOẶC là xem link portfolio cá nhân (/[slug]) -> Cho phép truy cập bình thường!
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
