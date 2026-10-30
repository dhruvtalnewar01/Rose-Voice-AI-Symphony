const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Generating production static export into out/ folder...');
const cfgPath = 'next.config.mjs';
const originalCfg = fs.readFileSync(cfgPath, 'utf8');

try {
  if (!originalCfg.includes("output: 'export'")) {
    const updatedCfg = originalCfg.replace(
      'turbopack: {},',
      "turbopack: {},\n  output: 'export',"
    );
    fs.writeFileSync(cfgPath, updatedCfg, 'utf8');
  }

  execSync('npx next build', { stdio: 'inherit' });

  // 1. Generate rock-solid out/_redirects for Netlify static drop
  const staticRedirects = [
    '# Netlify Static Asset Rules - Preserve JS chunks and assets from HTML hijacking',
    '/_next/*  /_next/:splat  200',
    '/audio/*  /audio/:splat  200',
    '/assets/* /assets/:splat 200',
    '/models/* /models/:splat 200',
    '/*        /index.html    200',
    '',
  ].join('\n');
  fs.writeFileSync('out/_redirects', staticRedirects, 'utf8');

  console.log('Static export complete: out/ folder generated successfully with static asset safe _redirects.');
} catch (err) {
  console.error('Static export failed:', err);
  process.exit(1);
} finally {
  fs.writeFileSync(cfgPath, originalCfg, 'utf8');
}
