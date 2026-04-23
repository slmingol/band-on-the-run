import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 Deduplicating song library...\n');

// Path to the main library file
const songsPath = path.join(__dirname, '..', 'server', 'data', 'top-songs.json');

// Load existing songs
const existingSongs = JSON.parse(fs.readFileSync(songsPath, 'utf8'));

console.log(`📚 Current library: ${existingSongs.length} songs`);

// Deduplicate using lowercase title|||artist key
const seen = new Set();
const uniqueSongs = existingSongs.filter(song => {
  const key = `${song.title.toLowerCase()}|||${song.artist.toLowerCase()}`;
  if (seen.has(key)) {
    return false; // Skip duplicate
  }
  seen.add(key);
  return true; // Keep unique
});

const duplicatesRemoved = existingSongs.length - uniqueSongs.length;

console.log(`✅ Removed ${duplicatesRemoved} duplicates`);
console.log(`📊 New library size: ${uniqueSongs.length} songs\n`);

if (duplicatesRemoved === 0) {
  console.log('✨ No duplicates found! Library is clean.');
  process.exit(0);
}

// Create backup
const backupPath = path.join(__dirname, '..', 'server', 'data', `top-songs.backup.${Date.now()}.json`);
fs.writeFileSync(backupPath, JSON.stringify(existingSongs, null, 2));
console.log(`💾 Backup saved: ${path.basename(backupPath)}`);

// Write deduplicated library
fs.writeFileSync(songsPath, JSON.stringify(uniqueSongs, null, 2));

// Also update public copy if it exists
const publicSongsPath = path.join(__dirname, '..', 'public', 'top-songs.json');
if (fs.existsSync(publicSongsPath)) {
  fs.writeFileSync(publicSongsPath, JSON.stringify(uniqueSongs, null, 2));
  console.log(`📄 Updated public copy`);
}

// Update config
const configPath = path.join(__dirname, '..', 'config', 'song-library-config.json');
if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  config.currentSongCount = uniqueSongs.length;
  config.lastUpdated = new Date().toISOString().split('T')[0];
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  const publicConfigPath = path.join(__dirname, '..', 'public', 'config', 'song-library-config.json');
  if (fs.existsSync(publicConfigPath)) {
    fs.writeFileSync(publicConfigPath, JSON.stringify(config, null, 2));
  }
  console.log(`📊 Updated config: ${uniqueSongs.length} songs`);
}

console.log('\n✨ Deduplication complete!');
