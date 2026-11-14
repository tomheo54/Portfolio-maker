import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { isPublicPortfolioMode } from "@/services/deployment/public-mode";

export default function BatchLayout({ children }: { children: ReactNode }) {
  if (isPublicPortfolioMode()) notFound();
  return children;
}
