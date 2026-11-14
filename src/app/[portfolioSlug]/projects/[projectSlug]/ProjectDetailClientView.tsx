"use client";

import { useRouter } from "next/navigation";
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
  const portfolioHomeUrl = `/${portfolioSlug}`;
  const hero = portfolioDoc.sections.find((section) => section.type === "hero");
  const ownerName = hero?.type === "hero" ? hero.fullName : undefined;
  const ownerRole = hero?.type === "hero" ? hero.roleTitle : undefined;

  const navigateToProject = (nextProject: ProjectItem, nextIndex: number) => {
    router.push(
      `/${portfolioSlug}/projects/${getProjectSlug(nextProject, nextIndex)}`,
      { scroll: false },
    );
  };

  return (
    <main
      className="min-h-screen px-3 py-5 sm:px-6 sm:py-8 lg:px-8"
      style={{
        backgroundColor: portfolioDoc.theme.backgroundColor,
        color: portfolioDoc.theme.textColor,
        fontFamily: portfolioDoc.theme.bodyFont,
      }}
      data-testid="project-detail-route"
      data-detail-presentation="page"
    >
      <header
        className="mx-auto mb-5 flex w-full max-w-6xl items-center justify-between gap-4 rounded-2xl border px-4 py-3 sm:px-5"
        style={{
          backgroundColor: portfolioDoc.theme.surfaceColor,
          borderColor: `${portfolioDoc.theme.primaryColor}35`,
        }}
      >
        <div className="min-w-0">
          <p
            className="truncate text-sm font-bold"
            style={{
              color: portfolioDoc.theme.primaryColor,
              fontFamily: portfolioDoc.theme.headingFont,
            }}
          >
            {ownerName || portfolioDoc.seo.title}
          </p>
          {ownerRole && (
            <p className="truncate text-xs opacity-70">{ownerRole}</p>
          )}
        </div>
        <span
          className="shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider"
          style={{
            borderColor: `${portfolioDoc.theme.primaryColor}45`,
            color: portfolioDoc.theme.primaryColor,
          }}
        >
          Portfolio
        </span>
      </header>
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
  );
}
