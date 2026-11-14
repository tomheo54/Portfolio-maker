import { expect, test } from '@playwright/test';
import {
  isPublicPortfolioMode,
  isUnavailableInPublicMode,
} from '../src/services/deployment/public-mode';

test.describe('public deployment routing policy', () => {
  test('uses the explicit deployment flag rather than NODE_ENV', () => {
    const previousPublicFlag = process.env.PORTFOLIO_PUBLIC_ONLY;
    const previousNetlify = process.env.NETLIFY;

    process.env.NETLIFY = 'false';
    delete process.env.PORTFOLIO_PUBLIC_ONLY;
    expect(isPublicPortfolioMode()).toBe(false);

    process.env.PORTFOLIO_PUBLIC_ONLY = 'true';
    expect(isPublicPortfolioMode()).toBe(true);

    delete process.env.PORTFOLIO_PUBLIC_ONLY;
    process.env.NETLIFY = 'true';
    expect(isPublicPortfolioMode()).toBe(true);
    process.env.PORTFOLIO_PUBLIC_ONLY = 'false';
    expect(isPublicPortfolioMode()).toBe(false);

    if (previousPublicFlag === undefined) {
      delete process.env.PORTFOLIO_PUBLIC_ONLY;
    } else {
      process.env.PORTFOLIO_PUBLIC_ONLY = previousPublicFlag;
    }
    if (previousNetlify === undefined) {
      delete process.env.NETLIFY;
    } else {
      process.env.NETLIFY = previousNetlify;
    }
  });

  test('blocks editor routes and generation APIs but leaves public export available', () => {
    for (const path of [
      '/studio',
      '/studio/anything',
      '/batch',
      '/batch/anything',
      '/api/ai/summarize',
      '/api/ai/generate-image',
      '/api/batch',
      '/api/docx-files',
      '/api/docx-ingest',
      '/api/portfolios',
    ]) {
      expect(isUnavailableInPublicMode(path), path).toBe(true);
    }

    for (const path of [
      '/',
      '/portfolio-mau-public',
      '/portfolio-mau-public/projects/example',
      '/api/export',
    ]) {
      expect(isUnavailableInPublicMode(path), path).toBe(false);
    }
  });
});
