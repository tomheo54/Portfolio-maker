export function isPublicPortfolioMode(): boolean {
  const explicitMode = process.env.PORTFOLIO_PUBLIC_ONLY;
  if (explicitMode === 'true') return true;
  if (explicitMode === 'false') return false;
  return process.env.NETLIFY === 'true';
}

const PRIVATE_PUBLIC_MODE_API_PATHS = [
  /^\/api\/ai(?:\/|$)/,
  /^\/api\/batch(?:\/|$)/,
  /^\/api\/docx-files(?:\/|$)/,
  /^\/api\/docx-ingest(?:\/|$)/,
  /^\/api\/portfolios(?:\/|$)/,
];

export function isUnavailableInPublicMode(pathname: string): boolean {
  return (
    pathname === '/studio' ||
    pathname.startsWith('/studio/') ||
    pathname === '/batch' ||
    pathname.startsWith('/batch/') ||
    PRIVATE_PUBLIC_MODE_API_PATHS.some((pattern) => pattern.test(pathname))
  );
}
