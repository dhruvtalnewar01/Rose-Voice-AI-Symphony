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

  // 1. Copy _redirects
  if (fs.existsSync('public/_redirects')) {
    fs.copyFileSync('public/_redirects', 'out/_redirects');
  }

  // 2. Package Netlify serverless functions alongside out folder
  const netlifyFuncSrc = path.join(__dirname, '..', 'netlify', 'functions');
  const netlifyFuncDest = path.join(__dirname, '..', 'out', '.netlify', 'functions');

  if (fs.existsSync(netlifyFuncSrc)) {
    fs.mkdirSync(netlifyFuncDest, { recursive: true });
    const files = fs.readdirSync(netlifyFuncSrc);
    for (const f of files) {
      fs.copyFileSync(path.join(netlifyFuncSrc, f), path.join(netlifyFuncDest, f));
    }
  }

  console.log('Static export complete: out/ folder generated successfully with _redirects and Netlify functions.');
} catch (err) {
  console.error('Static export failed:', err);
  process.exit(1);
} finally {
  fs.writeFileSync(cfgPath, originalCfg, 'utf8');
}
