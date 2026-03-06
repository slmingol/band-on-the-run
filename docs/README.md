<img src="public/images/slow_paw_mickey_guitar_w_cigarette_transparent.png" alt="Band on the Run Logo" width="200">

# 🎵 Band on the Run

[![Version](https://img.shields.io/github/package-json/v/slmingol/band-on-the-run?label=Version&color=brightgreen)](https://github.com/slmingol/band-on-the-run)
[![Build Status](https://img.shields.io/github/actions/workflow/status/slmingol/band-on-the-run/docker-build.yml?branch=main&label=Build)](https://github.com/slmingol/band-on-the-run/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0.3-646CFF.svg)](https://vitejs.dev/)
[![Node](https://img.shields.io/badge/Node-20+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![Container Registry](https://img.shields.io/badge/GHCR-Published-blue)](https://github.com/slmingol/band-on-the-run/pkgs/container/band-on-the-run)

A music guessing game where you guess the song one instrument at a time!

## Features

- 🎯 **Daily Puzzle Mode** - One puzzle per day, same for everyone
- 🎮 **Practice Mode** - Unlimited games with random songs
- 📊 **Stats Tracking** - Track your wins, streaks, and performance
- 📋 **Share Results** - Share your scores with friends
- 🎨 **Modern UI** - Clean, responsive design inspired by Spotify

## How to Play

1. Listen to the first instrument
2. Guess the song from the dropdown list
3. Each wrong guess reveals another instrument
4. Try to guess with as few instruments as possible!

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **CSS3** - Styling with CSS custom properties
- **LocalStorage** - Stats persistence

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
\`\`\`

## Project Structure

```
band-on-the-run/
├── src/
│   ├── components/
│   │   ├── Game.jsx          # Main game component
│   │   ├── Game.css
│   │   ├── Menu.jsx          # Main menu
│   │   ├── Menu.css
│   │   ├── Stats.jsx         # Statistics display
│   │   └── Stats.css
│   ├── utils/
│   │   └── gameLogic.js      # Game logic and data
│   ├── App.jsx               # Root component
│   ├── App.css
│   ├── main.jsx              # Entry point
│   └── index.css             # Global styles
├── public/                   # Static assets
├── index.html
├── vite.config.js
└── package.json
```

## Adding Songs

To add more songs, edit `src/utils/gameLogic.js` and add entries to the `SONGS` array:

```javascript
{
  title: "Song Title",
  artist: "Artist Name",
  instruments: ["🎸 Guitar", "🥁 Drums", "🎤 Vocals"],
  audioUrl: "/audio/your-song.mp3"
}
```

## Audio Files

Currently, the app uses placeholder audio URLs. To add real audio:

1. Create a \`public/audio\` directory
2. Add your audio files (MP3 format recommended)
3. Update the \`audioUrl\` in each song object

For a production app, you would need:
- Separate audio tracks for each instrument
- Logic to layer instruments progressively
- Or use an audio processing library

## Future Enhancements

- [ ] Real multi-track audio with instrument isolation
- [ ] Multiplayer mode
- [ ] More songs (1000+)
- [ ] Weekly challenges
- [ ] Leaderboards
- [ ] Different difficulty levels
- [ ] Genre-specific modes
- [ ] Spotify/Apple Music integration

## Managing Stem Files

### Stem File Structure

Stem files are stored in `public/audio/stems/htdemucs/` with the following structure:

```
public/audio/stems/htdemucs/
├── Artist_Name-Song_Title/
│   ├── bass.mp3      # Bass track
│   ├── drums.mp3     # Drums track
│   ├── other.mp3     # Other instruments (guitars, keyboards, etc.)
│   └── vocals.mp3    # Vocal track
└── Another_Song/
    ├── bass.mp3
    ├── drums.mp3
    ├── other.mp3
    └── vocals.mp3
```

Each song folder contains 4 MP3 files (192 kbps), totaling ~2.8MB per song.

### Moving Stem Files Between Servers

#### Option 1: Direct Copy (rsync)

Copy stem files from one server to another using rsync:

```bash
# From source server to destination server
rsync -avz --progress \
  /path/to/band-on-the-run/public/audio/stems/ \
  user@destination-server:/path/to/band-on-the-run/public/audio/stems/

# Or if you have SSH key access
rsync -avz --progress -e "ssh -i ~/.ssh/your-key.pem" \
  public/audio/stems/ \
  ubuntu@destination-server:/var/www/band-on-the-run/public/audio/stems/
```

#### Option 2: Archive and Transfer

For offline transfer or backup:

```bash
# On source server - create compressed archive
tar -czf stems-backup.tar.gz -C public/audio stems/

# Transfer file (using scp, sftp, or your preferred method)
scp stems-backup.tar.gz user@destination-server:/tmp/

# On destination server - extract
cd /path/to/band-on-the-run
tar -xzf /tmp/stems-backup.tar.gz -C public/audio/
```

#### Option 3: Using Docker Volumes

If you're using Docker, you can copy between containers:

```bash
# From a running container to local filesystem
docker cp band-on-the-run:/app/public/audio/stems ./stems-backup

# From local filesystem to a running container
docker cp ./stems-backup/ band-on-the-run:/app/public/audio/stems
```

### Docker Bind Mounts for Stem Files

The application uses Docker bind mounts to expose stem files into containers. This allows you to store stems outside the container and persist them across container rebuilds.

#### Current Docker Compose Configuration

The `docker-compose.yml` files include a bind mount for stem files:

```yaml
services:
  band-on-the-run:
    build: .
    ports:
      - "3000:80"
    volumes:
      - ./public/audio/stems:/app/public/audio/stems:ro
    restart: unless-stopped
```

This mounts your local `public/audio/stems` directory to `/app/public/audio/stems` inside the container (read-only).

#### Custom Stem File Location

To store stem files in a different location on your server:

**Option 1: Update docker-compose.yml**

```yaml
services:
  band-on-the-run:
    build: .
    ports:
      - "3000:80"
    volumes:
      # Mount from custom location
      - /mnt/storage/music-stems:/app/public/audio/stems:ro
    restart: unless-stopped
```

**Option 2: Use Symbolic Link**

Keep the original bind mount but symlink to your storage location:

```bash
# Remove existing stems directory (backup first!)
mv public/audio/stems public/audio/stems.backup

# Create symlink to your storage location
ln -s /mnt/storage/music-stems public/audio/stems

# Now docker-compose will follow the symlink
docker-compose up -d
```

**Option 3: Environment Variables**

Create a `.env` file in your project root:

```bash
STEMS_PATH=/mnt/storage/music-stems
```

Update `docker-compose.yml`:

```yaml
services:
  band-on-the-run:
    build: .
    ports:
      - "3000:80"
    volumes:
      - ${STEMS_PATH:-./public/audio/stems}:/app/public/audio/stems:ro
    restart: unless-stopped
```

#### Shared Network Storage

For multiple servers sharing stem files (NFS, Samba, etc.):

```yaml
services:
  band-on-the-run:
    build: .
    ports:
      - "3000:80"
    volumes:
      # Mount NFS share
      - /mnt/nfs/shared-stems:/app/public/audio/stems:ro
    restart: unless-stopped
```

Set up NFS mount on your host first:

```bash
# Install NFS client
sudo apt-get install nfs-common

# Create mount point
sudo mkdir -p /mnt/nfs/shared-stems

# Add to /etc/fstab for persistent mount
echo "nfs-server:/export/stems /mnt/nfs/shared-stems nfs defaults 0 0" | sudo tee -a /etc/fstab

# Mount now
sudo mount -a
```

#### Permissions

Ensure the Docker container can read the stem files:

```bash
# Make stems readable by all (if using bind mount)
chmod -R 755 public/audio/stems

# Or set ownership to your Docker user (if needed)
sudo chown -R 1000:1000 public/audio/stems
```

#### Verify Bind Mount

After starting the container, verify the stem files are accessible:

```bash
# Check if stems are mounted
docker exec band-on-the-run ls -la /app/public/audio/stems/htdemucs | head -10

# Count stem folders
docker exec band-on-the-run sh -c "ls /app/public/audio/stems/htdemucs | wc -l"
```

### Generating Stem Files

Stem files are generated automatically using the admin panel:

1. Access the Admin panel in the application (⚙️ Settings)
2. Under "Stem Management", enter the number of songs to process
3. Click "Download & Process Stems"
4. The system will:
   - Download 30-second previews from iTunes API
   - Separate audio into 4 stems using Demucs AI
   - Save to `public/audio/stems/htdemucs/`

**Note:** Generating stems requires:
- ~10 seconds per song
- Demucs to be installed (`npm run stem-server` starts the processor)
- Adequate disk space (~2.8MB per song)

See [STEM_MANAGEMENT.md](STEM_MANAGEMENT.md) for detailed stem processing documentation.

## Deployment to Remote Server

### Copying Data to Remote Server

When deploying to a remote server running Docker containers, you need to copy the application data (stems and song metadata).

#### Required Files to Copy

1. **Audio stems** - `public/audio/stems/` directory
2. **Song metadata** - `public/top-songs.json` 
3. **Backend song list** - `scripts/top-songs.json`

#### Using rsync (Recommended)

Rsync efficiently copies only changed files and shows progress:

```bash
# Copy public directory (includes audio stems and top-songs.json)
rsync -avz --progress ./public/ root@remote-server:~/docker_apps/bandontherun/public/

# Copy scripts directory (includes top-songs.json for backend)
rsync -avz --progress ./scripts/ root@remote-server:~/docker_apps/bandontherun/scripts/
```

**Quick deployment:** See [`rsync.sh`](rsync.sh) for a ready-to-use deployment script with the above commands.

**Options explained:**
- `-a` = archive mode (preserves permissions, timestamps)
- `-v` = verbose output
- `-z` = compress during transfer
- `--progress` = show transfer progress

#### Alternative: scp (Simple Copy)

For one-time transfers:

```bash
# Copy entire directories
scp -r ./public root@remote-server:~/docker_apps/bandontherun/
scp -r ./scripts root@remote-server:~/docker_apps/bandontherun/
```

#### Alternative: tar + ssh (Best for large data)

Compress and stream in one command:

```bash
# Copy public directory
tar czf - ./public | ssh root@remote-server "cd ~/docker_apps/bandontherun && tar xzf -"

# Copy scripts directory
tar czf - ./scripts | ssh root@remote-server "cd ~/docker_apps/bandontherun && tar xzf -"
```

#### Verify After Copy

On the remote server:

```bash
# Check stem files count
ls ~/docker_apps/bandontherun/public/audio/stems/htdemucs/ | wc -l

# Verify song metadata exists
ls -lh ~/docker_apps/bandontherun/public/top-songs.json
ls -lh ~/docker_apps/bandontherun/scripts/top-songs.json
```

### Docker Compose Configuration

The docker-compose files automatically mount the required directories:

```yaml
services:
  frontend:
    ports:
      - "3434:80"
    volumes:
      - ./public/audio/stems:/usr/share/nginx/html/audio/stems:ro
  
  backend:
    ports:
      - "3435:3001"
    volumes:
      - ./public/audio:/app/public/audio
      - ./scripts:/app/scripts:ro
```

**Ports:**
- Frontend: http://localhost:3434
- Backend API: http://localhost:3435

### Starting the Application

After copying data to the remote server:

```bash
# Using prebuilt images from GitHub Container Registry
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# Or build locally
docker compose up -d --build
```

## License

MIT

## Acknowledgments

- Inspired by music guessing games
- Part of the daily puzzle game genre including Wordle, Heardle, and similar games
