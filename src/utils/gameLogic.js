import { enrichSongWithSpotify } from './spotifyApi.js'

// Songs with separated stems (bass, drums, vocals, other)
const SONGS_WITH_STEMS = [
  {
    title: "Bohemian Rhapsody",
    artist: "Queen",
    stems: {
      bass: "/audio/stems/htdemucs/Queen-Bohemian_Rhapsody/bass.mp3",
      drums: "/audio/stems/htdemucs/Queen-Bohemian_Rhapsody/drums.mp3",
      vocals: "/audio/stems/htdemucs/Queen-Bohemian_Rhapsody/vocals.mp3",
      other: "/audio/stems/htdemucs/Queen-Bohemian_Rhapsody/other.mp3"
    },
    instruments: ["🎸 Bass", "🥁 Drums", "🎤 Vocals", "🎹 Other"]
  },
  {
    title: "Hotel California",
    artist: "Eagles",
    stems: {
      bass: "/audio/stems/htdemucs/Eagles-Hotel_California/bass.mp3",
      drums: "/audio/stems/htdemucs/Eagles-Hotel_California/drums.mp3",
      vocals: "/audio/stems/htdemucs/Eagles-Hotel_California/vocals.mp3",
      other: "/audio/stems/htdemucs/Eagles-Hotel_California/other.mp3"
    },
    instruments: ["🎸 Bass", "🥁 Drums", "🎤 Vocals", "🎹 Other"]
  },
  {
    title: "Sweet Child O' Mine",
    artist: "Guns N' Roses",
    stems: {
      bass: "/audio/stems/htdemucs/Guns_N'_Roses-Sweet_Child_O'_Mine/bass.mp3",
      drums: "/audio/stems/htdemucs/Guns_N'_Roses-Sweet_Child_O'_Mine/drums.mp3",
      vocals: "/audio/stems/htdemucs/Guns_N'_Roses-Sweet_Child_O'_Mine/vocals.mp3",
      other: "/audio/stems/htdemucs/Guns_N'_Roses-Sweet_Child_O'_Mine/other.mp3"
    },
    instruments: ["🎸 Bass", "🥁 Drums", "🎤 Vocals", "🎹 Other"]
  }
]

// Songs that will use iTunes preview URLs (fallback for songs without stems)
const BASE_SONGS = [
  {
    title: "Billie Jean",
    artist: "Michael Jackson",
    instruments: ["🥁 Drums", "🎸 Bass", "🎹 Synth", "🎤 Vocals", "🎺 Horns"]
  },
  {
    title: "Smells Like Teen Spirit",
    artist: "Nirvana",
    instruments: ["🎸 Guitar", "🥁 Drums", "🎸 Bass", "🎤 Vocals"]
  },
  {
    title: "Wonderwall",
    artist: "Oasis",
    instruments: ["🎸 Guitar", "🥁 Drums", "🎤 Vocals", "🎸 Bass"]
  },
  {
    title: "Africa",
    artist: "Toto",
    instruments: ["🎹 Keyboard", "🥁 Drums", "🎸 Guitar", "🎤 Vocals", "🎺 Brass"]
  },
  {
    title: "Don't Stop Believin'",
    artist: "Journey",
    instruments: ["🎹 Piano", "🎸 Guitar", "🥁 Drums", "🎤 Vocals", "🎸 Bass"]
  },
  {
    title: "Stairway to Heaven",
    artist: "Led Zeppelin",
    instruments: ["🎸 Guitar", "🥁 Drums", "🎸 Bass", "🎤 Vocals", "🎹 Keyboard"]
  },
  {
    title: "Imagine",
    artist: "John Lennon",
    instruments: ["🎹 Piano", "🎤 Vocals", "🎸 Guitar", "🥁 Drums"]
  },
  {
    title: "Hey Jude",
    artist: "The Beatles",
    instruments: ["🎹 Piano", "🎤 Vocals", "🎸 Guitar", "🥁 Drums", "🎸 Bass"]
  },
  {
    title: "Purple Haze",
    artist: "Jimi Hendrix",
    instruments: ["🎸 Guitar", "🥁 Drums", "🎸 Bass", "🎤 Vocals"]
  },
  {
    title: "Sweet Home Alabama",
    artist: "Lynyrd Skynyrd",
    instruments: ["🎸 Guitar", "🥁 Drums", "🎹 Keyboard", "🎤 Vocals", "🎸 Bass"]
  },
  {
    title: "Every Breath You Take",
    artist: "The Police",
    instruments: ["🎸 Guitar", "🥁 Drums", "🎸 Bass", "🎤 Vocals", "🎹 Keyboard"]
  },
  {
    title: "Superstition",
    artist: "Stevie Wonder",
    instruments: ["🎹 Keyboard", "🥁 Drums", "🎤 Vocals", "🎺 Horns", "🎸 Bass"]
  }
]

// Combine both types of songs
const ALL_SONGS = [...SONGS_WITH_STEMS, ...BASE_SONGS]

// Cache for enriched songs
let ENRICHED_SONGS = null
const STEM_SERVER_URL = 'http://localhost:3001'
const ENRICHED_CACHE_KEY = 'band_on_the_run_enriched_songs'
const DATABASE_SONGS_KEY = 'band_on_the_run_database_songs'
const CACHE_EXPIRY_KEY = 'band_on_the_run_cache_expiry'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

// Load songs from database (client-side fallback)
async function loadSongsFromDatabase() {
  try {
    const response = await fetch('/top-songs.json')
    if (!response.ok) {
      console.error('Failed to load song database, falling back to hardcoded songs')
      return null
    }
    const songs = await response.json()
    // Add database ID (1-indexed) to each song
    return songs.map((song, index) => ({
      ...song,
      id: index + 1
    }))
  } catch (error) {
    console.error('Error loading song database:', error)
    return null
  }
}

// Load enriched songs from backend
async function loadEnrichedSongsFromBackend() {
  try {
    const response = await fetch(`${STEM_SERVER_URL}/api/songs/enriched`)
    if (!response.ok) {
      console.error('Failed to load enriched songs from backend')
      return null
    }
    const data = await response.json()
    console.log(`📚 Loaded ${data.totalSongs} enriched songs from backend`)
    console.log(`✅ ${data.withStems} with stems, ${data.withPreviews} with iTunes previews`)
    console.log(`🕐 Last enriched: ${new Date(data.lastEnriched).toLocaleString()}`)
    return data.songs
  } catch (error) {
    console.error('Error loading enriched songs from backend:', error)
    return null
  }
}

// Get or create enriched songs
async function getEnrichedSongs() {
  // Check if we have cached enriched songs
  if (ENRICHED_SONGS) {
    return ENRICHED_SONGS
  }
  
  // Try to load from backend first
  const backendSongs = await loadEnrichedSongsFromBackend()
  
  if (backendSongs && backendSongs.length > 0) {
    ENRICHED_SONGS = backendSongs
    return ENRICHED_SONGS
  }
  
  // Fallback to old client-side behavior if backend is unavailable
  console.log('⚠️ Backend unavailable, falling back to client-side enrichment')
  return await getEnrichedSongsFallback()
}

// Fallback: old client-side enrichment logic
async function getEnrichedSongsFallback() {
  // Load songs from database
  const databaseSongs = await loadSongsFromDatabase()
  
  if (databaseSongs && databaseSongs.length > 0) {
    console.log(`📚 Loaded ${databaseSongs.length} songs from database`)
    
    // Match songs with available stems
    const songsWithStems = databaseSongs.map(song => {
      const stemSong = SONGS_WITH_STEMS.find(
        s => s.title === song.title && s.artist === song.artist
      )
      if (stemSong) {
        return { ...song, stems: stemSong.stems }
      }
      return song
    })
    
    console.log('🎵 Enriching songs with iTunes previews (this may take a moment)...')
    
    // Enrich songs without stems with iTunes previews in batches
    const batchSize = 50
    const enrichedSongs = []
    
    for (let i = 0; i < songsWithStems.length; i += batchSize) {
      const batch = songsWithStems.slice(i, i + batchSize)
      const enrichedBatch = await Promise.all(
        batch.map(async (song) => {
          if (!song.stems) {
            const enriched = await enrichSongWithSpotify(song)
            return { ...enriched, id: song.id }
          }
          return song
        })
      )
      enrichedSongs.push(...enrichedBatch)
      
      if (i + batchSize < songsWithStems.length) {
        console.log(`⏳ Enriched ${enrichedSongs.length}/${songsWithStems.length} songs...`)
      }
    }
    
    const withStems = enrichedSongs.filter(s => s.stems).length
    const withPreviews = enrichedSongs.filter(s => !s.stems && s.audioUrl).length
    console.log(`✅ Songs ready: ${withStems} with stems, ${withPreviews} with iTunes previews`)
    
    // Cache the results
    localStorage.setItem(DATABASE_SONGS_KEY, JSON.stringify(enrichedSongs))
    localStorage.setItem(CACHE_EXPIRY_KEY, (Date.now() + CACHE_DURATION).toString())
    
    ENRICHED_SONGS = enrichedSongs
    return enrichedSongs
  }
  
  // Fallback to old behavior if database load fails
  console.log('⚠️ Using hardcoded song list as fallback')
  // Songs with stems don't need caching - they're local files
  // Only enrich songs without stems (BASE_SONGS) with iTunes URLs
  
  // Check cache for iTunes-enriched songs
  const cachedFallback = localStorage.getItem(ENRICHED_CACHE_KEY)
  const expiryFallback = localStorage.getItem(CACHE_EXPIRY_KEY)
  
  let enrichedBaseSongs = []
  
  if (cachedFallback && expiryFallback && Date.now() < parseInt(expiryFallback)) {
    console.log('✅ Using cached iTunes songs from fallback')
    enrichedBaseSongs = JSON.parse(cachedFallback)
  } else {
    // Enrich BASE_SONGS with iTunes preview data
    if (BASE_SONGS.length > 0) {
      console.log('🎵 Fetching song previews from iTunes...')
      const enrichedPromises = BASE_SONGS.map(song => enrichSongWithSpotify(song))
      enrichedBaseSongs = await Promise.all(enrichedPromises)
      
      // Cache the enriched songs
      localStorage.setItem(ENRICHED_CACHE_KEY, JSON.stringify(enrichedBaseSongs))
      localStorage.setItem(CACHE_EXPIRY_KEY, (Date.now() + CACHE_DURATION).toString())
      
      ENRICHED_SONGS = enrichedBaseSongs
      
      const withPreviews = enrichedBaseSongs.filter(s => s.audioUrl).length
      console.log(`✅ iTunes songs loaded! ${withPreviews}/${enrichedBaseSongs.length} have audio previews`)
    }
  }
  
  // Combine songs with stems and iTunes-enriched songs
  const allSongs = [...SONGS_WITH_STEMS, ...enrichedBaseSongs]
  console.log(`🎵 Total songs available: ${allSongs.length} (${SONGS_WITH_STEMS.length} with stems, ${enrichedBaseSongs.length} from iTunes)`)
  
  return allSongs
}

// Create a song list for guessing
function getSongList(songs) {
  return songs.map(s => `${s.title} - ${s.artist}`).sort()
}

// Simple seeded random number generator
function seededRandom(seed) {
  const x = Math.sin(seed++) * 10000
  return x - Math.floor(x)
}

// Get song for today's daily puzzle
export async function getSongForDay() {
  const songs = await getEnrichedSongs()
  const today = new Date()
  const daysSinceEpoch = Math.floor(today.getTime() / (1000 * 60 * 60 * 24))
  const index = Math.floor(seededRandom(daysSinceEpoch) * songs.length)
  
  return {
    ...songs[index],
    songList: getSongList(songs)
  }
}

// Track recently played songs to avoid repetition
const RECENTLY_PLAYED_KEY = 'band_on_the_run_recently_played'
const MAX_RECENT_SONGS = 20 // Remember last 20 songs

function getRecentlyPlayed() {
  try {
    const recent = localStorage.getItem(RECENTLY_PLAYED_KEY)
    return recent ? JSON.parse(recent) : []
  } catch {
    return []
  }
}

function addToRecentlyPlayed(songId) {
  const recent = getRecentlyPlayed()
  // Add to front, remove duplicates, keep only last MAX_RECENT_SONGS
  const updated = [songId, ...recent.filter(id => id !== songId)].slice(0, MAX_RECENT_SONGS)
  localStorage.setItem(RECENTLY_PLAYED_KEY, JSON.stringify(updated))
}

// Get random song for practice mode with improved distribution
export async function getRandomSong(preferStems = true) {
  const songs = await getEnrichedSongs()
  const recentlyPlayed = getRecentlyPlayed()
  
  // Filter out recently played songs
  const availableSongs = songs.filter(s => !recentlyPlayed.includes(s.id))
  const songsToUse = availableSongs.length > 0 ? availableSongs : songs
  
  let selectedSong
  
  if (preferStems) {
    // 80% chance to pick from songs with stems (increased from 50%)
    const songsWithStems = songsToUse.filter(s => s.stems)
    
    if (songsWithStems.length > 0 && Math.random() < 0.8) {
      // Use shuffling for better distribution across all stem songs
      const shuffled = [...songsWithStems].sort(() => Math.random() - 0.5)
      selectedSong = shuffled[0]
    } else {
      // Pick from all available songs
      const shuffled = [...songsToUse].sort(() => Math.random() - 0.5)
      selectedSong = shuffled[0]
    }
  } else {
    // Random from all available songs
    const shuffled = [...songsToUse].sort(() => Math.random() - 0.5)
    selectedSong = shuffled[0]
  }
  
  // Track this song as recently played
  addToRecentlyPlayed(selectedSong.id)
  
  return {
    ...selectedSong,
    songList: getSongList(songs)
  }
}

// Preload songs in the background (call on app startup to avoid delays)
export async function preloadSongs() {
  console.log('🎵 Preloading song database from backend...')
  try {
    await getEnrichedSongs()
    console.log('✅ Song database preloaded and ready!')
  } catch (error) {
    console.error('⚠️ Failed to preload songs:', error)
  }
}

// Clear iTunes cache (useful for debugging or forcing refresh)
export function clearSpotifyCache() {
  localStorage.removeItem(ENRICHED_CACHE_KEY)
  localStorage.removeItem(DATABASE_SONGS_KEY)
  localStorage.removeItem(CACHE_EXPIRY_KEY)
  ENRICHED_SONGS = null
  console.log('🗑️ Song cache cleared - songs will be reloaded on next play')
}

// LocalStorage keys
const STATS_KEY = 'band_on_the_run_stats'
const DAILY_KEY = 'band_on_the_run_daily'

// Get current stats
export function getStats() {
  const stored = localStorage.getItem(STATS_KEY)
  
  if (!stored) {
    return {
      gamesPlayed: 0,
      gamesWon: 0,
      winRate: 0,
      currentStreak: 0,
      maxStreak: 0,
      avgInstruments: 0,
      guessDistribution: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0
      }
    }
  }
  
  return JSON.parse(stored)
}

// Save game result
export function saveStats(result) {
  const stats = getStats()
  
  stats.gamesPlayed++
  
  if (result.instrumentsUsed <= 6) {
    stats.gamesWon++
    stats.currentStreak++
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak)
    
    // Update guess distribution
    const attempts = Math.min(result.attempts, 6)
    stats.guessDistribution[attempts]++
  } else {
    stats.currentStreak = 0
  }
  
  stats.winRate = Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
  
  // Calculate average instruments
  const totalInstruments = Object.entries(stats.guessDistribution).reduce(
    (sum, [attempts, count]) => sum + (parseInt(attempts) * count),
    0
  )
  stats.avgInstruments = stats.gamesWon > 0 
    ? (totalInstruments / stats.gamesWon).toFixed(1)
    : 0
  
  localStorage.setItem(STATS_KEY, JSON.stringify(stats))
}

// Check if daily puzzle was completed today
export function getDailyResult() {
  const stored = localStorage.getItem(DAILY_KEY)
  if (!stored) return null
  
  const data = JSON.parse(stored)
  const today = new Date().toISOString().split('T')[0]
  
  if (data.date === today) {
    return data
  }
  
  return null
}

// Save daily puzzle result
export function saveDailyResult(result) {
  const today = new Date().toISOString().split('T')[0]
  localStorage.setItem(DAILY_KEY, JSON.stringify({
    ...result,
    date: today
  }))
}
