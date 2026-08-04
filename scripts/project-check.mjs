import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ignored = new Set(['node_modules', '.expo', 'android', 'ios', 'dist']);
const files = [];

function walk(directory) {
  for (const name of readdirSync(directory)) {
    if (ignored.has(name)) continue;
    const path = join(directory, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path);
    else files.push(path);
  }
}

walk(root);
const jsFiles = files.filter((file) => ['.js', '.mjs', '.cjs'].includes(extname(file)));
for (const file of jsFiles) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (error) {
    const stderr = String(error.stderr ?? '');
    // Node's parser does not understand JSX; Metro/Babel validates those files.
    if (!stderr.includes("Unexpected token '<'")) throw error;
  }
}

const importPattern = /(?:from\s+|import\s*\()['"](\.[^'"]+)['"]/g;
for (const file of jsFiles) {
  const source = readFileSync(file, 'utf8');
  let match;
  while ((match = importPattern.exec(source))) {
    const target = resolve(dirname(file), match[1]);
    const candidates = [target, `${target}.js`, `${target}.mjs`, join(target, 'index.js')];
    if (!candidates.some(existsSync)) {
      throw new Error(`Unresolved local import ${match[1]} in ${file}`);
    }
  }
}

for (const file of files.filter((item) => extname(item) === '.json')) {
  JSON.parse(readFileSync(file, 'utf8'));
}

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const declaredPackages = new Set([
  ...Object.keys(packageJson.dependencies ?? {}),
  ...Object.keys(packageJson.devDependencies ?? {}),
]);
const babelConfigPath = [join(root, 'babel.config.js'), join(root, 'babel.config.cjs')].find(existsSync);
if (
  babelConfigPath &&
  readFileSync(babelConfigPath, 'utf8').includes('babel-preset-expo') &&
  !declaredPackages.has('babel-preset-expo')
) {
  throw new Error('Babel config uses babel-preset-expo, but package.json does not declare it.');
}

console.log(`Static check passed: ${jsFiles.length} JavaScript/config files, local imports, JSON files, and Babel dependencies are valid.`);
