import { enrichSongWithSpotify } from './spotifyApi.js'

// Song database - will be enriched with Spotify preview URLs
const BASE_SONGS = [
  {
    title: "Bohemian Rhapsody",
    artist: "Queen",
    instruments: ["🎹 Piano", "🎸 Guitar", "🥁 Drums", "🎤 Vocals", "🎺 Brass"]
  },
  {
    title: "Hotel California",
    artist: "Eagles",
    instruments: ["🎸 Guitar", "🥁 Drums", "🎹 Keyboard", "🎤 Vocals", "🎸 Bass"]
  },
  {
    title: "Billie Jean",
    artist: "Michael Jackson",
    instruments: ["🥁 Drums", "🎸 Bass", "🎹 Synth", "🎤 Vocals", "🎺 Horns"]
  },
  {
    title: "Sweet Child O' Mine",
    artist: "Guns N' Roses",
    instruments: ["🎸 Guitar", "🥁 Drums", "🎸 Bass", "🎤 Vocals", "🎹 Keyboard"]
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

// Cache for Spotify-enriched songs
let ENRICHED_SONGS = null
const ENRICHED_CACHE_KEY = 'band_on_the_run_enriched_songs'
const CACHE_EXPIRY_KEY = 'band_on_the_run_cache_expiry'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

// Get or create enriched songs with Spotify data
async function getEnrichedSongs() {
  // TEMPORARY: Force clear old Spotify cache
  const cached = localStorage.getItem(ENRICHED_CACHE_KEY)
  if (cached) {
    const parsedCache = JSON.parse(cached)
    // If cache has songs without audioUrl, it's old Spotify cache - clear it
    if (parsedCache.some(s => !s.audioUrl)) {
      console.log('🗑️ Clearing old Spotify cache...')
      localStorage.removeItem(ENRICHED_CACHE_KEY)
      localStorage.removeItem(CACHE_EXPIRY_KEY)
    }
  }
  
  // Check cache first
  const freshCached = localStorage.getItem(ENRICHED_CACHE_KEY)
  const expiry = localStorage.getItem(CACHE_EXPIRY_KEY)
  
  if (freshCached && expiry && Date.now() < parseInt(expiry)) {
    ENRICHED_SONGS = JSON.parse(freshCached)
    console.log('✅ Using cached songs from iTunes')
    return ENRICHED_SONGS
  }
  
  // If already enriched in memory, return it
  if (ENRICHED_SONGS) {
    return ENRICHED_SONGS
  }
  
  // Enrich songs with iTunes preview data
  console.log('🎵 Fetching song previews from iTunes (no auth required)...')
  const enrichedPromises = BASE_SONGS.map(song => enrichSongWithSpotify(song))
  ENRICHED_SONGS = await Promise.all(enrichedPromises)
  
  // Cache the enriched songs
  localStorage.setItem(ENRICHED_CACHE_KEY, JSON.stringify(ENRICHED_SONGS))
  localStorage.setItem(CACHE_EXPIRY_KEY, (Date.now() + CACHE_DURATION).toString())
  
  const withPreviews = ENRICHED_SONGS.filter(s => s.audioUrl).length
  console.log(`✅ Songs loaded! ${withPreviews}/${ENRICHED_SONGS.length} have audio previews from iTunes`)
  
  return ENRICHED_SONGS
}

// Create a song list for guessing
function getSongList(songs) {
  return songs.map(s => s.title).sort()
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

// Get random song for practice mode
export async function getRandomSong() {
  const songs = await getEnrichedSongs()
  const index = Math.floor(Math.random() * songs.length)
  
  return {
    ...songs[index],
    songList: getSongList(songs)
  }
}

// Clear iTunes cache (useful for debugging or forcing refresh)
export function clearSpotifyCache() {
  localStorage.removeItem(ENRICHED_CACHE_KEY)
  localStorage.removeItem(CACHE_EXPIRY_KEY)
  ENRICHED_SONGS = null
  console.log('🗑️ iTunes cache cleared')
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
