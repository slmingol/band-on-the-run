# Incremental Song Library Management

This document describes the incremental approach to managing the Band on the Run song library, allowing you to scale from the current 492 songs up to 2500 songs in a controlled, manageable way.

## Overview

The song library is managed incrementally through:
1. **Configuration-driven approach**: Target song count and batch size are configurable
2. **Additive updates**: New songs are appended to the existing library, never replacing it
3. **Automatic stem processing**: The stem processing system already works incrementally (skips existing stems)

## Configuration

Configuration is stored in `config/song-library-config.json`:

```json
{
  "currentSongCount": 492,
  "targetSongCount": 2500,
  "batchSize": 100,
  "lastUpdated": "2026-02-28",
  "notes": "Incremental song library management"
}
```

### Configuration Fields

- **currentSongCount**: Automatically updated when songs are added
- **targetSongCount**: Your ultimate goal (adjustable - can be 500, 1000, 2500, etc.)
- **batchSize**: How many songs to add per run (default: 100)
- **lastUpdated**: Timestamp of last library update

## Adding Songs Incrementally

### Quick Start

```bash
# Add the next batch of songs (default: 100 songs)
npm run add-songs
```

### How It Works

1. Script reads current library size from `scripts/top-songs.json`
2. Compares against target in `config/song-library-config.json`
3. Adds up to `batchSize` songs (or remaining songs needed to hit target)
4. Appends new songs to existing library (preserves all existing entries)
5. Updates config with new count and timestamp

### Customizing Batch Size

Edit `config/song-library-config.json`:

```json
{
  "batchSize": 50  // Add 50 songs at a time instead of 100
}
```

### Customizing Target

```json
{
  "targetSongCount": 1000  // Stop at 1000 instead of 2500
}
```

## Workflow Examples

### Gradual Expansion to 2500 Songs

```bash
# Start with 492 songs
npm run add-songs  # → 592 songs
npm run add-songs  # → 692 songs
npm run add-songs  # → 792 songs
# ... continue until 2500
```

### Processing Stems for New Songs

After adding songs, process their stems:

1. Navigate to Admin panel in the app
2. Click "Refresh Status" to see new song count
3. Enter number of songs to process (e.g., 100 for new batch)
4. Click "Download & Process Stems"

The stem processor automatically:
- Skips songs that already have stems
- Only processes new additions
- Updates progress in real-time

## Song Database Structure

Songs in `scripts/add-songs.js` are organized by genre/era:

```javascript
// Classic Rock - Beatles & British Invasion (493-520)
{ "title": "Twist and Shout", "artist": "The Beatles" },
...

// Progressive Rock (551-580)
{ "title": "Roundabout", "artist": "Yes" },
...

// 70s Soul & Funk (581-610)
{ "title": "Le Freak", "artist": "Chic" },
...
```

This structure allows:
- Easy auditing of what songs are in which ranges
- Genre diversity across batches
- Simple debugging if specific songs cause issues

## Extending Beyond 2500 Songs

To add more songs beyond the initial 2500:

1. Edit `scripts/add-songs.js`
2. Add more songs to the `allSongs` array in `generateNextBatch()`
3. Update `config/song-library-config.json`:
   ```json
   {
     "targetSongCount": 5000  // New target
   }
   ```
4. Run `npm run add-songs` as needed

## Benefits of Incremental Approach

### 1. **Gradual Processing**
- Don't need to process 2500 stems at once
- Can test and verify in smaller batches
- Easier to monitor and troubleshoot

### 2. **Version Control Friendly**
- Small, meaningful commits showing exactly what was added
- Easy to review changes in `top-songs.json`
- Git diffs show additions, not replacements

### 3. **Flexible Scaling**
- Start small, grow as needed
- Can pause at any point (500, 1000, 1500, etc.)
- No need to commit to full 2500 immediately

### 4. **Resource Management**
- Spread stem processing over time
- Avoid overwhelming storage/processing capacity
- Better for testing and validation

### 5. **Easy Rollback**
- If a batch has issues, easy to identify and remove
- Can revert to previous checkpoint
- No full-library regeneration needed

## Maintenance

### Checking Current Status

```bash
# View current library size
cat scripts/top-songs.json | grep -c '"title"'

# View configuration
cat config/song-library-config.json
```

### Resetting Target

```json
{
  "targetSongCount": 700,  // New target
  "batchSize": 50          // Smaller batches
}
```

### Manual Song Addition

You can also manually add songs to `scripts/top-songs.json`:

```json
[
  ...existing songs...,
  { "title": "New Song", "artist": "New Artist" }
]
```

Then update the config count to match.

## Integration with Stem Processing

The stem processing system (`server/stem-processor.js`) is already incremental:

```javascript
// Checks if stems exist before processing
const stemExists = fs.existsSync(stemPath);
if (stemExists) {
  console.log('⏭️  Stems already exist, skipping...');
  return;
}
```

This means:
- You can safely re-run stem processing on the entire library
- Only new songs without stems will be processed
- No duplicate work or wasted processing time

## Best Practices

1. **Add songs in batches**: Use the default 100-song batches for manageability
2. **Process stems regularly**: After adding each batch, process stems before adding more
3. **Test in practice mode**: Verify new songs work correctly before expanding further
4. **Monitor disk space**: Each song = ~2.8MB of stems (2500 songs = ~7GB)
5. **Commit regularly**: Git commit after each successful batch addition
6. **Update gameLogic.js**: Periodically update the SONGS_WITH_STEMS array to make new stems available in gameplay

## Troubleshooting

### "Already at or above target"

Increase the target in `config/song-library-config.json`:
```json
{
  "targetSongCount": 3000  // Increase target
}
```

### Need to add specific genres

Edit `scripts/add-songs.js` and reorder the `allSongs` array to prioritize certain genres.

### Config out of sync

Manually update `currentSongCount` in config to match actual library size:
```bash
cat scripts/top-songs.json | grep -c '"title"'  # Get actual count
# Update config to match
```

## Future Enhancements

Potential improvements to the incremental system:

- **Genre filtering**: Add songs by specific genre only
- **Popularity ranking**: Add most popular songs first based on streaming data
- **Duplicate detection**: Automatically detect and skip duplicate songs
- **API integration**: Pull song lists from Spotify/Billboard/etc.
- **Curated playlists**: Generate batches based on playlists or themes
