# 🎸 Stem Separation Guide

This guide explains how to separate songs into individual instruments (bass, drums, vocals, other) for the Band on the Run game.

## Prerequisites

1. **Python 3.8+** installed
2. **Node.js** (you already have this)
3. **FFmpeg** for audio processing

### Install FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt-get install ffmpeg
```

**Windows:**
Download from https://ffmpeg.org/download.html

## Step 1: Install Spleeter

Spleeter is an AI model from Deezer that separates audio into stems.

```bash
# Create a virtual environment (recommended)
python3 -m venv spleeter-env
source spleeter-env/bin/activate  # On Windows: spleeter-env\Scripts\activate

# Install Spleeter
pip install spleeter
```

## Step 2: Download iTunes Previews

This script downloads 30-second previews from iTunes:

```bash
npm run download-audio
```

This creates `public/audio/originals/` with downloaded preview files.

## Step 3: Separate Stems

Run Spleeter to split each song into 4 stems:

```bash
# Make sure you're in the spleeter virtual environment
source spleeter-env/bin/activate

# Process all downloaded songs
spleeter separate -i public/audio/originals/*.m4a -p spleeter:4stems -o public/audio/stems

# This creates:
# public/audio/stems/Song_Name/
#   ├── bass.wav
#   ├── drums.wav
#   ├── vocals.wav
#   └── other.wav
```

**What the stems are:**
- **bass.wav** - Bass guitar and low frequencies
- **drums.wav** - Drums and percussion
- **vocals.wav** - Lead and background vocals
- **other.wav** - Everything else (guitars, keys, synths)

## Step 4: Convert to MP3 (Optional but Recommended)

WAV files are large. Convert to MP3 to save space:

```bash
# Install a conversion script
npm install -g @binyamin/spleeter-to-mp3

# Or manually with ffmpeg
for dir in public/audio/stems/*/; do
  for wav in "$dir"*.wav; do
    ffmpeg -i "$wav" -codec:a libmp3lame -qscale:a 2 "${wav%.wav}.mp3"
    rm "$wav"  # Remove WAV after conversion
  done
done
```

## Step 5: Update Game Data

Edit `src/utils/gameLogic.js`:

```javascript
const BASE_SONGS = [
  {
    title: "Sweet Child O' Mine",
    artist: "Guns N' Roses",
    stems: {
      bass: "/audio/stems/Guns_N_Roses-Sweet_Child_O_Mine/bass.mp3",
      drums: "/audio/stems/Guns_N_Roses-Sweet_Child_O_Mine/drums.mp3",
      vocals: "/audio/stems/Guns_N_Roses-Sweet_Child_O_Mine/vocals.mp3",
      other: "/audio/stems/Guns_N_Roses-Sweet_Child_O_Mine/other.mp3"
    },
    instruments: ["🎸 Bass", "🥁 Drums", "🎤 Vocals", "🎹 Other"]
  }
]
```

## Alternative: Use Demucs (Better Quality)

Demucs is newer and often produces better results:

```bash
pip install demucs

# Separate audio
demucs --mp3 --mp3-bitrate 192 public/audio/originals/*.m4a -o public/audio/stems
```

Demucs outputs: `bass.mp3`, `drums.mp3`, `vocals.mp3`, `other.mp3`

## Troubleshooting

**"No module named spleeter"**
- Make sure you activated the virtual environment: `source spleeter-env/bin/activate`

**"FFmpeg not found"**
- Install FFmpeg (see prerequisites above)

**Slow processing**
- First run downloads AI models (~500MB), subsequent runs are faster
- Processing time: ~30 seconds per song on modern hardware

**Out of memory**
- Spleeter requires ~4GB RAM
- Process songs one at a time if needed

## Storage Requirements

Per song:
- Original preview: ~1MB
- 4 WAV stems: ~50MB
- 4 MP3 stems: ~5MB

For 15 songs: ~75MB total (with MP3 compression)

## Next Steps

After generating stems, update the Game component to play stems progressively based on the current instrument level!
