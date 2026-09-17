import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const widgetsDir = path.join(rootDir, 'src', 'widgets');
const outDir = path.join(widgetsDir, 'out');
const tailwindBin = path.join(widgetsDir, 'node_modules', '.bin', 'tailwindcss');

console.log('⚡ Compiling Tailwind CSS for Ext-Apps widgets...');

const cssOutputFile = path.join(outDir, 'widgets.min.css');
const contentGlob = `"${path.join(widgetsDir, 'app/**/*.{js,ts,jsx,tsx}')},${path.join(widgetsDir, 'components/**/*.{js,ts,jsx,tsx}')}"`;
const inputCss = path.join(widgetsDir, 'app', 'globals.css');

execSync(`${tailwindBin} --content ${contentGlob} -i "${inputCss}" -o "${cssOutputFile}" --minify`, {
  cwd: widgetsDir,
  stdio: 'inherit',
});

const cssContent = fs.readFileSync(cssOutputFile, 'utf-8');
console.log(`✅ Compiled Tailwind CSS (${(cssContent.length / 1024).toFixed(1)} KB)`);

if (!fs.existsSync(outDir)) {
  console.error('❌ out directory does not exist:', outDir);
  process.exit(1);
}

const htmlFiles = fs.readdirSync(outDir).filter(f => f.endsWith('.html') && !f.startsWith('_'));
console.log(`Injecting CSS into ${htmlFiles.length} widget HTML files...`);

for (const file of htmlFiles) {
  const filePath = path.join(outDir, file);
  let html = fs.readFileSync(filePath, 'utf-8');
  
  // Replace existing injected tailwind style or append before </head>
  const styleTag = `<style id="tailwind-styles">\n${cssContent}\n</style>`;
  if (html.includes('id="tailwind-styles"')) {
    html = html.replace(/<style id="tailwind-styles">[\s\S]*?<\/style>/, styleTag);
  } else if (html.includes('</head>')) {
    html = html.replace('</head>', `${styleTag}\n</head>`);
  } else {
    html = styleTag + html;
  }
  
  fs.writeFileSync(filePath, html, 'utf-8');
  console.log(`  ✓ Injected CSS into ${file}`);
}

console.log('🎉 Successfully injected Tailwind CSS into all widget bundles!');
