// Renders the app icon, adaptive icon, splash and favicon from inline SVG using Playwright's Chromium.
// Run: node scripts/make-icons.mjs   (needs `playwright` available, e.g. in the cloud sandbox)
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const bubble = (cx, cy, s, fill = '#fff') => `
  <g transform="translate(${cx - 256 * s} ${cy - 256 * s}) scale(${s})">
    <path d="M96 120c0-35 28-62 62-62h196c35 0 62 27 62 62v150c0 35-27 62-62 62H264l-86 78c-8 7-20 2-20-9v-69h0c-35 0-62-27-62-62z" fill="${fill}"/>
    <path d="M276 108l-62 106h52l-26 98 96-126h-56l36-78z" fill="#58CC02" stroke="#58A700" stroke-width="8" stroke-linejoin="round"/>
  </g>`;
const svg = (size, inner, bg) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ''}${inner}</svg>`;

const jobs = [
  ['assets/icon.png', 1024, svg(1024, bubble(512, 512, 1.55), '#58CC02')],
  ['assets/adaptive-icon.png', 1024, svg(1024, bubble(512, 512, 1.05), null)],
  ['assets/splash-icon.png', 512, svg(512, bubble(256, 256, 0.95), null)],
  ['assets/favicon.png', 128, svg(128, bubble(64, 64, 0.2), '#58CC02')],
];
mkdirSync('assets', { recursive: true });
const browser = await chromium.launch();
for (const [file, size, markup] of jobs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<html><body style="margin:0;background:transparent">${markup}</body></html>`);
  await page.screenshot({ path: file, omitBackground: true });
  await page.close();
  console.log('wrote', file);
}
await browser.close();
