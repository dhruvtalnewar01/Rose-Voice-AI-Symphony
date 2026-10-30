const { execSync } = require('child_process');
const fs = require('fs');

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

  if (fs.existsSync('public/_redirects')) {
    fs.copyFileSync('public/_redirects', 'out/_redirects');
  }
  console.log('Static export complete: out/ folder generated successfully with _redirects.');
} catch (err) {
  console.error('Static export failed:', err);
  process.exit(1);
} finally {
  fs.writeFileSync(cfgPath, originalCfg, 'utf8');
}
