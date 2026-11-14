import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isPublicPortfolioMode, isUnavailableInPublicMode } from "@/services/deployment/public-mode";
import { isLocalEnvironment } from "./auth-config";

export function privateApiUnavailableResponse(pathname: string) {
  // Ở môi trường local: luôn cho phép
  if (isLocalEnvironment()) {
    return null;
  }

  // Đang trên máy chủ: Kiểm tra xem đã đăng nhập chưa
  const cookieStore = cookies();
  const hasAuthCookie =
    cookieStore.get("studio_access_token")?.value === "unlocked_studio_session";

  // Nếu đã đăng nhập mật khẩu thì mở khóa cho dùng API bình thường!
  if (hasAuthCookie) {
    return null;
  }

  if (isPublicPortfolioMode() && isUnavailableInPublicMode(pathname)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
