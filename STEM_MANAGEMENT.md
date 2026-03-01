# Stem Management System

Automated system for downloading and processing song stems for the top songs of all time.

## Overview

Instead of manually downloading and processing each song, this system:
- Maintains a curated list of top 100 songs
- Downloads iTunes previews automatically
- Processes them with Demucs
- Skips already-processed songs
- Provides a web UI for management

## Setup

### 1. Install Dependencies

```bash
npm install
```

This installs:
- `express` - Backend API server
- `cors` - Enable cross-origin requests
- `node-fetch` - Download audio files

### 2. Ensure Prerequisites

Make sure you have:
- **Python 3** with Demucs installed: `pip install demucs`
- **FFmpeg** installed: `brew install ffmpeg` (macOS) or your system's package manager

### 3. Start the Stem Management Server

```bash
npm run stem-server
```

This starts a backend server on `http://localhost:3001` that handles:
- Downloading iTunes previews
- Running Demucs to separate stems
- Tracking processing status

## Usage

### Via Web UI (Recommended)

1. Start the stem server: `npm run stem-server`
2. Start the dev server: `npm run dev`
3. Open the app in your browser
4. Go to **Admin** (⚙️ icon in menu)
5. Find the **🎸 Stem Management** section
6. Set the number of songs you want (1-100)
7. Click **🎵 Download & Process Stems**
8. Monitor progress in the terminal where stem server is running

The system will:
- ✅ Download iTunes previews for songs that aren't downloaded
- ✅ Process stems for songs that haven't been processed
- ⏭️ Skip songs that already have stems
- 📊 Show you the current status (X/100 processed)

### Via Command Line

You can also process stems directly:

```bash
node server/stem-processor.js
```

## Song List

The top songs are curated in `scripts/top-songs.json`. The default list includes 100 classic songs, but you can expand it up to 2500 songs.

**To add more songs:**

1. Edit `scripts/top-songs.json`
2. Add entries in this format:
   ```json
   { "title": "Song Name", "artist": "Artist Name" }
   ```
3. The system supports up to 2500 songs
4. Songs are processed in order from the list

**Current top 100 includes classics like:**
- Bohemian Rhapsody - Queen
- Hotel California - Eagles
- Stairway to Heaven - Led Zeppelin
- Sweet Child O' Mine - Guns N' Roses
- ...and 96 more!

You can edit this file to customize the song list.

## File Structure

```
public/audio/
  originals/           # Downloaded .m4a files from iTunes
  stems/
    htdemucs/         # Processed stems (bass, drums, vocals, other)
      Queen-Bohemian_Rhapsody/
        bass.mp3
        drums.mp3
        vocals.mp3
        other.mp3
      Eagles-Hotel_California/
        ...
```

## Processing Time

- **Per song**: ~10 seconds (depends on your CPU)
- **10 songs**: ~2 minutes
- **50 songs**: ~8 minutes
- **100 songs**: ~17 minutes
- **500 songs**: ~1.4 hours
- **2500 songs**: ~7 hours

First run downloads AI models (~500MB), subsequent runs are faster.

**Tip:** Process in batches (e.g., 50-100 at a time) to monitor progress and avoid long waits.

## Storage Requirements

- **Per song**: ~2.8 MB (4 stems × 700KB each)
- **10 songs**: ~28 MB
- **50 songs**: ~140 MB
- **100 songs**: ~280 MB
- **500 songs**: ~1.4 GB
- **2500 songs**: ~7 GB

Plan storage accordingly if processing large batches.

## Docker Deployment

Stems are stored on the host and mounted into containers via bind mount:

```yaml
volumes:
  - ./public/audio/stems:/app/public/audio/stems:ro
```

This means:
- ✅ Process stems once on your server
- ✅ Docker image stays small
- ✅ Add new stems without rebuilding
- ✅ Stems persist across container restarts

## Troubleshooting

**"Stem server not running"**
- Start it with: `npm run stem-server`
- Check that port 3001 is not in use

**"No preview found for [song]"**
- iTunes doesn't have a preview for that song
- Edit `scripts/top-songs.json` to replace with a different song
- Or the song title/artist might be spelled differently

**"Demucs failed"**
- Make sure Demucs is installed: `pip install demucs`
- Check that FFmpeg is installed: `ffmpeg -version`
- Some songs may fail due to audio format issues

**Processing is slow**
- Demucs is CPU-intensive
- Process in batches (e.g., 10 at a time) instead of all 100
- First run downloads models (~500MB), subsequent runs are faster

## Workflow

1. **Initial setup**: Process top 10-20 songs
2. **Test gameplay**: Ensure stems play correctly
3. **Expand gradually**: Process more as needed
4. **Deploy**: Copy `public/audio/stems` to your server
5. **Update**: Run periodically to add new songs

## Notes

- Already processed songs are automatically skipped
- You can safely interrupt processing (Ctrl+C) and resume later
- The system checks for existing `bass.mp3` to determine if a song is processed
- After processing, you may need to manually update `src/utils/gameLogic.js` to add new songs to `SONGS_WITH_STEMS` array
