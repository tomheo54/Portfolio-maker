"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Share2,
  Check,
  BookOpen,
} from "lucide-react";
import { AssignmentDetailModal } from "@/templates/blocks/AssignmentDetailModal";
import type { PortfolioDocument, ProjectItem } from "@/schema/portfolio.schema";
import { getProjectSlug, findProjectBySlug } from "./projectSlugHelper";
export { getProjectSlug, findProjectBySlug };

export interface ProjectDetailClientViewProps {
  portfolioDoc: PortfolioDocument;
  portfolioSlug: string;
  project: ProjectItem;
  projectIndex: number;
  allProjects: ProjectItem[];
  navigationLoop?: boolean;
}

export function ProjectDetailClientView({
  portfolioDoc,
  portfolioSlug,
  project,
  projectIndex,
  allProjects,
  navigationLoop = true,
}: ProjectDetailClientViewProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const portfolioHomeUrl = `/${portfolioSlug}`;
  const hero = portfolioDoc.sections.find((section) => section.type === "hero");
  const ownerName = hero?.type === "hero" ? hero.fullName : undefined;
  const ownerRole = hero?.type === "hero" ? hero.roleTitle : undefined;

  const totalProjects = allProjects.length;
  const hasPrev = navigationLoop ? totalProjects > 1 : projectIndex > 0;
  const hasNext = navigationLoop
    ? totalProjects > 1
    : projectIndex < totalProjects - 1;

  const prevIdx = (projectIndex - 1 + totalProjects) % totalProjects;
  const nextIdx = (projectIndex + 1) % totalProjects;
  const prevProject = allProjects[prevIdx];
  const nextProject = allProjects[nextIdx];

  const navigateToProject = (nextP: ProjectItem, nextI: number) => {
    router.push(
      `/${portfolioSlug}/projects/${getProjectSlug(nextP, nextI)}`,
      { scroll: false },
    );
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Scroll to top whenever project changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [project.id]);

  return (
    <div
      className="min-h-screen relative flex flex-col transition-colors selection:bg-amber-200 selection:text-amber-900"
      style={{
        backgroundColor: portfolioDoc.theme.backgroundColor,
        color: portfolioDoc.theme.textColor,
        fontFamily: portfolioDoc.theme.bodyFont,
      }}
      data-testid="project-detail-route"
      data-detail-presentation="page"
    >
      {/* Ambient Radial Gradient Layer */}
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-40 transition-opacity"
        aria-hidden="true"
      >
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[450px] rounded-full blur-3xl"
          style={{
            background: `radial-gradient(circle, ${portfolioDoc.theme.primaryColor}22 0%, transparent 70%)`,
          }}
        />
        <div
          className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full blur-3xl"
          style={{
            background: `radial-gradient(circle, ${portfolioDoc.theme.secondaryColor || portfolioDoc.theme.primaryColor}18 0%, transparent 70%)`,
          }}
        />
      </div>

      {/* Floating Glassmorphic Top Navigation Bar */}
      <header
        className="sticky top-0 z-40 w-full border-b backdrop-blur-md px-3 py-2.5 sm:px-6 transition shadow-sm"
        style={{
          backgroundColor: `${portfolioDoc.theme.surfaceColor}E6`,
          borderColor: `${portfolioDoc.theme.primaryColor}20`,
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          {/* Left: Back to Portfolio button */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => router.push(portfolioHomeUrl)}
              className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition hover:scale-105 shadow-sm hover:shadow"
              style={{
                borderColor: `${portfolioDoc.theme.primaryColor}35`,
                backgroundColor: `${portfolioDoc.theme.primaryColor}10`,
                color: portfolioDoc.theme.primaryColor,
              }}
              aria-label="Quay lại trang chủ Portfolio"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="font-bold">{ownerName || "Portfolio"}</span>
              <span className="hidden sm:inline opacity-70 font-normal">
                • Về trang chủ
              </span>
            </button>
          </div>

          {/* Center: Interactive Project Stepper / Carousel Pills */}
          {totalProjects > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-[45vw] sm:max-w-none scrollbar-none">
              {allProjects.map((p, idx) => {
                const isActive = idx === projectIndex;
                const numStr = String(idx + 1).padStart(2, "0");
                return (
                  <button
                    key={p.id || idx}
                    type="button"
                    onClick={() => navigateToProject(p, idx)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                      isActive
                        ? "shadow-sm scale-105 text-white"
                        : "opacity-65 hover:opacity-100 hover:bg-black/5"
                    }`}
                    style={{
                      backgroundColor: isActive
                        ? portfolioDoc.theme.primaryColor
                        : "transparent",
                      border: isActive
                        ? "none"
                        : `1px solid ${portfolioDoc.theme.primaryColor}25`,
                    }}
                    title={`Bài tập ${numStr}: ${p.title}`}
                  >
                    <span>{numStr}</span>
                    <span className="hidden md:inline max-w-[90px] truncate">
                      {p.title}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Right: Actions (Share link, Prev/Next) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition hover:opacity-85 shadow-sm"
              style={{
                borderColor: `${portfolioDoc.theme.primaryColor}30`,
                color: portfolioDoc.theme.primaryColor,
                backgroundColor: portfolioDoc.theme.surfaceColor,
              }}
              title="Sao chép liên kết bài làm này"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold text-[11px]">
                    Đã sao chép!
                  </span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline text-[11px]">Chia sẻ link</span>
                </>
              )}
            </button>

            {totalProjects > 1 && (
              <div
                className="flex items-center gap-1 border-l pl-2"
                style={{ borderColor: `${portfolioDoc.theme.primaryColor}25` }}
              >
                <button
                  type="button"
                  onClick={() =>
                    prevProject && navigateToProject(prevProject, prevIdx)
                  }
                  disabled={!hasPrev}
                  className="rounded-full border p-1.5 transition hover:opacity-80 disabled:opacity-25"
                  style={{
                    borderColor: `${portfolioDoc.theme.primaryColor}30`,
                    color: portfolioDoc.theme.primaryColor,
                  }}
                  aria-label="Bài trước"
                  title={`‹ Bài trước: ${prevProject?.title || ""}`}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    nextProject && navigateToProject(nextProject, nextIdx)
                  }
                  disabled={!hasNext}
                  className="rounded-full border p-1.5 transition hover:opacity-80 disabled:opacity-25"
                  style={{
                    borderColor: `${portfolioDoc.theme.primaryColor}30`,
                    color: portfolioDoc.theme.primaryColor,
                  }}
                  aria-label="Bài tiếp theo"
                  title={`Bài tiếp theo: ${nextProject?.title || ""} ›`}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content: Immediately visible HERO Card */}
      <main className="relative z-10 flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <AssignmentDetailModal
          project={project}
          theme={portfolioDoc.theme}
          presentation="page"
          onClose={() => router.push(portfolioHomeUrl)}
          allProjects={allProjects}
          currentIndex={projectIndex}
          onNavigateProject={navigateToProject}
          navigationLoop={navigationLoop}
        />
      </main>
    </div>
  );
}
