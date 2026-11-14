export function getAdminPassword(): string {
  return process.env.STUDIO_ADMIN_PASSWORD || 'makemoney';
}

export function isLocalEnvironment(): boolean {
  if (process.env.NODE_ENV === 'development') return true;
  // If not on Vercel or Netlify and PORTFOLIO_PUBLIC_ONLY is not set
  if (!process.env.VERCEL && !process.env.NETLIFY && !process.env.PORTFOLIO_PUBLIC_ONLY) {
    return true;
  }
  return false;
}
