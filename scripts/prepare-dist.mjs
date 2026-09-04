import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const nextDir = path.join(rootDir, '.next');
const publicDir = path.join(rootDir, 'public');

console.log('[build:prepare-dist] Populating dist/ directory with build artifacts...');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 1. Copy public assets into dist
if (fs.existsSync(publicDir)) {
  fs.cpSync(publicDir, distDir, { recursive: true });
  console.log('[build:prepare-dist] Copied public/ assets to dist/');
}

// 2. If .next exists, mirror static assets and server artifacts to dist
if (fs.existsSync(nextDir)) {
  // Mirror .next directory inside dist/.next for compatibility
  const distNextDir = path.join(distDir, '.next');
  fs.cpSync(nextDir, distNextDir, { recursive: true });

  // Copy .next/static to dist/_next/static for static serving compatibility
  const nextStaticDir = path.join(nextDir, 'static');
  const distStaticDir = path.join(distDir, '_next', 'static');
  if (fs.existsSync(nextStaticDir)) {
    fs.mkdirSync(path.dirname(distStaticDir), { recursive: true });
    fs.cpSync(nextStaticDir, distStaticDir, { recursive: true });
    console.log('[build:prepare-dist] Copied .next/static to dist/_next/static');
  }

  // Copy prerendered index.html if available to dist/index.html
  const appIndexHtml = path.join(nextDir, 'server', 'app', 'index.html');
  if (fs.existsSync(appIndexHtml)) {
    fs.copyFileSync(appIndexHtml, path.join(distDir, 'index.html'));
    console.log('[build:prepare-dist] Copied app/index.html to dist/index.html');
  }

  // Copy prerendered 404/not-found if available
  const appNotFoundHtml = path.join(nextDir, 'server', 'app', '_not-found.html');
  if (fs.existsSync(appNotFoundHtml)) {
    fs.copyFileSync(appNotFoundHtml, path.join(distDir, '404.html'));
  }
}

// 3. Write a build metadata manifest inside dist
const buildMetadata = {
  name: 'sih26143-maritime-spill-attribution',
  builtAt: new Date().toISOString(),
  environment: 'production',
  framework: 'nextjs',
};
fs.writeFileSync(
  path.join(distDir, 'build-metadata.json'),
  JSON.stringify(buildMetadata, null, 2),
  'utf-8'
);

console.log('[build:prepare-dist] Successfully verified dist/ build artifacts.');
