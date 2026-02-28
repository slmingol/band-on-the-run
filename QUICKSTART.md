# 🎵 Band on the Run - iTunes Integration Quick Start

## What Was Added

✅ **Spotify API Integration**
- Real 30-second preview URLs for all songs
- Automatic token management (cached in localStorage)
- 15 classic rock/pop songs in the database

✅ **Smart Caching**
- Spotify data cached for 24 hours
- Reduces API calls
- Faster load times after first run

✅ **Files Created**
- `src/utils/spotifyApi.js` - Spotify API wrapper
- `.env.example` - Environment variables template
- `SPOTIFY_SETUP.md` - Detailed setup instructions
- `QUICKSTART.md` - This file!

## Get Started in 3 Minutes

### 1. Get Spotify Credentials (2 minutes)

1. Go to https://developer.spotify.com/dashboard
2. Log in with Spotify
3. Click "Create app"
4. Fill in:
   - Name: `Band on the Run`
   - Description: `Music guessing game`
   - Redirect URI: `http://localhost:5173`
5. Save and copy your **Client ID** and **Client Secret**

### 2. Configure the App (30 seconds)

Create a `.env` file:

```bash
cd /Users/smingolelli/dev/projects/bandle-clone
cp .env.example .env
```

Edit `.env` and paste your credentials:

```env
VITE_SPOTIFY_CLIENT_ID=paste_your_client_id_here
VITE_SPOTIFY_CLIENT_SECRET=paste_your_client_secret_here
```

### 3. Run It! (30 seconds)

```bash
npm run dev
```

Open http://localhost:5173

## What Happens Now

1. ✨ First load: App fetches Spotify previews for all 15 songs (~3 seconds)
2. 💾 Subsequent loads: Uses cached data (instant!)
3. 🎵 Click play: Real 30-second Spotify previews!
4. 🔄 Cache expires after 24 hours

## Verify It's Working

1. Open browser console (F12)
2. Look for: `🎵 Enriching songs with Spotify data...`
3. Then: `✅ Songs enriched! 15/15 have Spotify previews`
4. Play a song - you should hear audio!

## Troubleshooting

**No audio playing?**
- Check browser console for errors
- Verify your .env credentials are correct
- Some songs may not have previews on Spotify (rare)

**"Failed to get Spotify access token"?**
- Double-check Client ID and Client Secret
- Make sure no extra spaces in .env file
- Verify app is created in Spotify Dashboard

**Still not working?**
- See `SPOTIFY_SETUP.md` for detailed troubleshooting
- Try clearing cache: Open console and run `clearSpotifyCache()`

## Next Steps

### Add More Songs

Edit `src/utils/gameLogic.js` and add to `BASE_SONGS`:

```javascript
{
  title: "Your Song Title",
  artist: "Artist Name",
  instruments: ["🎸 Guitar", "🥁 Drums", "🎤 Vocals"]
}
```

The app will automatically fetch Spotify previews!

### Switch to Deezer (No Auth Required)

If Spotify is too complex, see `SPOTIFY_SETUP.md` for Deezer alternative (no API keys needed!).

## How It Works

```
User starts game
    ↓
Check localStorage cache
    ↓ (if expired)
Get Spotify access token (cached 1hr)
    ↓
Search for each song
    ↓
Get 30-sec preview URL
    ↓
Cache for 24 hours
    ↓
Game loads with real audio! 🎉
```

## Files Modified

1. **src/utils/gameLogic.js** - Now async, uses Spotify API
2. **src/utils/spotifyApi.js** - NEW! Spotify integration
3. **src/components/Game.jsx** - Updated to handle async song loading
4. **.gitignore** - Protects your API credentials

## Need Help?

Check `SPOTIFY_SETUP.md` for:
- Detailed setup instructions
- Complete troubleshooting guide
- Alternative APIs (Deezer, etc.)

---

**Have fun! 🎵🎮**
