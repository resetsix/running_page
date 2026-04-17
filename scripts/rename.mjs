import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const newName = process.argv.slice(2).join(' ').trim();

if (!newName) {
  process.stderr.write('Usage: pnpm rename <name>\n');
  process.exit(1);
}

const siteMetadataFiles = [
  'src/hooks/useSiteMetadata.ts',
  'src/static/site-metadata.ts',
];

const assetsDir = path.join(rootDir, 'assets');
const siteMetadataPath = path.join(rootDir, siteMetadataFiles[0]);
const siteMetadataSource = await readFile(siteMetadataPath, 'utf8');
const siteTitleMatch = siteMetadataSource.match(/siteTitle:\s*'([^']+)'/);

if (!siteTitleMatch) {
  process.stderr.write('Failed to detect current site title.\n');
  process.exit(1);
}

const currentTitle = siteTitleMatch[1];
const currentName = currentTitle.endsWith(' Running')
  ? currentTitle.slice(0, -' Running'.length)
  : currentTitle;
const newTitle = `${newName} Running`;

const replaceInFile = async (filePath, replacer) => {
  const source = await readFile(filePath, 'utf8');
  const next = replacer(source);

  if (next !== source) {
    await writeFile(filePath, next, 'utf8');
  }
};

for (const relativePath of siteMetadataFiles) {
  const absolutePath = path.join(rootDir, relativePath);
  await replaceInFile(
    absolutePath,
    (source) => source.replace(/siteTitle:\s*'[^']+'/g, `siteTitle: '${newTitle}'`)
  );
}

const assetEntries = await readdir(assetsDir, { withFileTypes: true });
for (const entry of assetEntries) {
  if (!entry.isFile() || !entry.name.endsWith('.svg')) {
    continue;
  }

  const assetPath = path.join(assetsDir, entry.name);
  await replaceInFile(assetPath, (source) =>
    source.replaceAll(currentTitle, newTitle).replaceAll(currentName, newName)
  );
}

process.stdout.write(`Renamed "${currentName}" to "${newName}".\n`);
