// Script to download iTunes previews and prepare for stem separation
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// iTunes Search API
async function searchTrack(trackName, artistName) {
  const query = `${trackName} ${artistName}`;
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=5`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.results && data.results.length > 0) {
    const track = data.results[0];
    return {
      previewUrl: track.previewUrl,
      trackName: track.trackName,
      artistName: track.artistName
    };
  }
  return null;
}

// Download audio file
async function downloadAudio(url, outputPath) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
}

// Sample songs to process
const songs = [
  { title: "Bohemian Rhapsody", artist: "Queen" },
  { title: "Hotel California", artist: "Eagles" },
  { title: "Sweet Child O' Mine", artist: "Guns N' Roses" }
];

async function main() {
  const audioDir = path.join(__dirname, '..', 'public', 'audio', 'originals');
  
  // Create directories
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }
  
  console.log('🎵 Downloading iTunes previews...\n');
  
  for (const song of songs) {
    console.log(`Searching: ${song.title} - ${song.artist}`);
    
    try {
      const track = await searchTrack(song.title, song.artist);
      
      if (track && track.previewUrl) {
        const filename = `${song.artist.replace(/\s+/g, '_')}-${song.title.replace(/\s+/g, '_')}.m4a`;
        const filepath = path.join(audioDir, filename);
        
        console.log(`  ✅ Found preview, downloading...`);
        await downloadAudio(track.previewUrl, filepath);
        console.log(`  💾 Saved: ${filename}\n`);
      } else {
        console.log(`  ❌ No preview found\n`);
      }
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}\n`);
    }
    
    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n✅ Download complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Install Spleeter: pip install spleeter');
  console.log('2. Run stem separation:');
  console.log('   spleeter separate -i public/audio/originals/*.m4a -p spleeter:4stems -o public/audio/stems');
  console.log('\n   This will create folders with separated stems (bass, drums, vocals, other)');
}

main().catch(console.error);
