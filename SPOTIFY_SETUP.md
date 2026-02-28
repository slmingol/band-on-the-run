# Spotify API Setup Guide

## Step 1: Create a Spotify Developer Account

1. Go to [Spotify for Developers](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account (or create one)
3. Accept the Terms of Service

## Step 2: Create an App

1. Click "Create app" button
2. Fill in the form:
   - **App name**: Band on the Run
   - **App description**: Music guessing game
   - **Redirect URIs**: `http://localhost:5173` (for local development)
   - **Which API/SDKs are you planning to use?**: Web API
3. Agree to terms and click "Save"

## Step 3: Get Your Credentials

1. On your app dashboard, you'll see:
   - **Client ID** (visible)
   - **Client Secret** (click "Show client secret")
2. Copy both values

## Step 4: Configure Your App

1. Create a `.env` file in the project root:

```bash
cp .env.example .env
```

2. Edit `.env` and add your credentials:

```env
VITE_SPOTIFY_CLIENT_ID=your_actual_client_id_here
VITE_SPOTIFY_CLIENT_SECRET=your_actual_client_secret_here
```

⚠️ **IMPORTANT**: Never commit your `.env` file to Git!

## Step 5: Test the Integration

1. Start the development server:

```bash
npm run dev
```

2. Open the app in your browser
3. The app will automatically fetch Spotify preview URLs for all songs
4. Check the browser console for "Songs enriched!" message

## How It Works

- **Client Credentials Flow**: The app uses Spotify's simplest auth method
- **Access Token**: Cached in localStorage for 1 hour
- **Preview URLs**: 30-second MP3 clips for each song
- **Fallback**: If a preview isn't available, the song won't play audio

## API Rate Limits

- Spotify allows **lots** of requests (no strict limit for Web API)
- Access tokens expire after 1 hour
- The app automatically caches enriched songs for 24 hours to minimize API calls

## Troubleshooting

### "Failed to get Spotify access token"
- Check your Client ID and Client Secret are correct
- Make sure there are no extra spaces in your `.env` file
- Verify your app is created in the Spotify Dashboard

### "No preview available"
- Some songs don't have 30-second previews on Spotify
- The app will skip these songs or show a warning
- Try adding more popular songs to the database

### CORS errors
- Make sure you're running on `localhost:5173`
- Check that your redirect URI matches in Spotify Dashboard

## Alternative: Use Deezer Instead

If Spotify setup is too complex, you can switch to Deezer (no auth required):

```javascript
// In spotifyApi.js, replace with:
export async function searchTrack(trackName, artistName ) {
  const query = `${artistName} ${trackName}`;
  const response = await fetch(
    `https://api.deezer.com/search?q=${encodeURIComponent(query)}`
  );
  const data = await response.json();
  
  if (data.data && data.data.length > 0) {
    return {
      previewUrl: data.data[0].preview,
      albumArt: data.data[0].album.cover_medium
    };
  }
  return null;
}
```
