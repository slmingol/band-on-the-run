# 🎵 Band on the Run

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

\`\`\`
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
\`\`\`

## Adding Songs

To add more songs, edit \`src/utils/gameLogic.js\` and add entries to the \`SONGS\` array:

\`\`\`javascript
{
  title: "Song Title",
  artist: "Artist Name",
  instruments: ["🎸 Guitar", "🥁 Drums", "🎤 Vocals"],
  audioUrl: "/audio/your-song.mp3"
}
\`\`\`

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

## License

MIT

## Acknowledgments

- Inspired by music guessing games
- Part of the daily puzzle game genre including Wordle, Heardle, and similar games
