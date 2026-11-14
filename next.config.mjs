/** @type {import('next').NextConfig} */
const nextConfig = {
  // Bake this deployment-only switch into the server and Edge bundles. Netlify
  // provides NETLIFY during build, while local Studio builds remain private.
  env: {
    PORTFOLIO_PUBLIC_ONLY:
      process.env.PORTFOLIO_PUBLIC_ONLY ??
      (process.env.NETLIFY === 'true' ? 'true' : 'false'),
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['mammoth', 'jszip'],
  },
};

export default nextConfig;
