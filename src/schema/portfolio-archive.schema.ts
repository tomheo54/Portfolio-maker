import { z } from "zod";
import { PortfolioDocumentSchema } from "./portfolio.schema";

export const PORTFOLIO_SOURCE_MANIFEST_FILENAME = "portfolio-source.json";
export const PORTFOLIO_SOURCE_FORMAT = "ai-portfolio-factory";
export const PORTFOLIO_SOURCE_VERSION = 1;

/** Versioned editable source bundled inside a standalone portfolio ZIP. */
export const PortfolioSourceManifestSchema = z.object({
  format: z.literal(PORTFOLIO_SOURCE_FORMAT),
  version: z.literal(PORTFOLIO_SOURCE_VERSION),
  exportedAt: z.string(),
  document: PortfolioDocumentSchema,
});

export type PortfolioSourceManifest = z.infer<typeof PortfolioSourceManifestSchema>;
