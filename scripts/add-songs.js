import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load configuration
const configPath = path.join(__dirname, '..', 'config', 'song-library-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Load existing songs from writable directory
const songsPath = path.join(__dirname, '..', 'server', 'data', 'top-songs.json');
const existingSongs = JSON.parse(fs.readFileSync(songsPath, 'utf8'));

console.log(`📚 Current library: ${existingSongs.length} songs`);
console.log(`🎯 Target: ${config.targetSongCount} songs`);
console.log(`📦 Batch size: ${config.batchSize} songs`);

// Calculate how many songs to add
const songsToAdd = Math.min(
  config.batchSize,
  config.targetSongCount - existingSongs.length
);

if (songsToAdd <= 0) {
  console.log(`✅ Already at or above target! Current: ${existingSongs.length}, Target: ${config.targetSongCount}`);
  process.exit(0);
}

console.log(`➕ Adding ${songsToAdd} new songs...`);

// Build set of existing songs for duplicate checking
const existingKeys = new Set(
  existingSongs.map(s => `${s.title.toLowerCase()}|||${s.artist.toLowerCase()}`)
);

console.log(`🔍 Loading comprehensive song database...`);

// Load the entire comprehensive database
const billboardSongsPath = path.join(__dirname, 'top-songs.json');
const allSongs = JSON.parse(fs.readFileSync(billboardSongsPath, 'utf8'));

console.log(`📀 Loaded ${allSongs.length} songs from database`);
console.log(`🔄 Filtering out ${existingKeys.size} existing songs...`);

// Filter out all existing songs
const availableSongs = allSongs.filter(s => {
  const key = `${s.title.toLowerCase()}|||${s.artist.toLowerCase()}`;
  return !existingKeys.has(key);
});

console.log(`✅ ${availableSongs.length} unique songs available to add`);

if (availableSongs.length === 0) {
  console.log(`⚠️  No new songs available! All songs from database already in library.`);
  process.exit(0);
}

// Take only what we need
const finalSongs = availableSongs.slice(0, songsToAdd);

if (finalSongs.length < songsToAdd) {
  console.log(`⚠️  Only ${finalSongs.length} unique songs available (${songsToAdd - finalSongs.length} short of target)`);
}

// Append new songs to existing library
const updatedLibrary = [...existingSongs, ...finalSongs];

// Write updated library
fs.writeFileSync(songsPath, JSON.stringify(updatedLibrary, null, 2));

// Also copy to public directory for frontend access
const publicSongsPath = path.join(__dirname, '..', 'public', 'top-songs.json');
fs.writeFileSync(publicSongsPath, JSON.stringify(updatedLibrary, null, 2));

// Update config
config.currentSongCount = updatedLibrary.length;
config.lastUpdated = new Date().toISOString().split('T')[0];
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

// Also update the public copy for browser access
const publicConfigPath = path.join(__dirname, '..', 'public', 'config', 'song-library-config.json');
fs.mkdirSync(path.dirname(publicConfigPath), { recursive: true });
fs.writeFileSync(publicConfigPath, JSON.stringify(config, null, 2));

console.log(`✅ Added ${finalSongs.length} songs`);
console.log(`📊 Total library size: ${updatedLibrary.length} songs`);
console.log(`🎯 Progress: ${Math.round((updatedLibrary.length / config.targetSongCount) * 100)}%`);

