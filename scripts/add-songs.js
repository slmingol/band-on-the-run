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

// Keep fetching candidates until we have enough unique songs
const newSongs = [];
let searchOffset = existingSongs.length;
const batchSize = 500; // Fetch in batches

while (newSongs.length < songsToAdd) {
  const candidateBatch = generateNextBatch(searchOffset, batchSize);
  
  if (candidateBatch.length === 0) {
    console.log(`⚠️  Reached end of song database. Only ${newSongs.length} unique songs available.`);
    break;
  }
  
  // Filter duplicates from this batch
  const uniqueFromBatch = candidateBatch.filter(s => {
    const key = `${s.title.toLowerCase()}|||${s.artist.toLowerCase()}`;
    if (existingKeys.has(key)) return false;
    existingKeys.add(key); // Add to set so we don't add it again
    return true;
  });
  
  newSongs.push(...uniqueFromBatch);
  searchOffset += batchSize;
  
  // Stop if we have enough
  if (newSongs.length >= songsToAdd) {
    break;
  }
}

// Trim to exact count requested
const finalSongs = newSongs.slice(0, songsToAdd);

if (finalSongs.length < songsToAdd) {
  console.log(`⚠️  Only found ${finalSongs.length} unique songs (${songsToAdd - finalSongs.length} short of target)`);
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
console.log(`📊 Total library size: ${updatedLibrary.length} songs`);
console.log(`🎯 Progress: ${Math.round((updatedLibrary.length / config.targetSongCount) * 100)}%`);

function generateNextBatch(startIndex, count) {
  // Load Billboard #1 hits database from scripts/top-songs.json
  // This contains 1,653 songs from Billboard charts spanning 1950s-2020s
  const billboardSongsPath = path.join(__dirname, 'top-songs.json');
  const allSongs = JSON.parse(fs.readFileSync(billboardSongsPath, 'utf8'));
  
  // OLD APPROACH - hardcoded songs (kept for reference):
  // const allSongs = [
    //   { "title": "Twist and Shout", "artist": "The Beatles" },
    //   { "title": "Help!", "artist": "The Beatles" },
    //   ... 208 hardcoded songs ...
    // ];
  
  console.log(`📀 Loaded ${allSongs.length} songs from Billboard database`);

  // Return only the songs we need for this batch, starting from the appropriate index
  return allSongs.slice(startIndex, startIndex + count);
}
