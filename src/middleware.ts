import { NextResponse, type NextRequest } from "next/server";
import {
  isPublicPortfolioMode,
  isUnavailableInPublicMode,
} from "@/services/deployment/public-mode";

export function middleware(request: NextRequest) {
  if (
    isPublicPortfolioMode() &&
    isUnavailableInPublicMode(request.nextUrl.pathname)
  ) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return new NextResponse("Not Found", { status: 404 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/studio/:path*", "/batch/:path*", "/api/:path*"],
};
