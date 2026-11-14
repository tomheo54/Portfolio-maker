import { NextResponse } from "next/server";
import {
  isPublicPortfolioMode,
  isUnavailableInPublicMode,
} from "@/services/deployment/public-mode";

export function privateApiUnavailableResponse(pathname: string) {
  if (!isPublicPortfolioMode() || !isUnavailableInPublicMode(pathname)) {
    return null;
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
