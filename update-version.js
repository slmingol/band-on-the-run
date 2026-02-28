import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json
const packageJson = JSON.parse(
  readFileSync(join(__dirname, 'package.json'), 'utf8')
);

// Ensure public directory exists
try {
  mkdirSync(join(__dirname, 'public'), { recursive: true });
} catch (error) {
  // Directory might already exist, that's ok
}

// Write version.json
const versionData = {
  version: packageJson.version,
  buildTime: new Date().toISOString()
};

writeFileSync(
  join(__dirname, 'public', 'version.json'),
  JSON.stringify(versionData, null, 2)
);

console.log(`✓ Updated version.json to ${packageJson.version}`);
