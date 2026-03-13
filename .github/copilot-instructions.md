# Band on the Run - Copilot Instructions

## Project Overview

Music guessing game where players identify songs by listening to individual instrument stems (bass, drums, vocals, other). Built with React 18 and Vite 6, featuring Spotify API integration, automated stem processing, and Docker deployment.

**Stack**: React 18.3.1, Vite 6.0.3, Node.js 20+, Express 4.18.2. **No testing framework or linting configured.**

## Build Commands (CRITICAL - Follow Order)

```bash
# 1. Install dependencies
npm install                 # ALWAYS run first after clone

# 2. Environment setup (REQUIRED for Spotify features)
cp .env.example .env       # Create .env file
# Edit .env and add Spotify credentials:
# VITE_SPOTIFY_CLIENT_ID=your_client_id
# VITE_SPOTIFY_CLIENT_SECRET=your_client_secret

# 3. Build (production)
npm run build              # Creates dist/ folder (~3-4s)
                          # Output: ~200KB JS bundle (60KB gzipped)

# 4. Development
npm run dev                # Starts on http://localhost:5173
                          # Hot reload enabled, accessible on network

# 5. Preview production build
npm run preview            # Serves dist/ folder locally

# 6. Additional scripts
npm run download-audio     # Download iTunes previews to public/audio/originals/
npm run stem-server        # Start stem processing server on port 3001
npm run add-songs          # Add songs incrementally to library
```

**No linting or testing configured** - Project doesn't use ESLint, Prettier, or testing frameworks.

**Critical**: Spotify credentials required in `.env` for preview playback. Without them, app runs but audio won't play.

## Project Structure

```
.github/workflows/         # auto-version.yml, docker-build.yml, cleanup-*.yml
config/                    # song-library-config.json (incremental song management)
docker/                    # Dockerfile (multi-stage), nginx.conf, podman compose files
docs/                      # 7 .md files: QUICKSTART, STEM_SEPARATION, SPOTIFY_SETUP, etc.
public/
  audio/
    originals/            # Downloaded iTunes previews (.m4a)
    stems/htdemucs/       # Processed stem files (bass, drums, vocals, other)
  config/                 # song-library-config.json
  images/                 # Logo assets
  top-songs.json          # Song database
  version.json            # Auto-generated version info
scripts/
  download-and-split.js   # Downloads iTunes previews
  add-songs.js            # Incremental song library expansion
  generate-top-songs.js   # Generates curated song list
  top-songs.json          # Source song database (up to 2500 songs)
server/                   # Express backend
  index.js                # Main server (port 3001)
  stem-processor.js       # Stem processing logic (uses Demucs)
  song-enrichment.js      # Spotify/iTunes metadata enrichment
src/
  components/             # Game.jsx, Menu.jsx, Stats.jsx, Admin.jsx, etc.
  utils/
    gameLogic.js          # Core game logic and song data
    spotifyApi.js         # Spotify API wrapper
    useTheme.js           # Theme management hook
  App.jsx, main.jsx       # Root component and entry
  *.css                   # Component-scoped styles
vite.config.js            # Proxy to :3001/api, host: true
package.json              # Scripts and dependencies
update-version.js         # Updates public/version.json
```

**Key Files**:
- `src/utils/gameLogic.js`: Core game logic, song database, instrument data
- `server/index.js`: Backend server for stem processing and song enrichment
- `scripts/add-songs.js`: Incremental song library management (current: 492, target: 2500)
- `public/audio/stems/htdemucs/`: Stem files organized by song (Artist_Name-Song_Title/bass|drums|vocals|other.mp3)
- `.env`: REQUIRED for Spotify API (not in repo, copy from .env.example)

## CI/CD Workflows

**Auto Version Bump** (`.github/workflows/auto-version.yml`): Triggers on push to `main` (excluding package.json changes). Bumps version based on commit messages:
- `BREAKING CHANGE` or `major:` → major version
- `feat:` or `feature:` → minor version  
- Everything else → patch version

Updates `package.json`, `package-lock.json`, and `public/version.json`, then commits back.

**Docker Build** (`.github/workflows/docker-build.yml`): Triggers on push to `main`, tags `v*.*.*`, PRs. Builds frontend and backend images separately, pushes to `ghcr.io/slmingol/band-on-the-run`.

**Cleanup Workflows**: `cleanup-artifacts.yml` and `cleanup-docker.yml` manage artifact and image retention.

**Docker Usage**:
```bash
# Development (hot reload)
podman compose -f docker-compose.dev.yml up

# Production (build from source)
podman compose -f docker-compose.prod.yml up --build

# Or use main compose file
podman compose up
```

## Validation Checklist (Before Merge/Deploy)

```bash
npm run build       # MUST complete without errors (~3-4s)
npm run dev         # Verify app loads at http://localhost:5173
```

**Manual verification required** (no automated tests):
- Open app, check menu renders
- Select Daily/Practice mode
- Play audio (verify Spotify integration works)
- Check stats tracking
- Test admin panel (if accessing stem management)

## Spotify API Setup (REQUIRED)

1. Go to https://developer.spotify.com/dashboard → Create app
2. Redirect URI: `http://localhost:5173`, copy Client ID and Secret
3. Create `.env`:
```env
VITE_SPOTIFY_CLIENT_ID=your_client_id_here
VITE_SPOTIFY_CLIENT_SECRET=your_client_secret_here
```

**Without these**: App runs but audio won't play. Data cached 24hrs in localStorage. See `docs/SPOTIFY_SETUP.md` for troubleshooting.

## Stem Processing System

Songs separated into 4 stems using **Demucs** (Python AI): bass, drums, vocals, other. **Prerequisites**: Python 3.8+ with `pip install demucs`, FFmpeg (`brew install ffmpeg`).

**Via Web UI**: `npm run stem-server` (port 3001) + `npm run dev` → Admin panel → "Download & Process Stems"

**Manual**: `npm run download-audio` then `node server/stem-processor.js`

**Output**: `public/audio/stems/htdemucs/Artist-Song/{bass,drums,vocals,other}.mp3` (~2.8MB/song). See `docs/STEM_SEPARATION.md`.

## Incremental Song Library Management

**Current**: 492 songs, **Target**: 2500 (configurable in `config/song-library-config.json`).

```bash
npm run add-songs       # Adds next 100 songs (or configured batchSize)
```

Script appends new songs to `scripts/top-songs.json`, never replaces. Edit `batchSize` or `targetSongCount` in config. See `docs/INCREMENTAL_SONGS.md`.

## Backend Server

**Start**: `npm run stem-server` (port 3001). Handles stem processing, song enrichment with Spotify/iTunes. Auto-resumes interrupted jobs. State tracked in `server/processing-state.json` and `server/enrichment-state.json`. Vite proxies `/api` to port 3001.

## Known Issues & Workarounds

| Issue | Status | Solution |
|-------|--------|----------|
| No audio playing | Missing Spotify credentials | Add credentials to `.env` file, restart dev server |
| Stem processing fails | Missing Python/Demucs/FFmpeg | Install prerequisites: `pip install demucs`, `brew install ffmpeg` |
| "Cannot find module" errors | Missing node_modules | Run `npm install` |
| Backend server port conflict | Port 3001 in use | Kill process on 3001 or change port in `server/index.js` and `vite.config.js` |
| Large audio files committed | Ignored by git | Audio files in `public/audio/` are gitignored, good practice |

## Making Code Changes

**Components**: React JSX in `src/components/` with CSS files. No TypeScript, no prop-types.

**Game Logic**: `src/utils/gameLogic.js` - edit `SONGS` array:
```javascript
{ title: "Song", artist: "Artist", instruments: ["🎸 Guitar", "🥁 Drums"], audioUrl: "/audio/stems/htdemucs/Artist-Song" }
```

**Styling**: Component CSS files + global `src/index.css`. CSS custom properties for theming.

**Testing**: No test framework - manually verify in browser after changes.

## Docker & Version Management

**Docker**: Multi-stage build (Node 20 Alpine → Nginx Alpine). Backend has separate Dockerfile.
```bash
podman compose -f docker-compose.dev.yml up      # Dev with hot reload
podman compose -f docker-compose.prod.yml up     # Production
```

**Auto-versioning**: Commits to `main` bump version based on message:
- `feat:` → minor, `BREAKING CHANGE` → major, default → patch
- Updates `package.json`, `package-lock.json`, `public/version.json`

## Documentation

7 docs in `docs/`: QUICKSTART (3-min setup), SPOTIFY_SETUP, STEM_SEPARATION, STEM_MANAGEMENT, INCREMENTAL_SONGS, README.docker, README. Consult for detailed workflows.

## Environment Variables

**Required** (`.env`): `VITE_SPOTIFY_CLIENT_ID`, `VITE_SPOTIFY_CLIENT_SECRET`  
**Optional**: `ENABLE_ITUNES_API=1` (backend)  
**Note**: `.env` gitignored - never commit credentials.

## Trust These Instructions

This file was created through comprehensive repository analysis:
- Reading all documentation files (7 .md files)
- Testing build commands
- Verifying CI/CD workflows  
- Exploring project structure
- Understanding stem processing workflow
- Reviewing Spotify/iTunes integration

**When working on this project**: Trust these instructions first. Search for additional info only if incomplete or errors occur not documented here.
