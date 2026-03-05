import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import fetch from 'node-fetch'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Paths
const PROJECT_ROOT = path.join(__dirname, '..')
const TOP_SONGS_PATH = path.join(PROJECT_ROOT, 'scripts', 'top-songs.json')
const STEMS_DIR = path.join(PROJECT_ROOT, 'public', 'audio', 'stems', 'htdemucs')

// Cache
let enrichedSongsCache = null
let lastEnriched = null

// iTunes API Status Tracking
const itunesApiStatus = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  rateLimitedRequests: 0,
  forbiddenRequests: 0,
  recentRequests: [], // Last 50 requests
  currentlyEnriching: false,
  lastRequestTime: null,
  startTime: null
}

function trackItunesRequest(song, status, statusCode, error = null) {
  itunesApiStatus.totalRequests++
  itunesApiStatus.lastRequestTime = new Date()
  
  if (status === 'success') {
    itunesApiStatus.successfulRequests++
  } else if (status === 'rate_limited') {
    itunesApiStatus.rateLimitedRequests++
  } else if (status === 'forbidden') {
    itunesApiStatus.forbiddenRequests++
  } else {
    itunesApiStatus.failedRequests++
  }
  
  // Keep last 50 requests
  itunesApiStatus.recentRequests.unshift({
    timestamp: new Date().toISOString(),
    song: `${song.title} - ${song.artist}`,
    status,
    statusCode,
    error
  })
  
  if (itunesApiStatus.recentRequests.length > 50) {
    itunesApiStatus.recentRequests = itunesApiStatus.recentRequests.slice(0, 50)
  }
}

export function getItunesApiStatus() {
  const duration = itunesApiStatus.startTime 
    ? Date.now() - itunesApiStatus.startTime.getTime()
    : 0
    
  return {
    ...itunesApiStatus,
    duration,
    successRate: itunesApiStatus.totalRequests > 0 
      ? Math.round((itunesApiStatus.successfulRequests / itunesApiStatus.totalRequests) * 100)
      : 0
  }
}

function resetItunesApiStatus() {
  itunesApiStatus.totalRequests = 0
  itunesApiStatus.successfulRequests = 0
  itunesApiStatus.failedRequests = 0
  itunesApiStatus.rateLimitedRequests = 0
  itunesApiStatus.forbiddenRequests = 0
  itunesApiStatus.recentRequests = []
  itunesApiStatus.startTime = new Date()
  itunesApiStatus.currentlyEnriching = true
}

// Scan stems directory to find all songs with available stems
function scanStemsDirectory() {
  try {
    if (!fs.existsSync(STEMS_DIR)) {
      console.log('⚠️ Stems directory not found, no stems available')
      return []
    }
    
    const stemDirs = fs.readdirSync(STEMS_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
    
    console.log(`📁 Found ${stemDirs.length} stem directories`)
    
    const songsWithStems = stemDirs.map(dirName => {
      // Parse directory name (format: "Artist_Song_Title")
      const parts = dirName.split('_')
      
      // Try to extract artist and title
      // Common patterns: "Artist_Song_Name" or "Artist_Song_Name_With_More_Words"
      let artist, title
      
      // Look for common artist patterns
      if (dirName.includes('The_Beatles')) {
        artist = 'The Beatles'
        title = dirName.replace('The_Beatles_', '').replace(/_/g, ' ')
      } else if (dirName.includes('Led_Zeppelin')) {
        artist = 'Led Zeppelin'
        title = dirName.replace('Led_Zeppelin_', '').replace(/_/g,' ')
      } else if (dirName.includes('Guns_N')) {
        artist = "Guns N' Roses"
        title = dirName.replace(/Guns_N.*?Roses_/, '').replace(/_/g, ' ')
      } else if (dirName.includes('AC_DC')) {
        artist = 'AC/DC'
        title = dirName.replace('AC_DC_', '').replace(/_/g, ' ')
      } else {
        // Generic parsing: assume first part is artist, rest is title
        artist = parts[0].replace(/_/g, ' ')
        title = parts.slice(1).join(' ').replace(/_/g, ' ')
      }
      
      // Clean up title (remove trailing underscores, etc.)
      title = title.trim().replace(/\s+/g, ' ')
      
      return {
        artist,
        title,
        dirName,
        stems: {
          bass: `/audio/stems/htdemucs/${dirName}/bass.mp3`,
          drums: `/audio/stems/htdemucs/${dirName}/drums.mp3`,
          vocals: `/audio/stems/htdemucs/${dirName}/vocals.mp3`,
          other: `/audio/stems/htdemucs/${dirName}/other.mp3`
        }
      }
    })
    
    console.log(`✅ Detected ${songsWithStems.length} songs with stems`)
    return songsWithStems
  } catch (error) {
    console.error('Error scanning stems directory:', error)
    return []
  }
}

// Rate limiting configuration
const ITUNES_CONFIG = {
  REQUEST_DELAY: 60000,      // 60s between requests (aggressive backoff)
  MAX_RETRIES: 1,            // Only retry once to avoid detection
  RETRY_DELAY_BASE: 120000,  // 2 minutes base delay for exponential backoff
  RATE_LIMIT_DELAY: 300000,  // Wait 5 minutes when hitting rate limit
  BATCH_SIZE: 3,             // Tiny batches of 3 songs
  BATCH_DELAY: 300000,       // 5 minutes between batches
  MAX_ITUNES_REQUESTS: 0,    // Disabled - iTunes API is too aggressive with rate limiting
  RANDOMIZE_DELAY: true,     // Add random jitter to avoid pattern detection
  MIN_RANDOM_DELAY: 30000,   // Minimum 30s additional random delay
  MAX_RANDOM_DELAY: 120000   // Maximum 2min additional random delay
}

// Helper: Sleep for specified milliseconds
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Helper: Add random delay to avoid pattern detection
function getRandomDelay(baseDelay) {
  if (!ITUNES_CONFIG.RANDOMIZE_DELAY) {
    return baseDelay
  }
  
  const randomJitter = Math.floor(
    Math.random() * (ITUNES_CONFIG.MAX_RANDOM_DELAY - ITUNES_CONFIG.MIN_RANDOM_DELAY) + 
    ITUNES_CONFIG.MIN_RANDOM_DELAY
  )
  
  return baseDelay + randomJitter
}

// Fetch iTunes preview URL for a song with retry logic
async function fetchItunesPreview(song, retryCount = 0) {
  try {
    const query = encodeURIComponent(`${song.title} ${song.artist}`)
    const response = await fetch(`https://itunes.apple.com/search?term=${query}&media=music&entity=song&limit=1`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    })
    
    // Handle rate limiting (429) - wait and retry
    if (response.status === 429) {
      trackItunesRequest(song, 'rate_limited', 429)
      if (retryCount < ITUNES_CONFIG.MAX_RETRIES) {
        console.warn(`⏸️  Rate limited for "${song.title}", waiting ${ITUNES_CONFIG.RATE_LIMIT_DELAY / 1000}s...`)
        await sleep(ITUNES_CONFIG.RATE_LIMIT_DELAY)
        return fetchItunesPreview(song, retryCount + 1)
      }
      console.warn(`❌ Rate limit exceeded for "${song.title}" after ${retryCount} retries`)
      return null
    }
    
    // Handle forbidden (403) - likely blocked, use exponential backoff
    if (response.status === 403) {
      trackItunesRequest(song, 'forbidden', 403)
      if (retryCount < ITUNES_CONFIG.MAX_RETRIES) {
        const delay = ITUNES_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retryCount)
        console.warn(`⏸️  403 Forbidden for "${song.title}", retrying in ${delay / 1000}s...`)
        await sleep(delay)
        return fetchItunesPreview(song, retryCount + 1)
      }
      console.warn(`❌ Access forbidden for "${song.title}" after ${retryCount} retries`)
      return null
    }
    
    // Handle other errors
    if (!response.ok) {
      trackItunesRequest(song, 'error', response.status)
      console.warn(`iTunes API error for "${song.title}":`, response.status)
      return null
    }
    
    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      trackItunesRequest(song, 'non_json', response.status, 'Non-JSON response')
      console.warn(`iTunes returned non-JSON response for "${song.title}"`)
      return null
    }
    
    try {
      const data = await response.json()
      
      if (data.results && data.results.length > 0) {
        trackItunesRequest(song, 'success', 200)
        return data.results[0].previewUrl
      }
      
      trackItunesRequest(song, 'no_results', 200, 'No results found')
      return null
    } catch (parseError) {
      trackItunesRequest(song, 'parse_error', response.status, parseError.message)
      console.warn(`Failed to parse iTunes response for "${song.title}":`, parseError.message)
      return null
    }
  } catch (error) {
    // Network errors - retry with exponential backoff
    if (retryCount < ITUNES_CONFIG.MAX_RETRIES) {
      const delay = ITUNES_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retryCount)
      console.warn(`⏸️  Network error for "${song.title}", retrying in ${delay / 1000}s...`)
      await sleep(delay)
      return fetchItunesPreview(song, retryCount + 1)
    }
    
    trackItunesRequest(song, 'network_error', null, error.message)
    console.error(`Error fetching iTunes preview for "${song.title}":`, error.message)
    return null
  }
}

// Enrich all songs with stems and iTunes previews
export async function enrichAllSongs() {
  console.log('🎵 Starting song enrichment process...')
  
  // Reset API status tracking
  resetItunesApiStatus()
  
  // Scan for available stems
  const stemSongs = scanStemsDirectory()
  
  // Load songs from database
  const songs = JSON.parse(fs.readFileSync(TOP_SONGS_PATH, 'utf8'))
  console.log(`📚 Loaded ${songs.length} songs from database`)
  
  // Add database IDs
  const songsWithIds = songs.map((song, index) => ({
    ...song,
    id: index + 1
  }))
  
  // Match with stems using fuzzy matching
  const songsWithStems = songsWithIds.map(song => {
    const stemSong = stemSongs.find(s => {
      // Try exact match first
      if (s.title.toLowerCase() === song.title.toLowerCase() && 
          s.artist.toLowerCase() === song.artist.toLowerCase()) {
        return true
      }
      
      // Try partial matches (stem title contains song title or vice versa)
      const stemTitleLower = s.title.toLowerCase()
      const songTitleLower = song.title.toLowerCase()
      const stemArtistLower = s.artist.toLowerCase()
      const songArtistLower = song.artist.toLowerCase()
      
      // Artist must match (at least partially)
      const artistMatch = stemArtistLower.includes(songArtistLower) || 
                          songArtistLower.includes(stemArtistLower)
      
      // Title must match (at least partially)
      const titleMatch = stemTitleLower.includes(songTitleLower) || 
                        songTitleLower.includes(stemTitleLower)
      
      return artistMatch && titleMatch
    })
    
    if (stemSong) {
      return { ...song, stems: stemSong.stems }
    }
    return song
  })
  
  console.log(`🎸 Matched ${songsWithStems.filter(s => s.stems).length} songs with stems`)
  
  // Enrich with iTunes previews - long-tail approach with aggressive backoff
  const songsNeedingEnrichment = songsWithStems.filter(s => !s.stems && !s.audioUrl)
  const maxItunesRequests = ITUNES_CONFIG.MAX_ITUNES_REQUESTS
  
  if (maxItunesRequests === 0) {
    console.log('🚫 iTunes enrichment disabled (MAX_ITUNES_REQUESTS = 0)')
    enrichedSongsCache = songsWithStems
    lastEnriched = new Date()
    itunesApiStatus.currentlyEnriching = false
    return songsWithStems
  }
  
  // Randomize which songs to enrich (avoid always hitting the same ones)
  const shuffledNeedingEnrichment = [...songsNeedingEnrichment]
    .sort(() => Math.random() - 0.5)
    .slice(0, maxItunesRequests)
  
  console.log(`🐌 Long-tail iTunes enrichment approach:`)
  console.log(`   • ${maxItunesRequests} songs per cycle (out of ${songsNeedingEnrichment.length} needing enrichment)`)
  console.log(`   • ${Math.round(ITUNES_CONFIG.REQUEST_DELAY / 1000)}s + random ${Math.round(ITUNES_CONFIG.MIN_RANDOM_DELAY / 1000)}-${Math.round(ITUNES_CONFIG.MAX_RANDOM_DELAY / 1000)}s delays`)
  console.log(`   • ${Math.round(ITUNES_CONFIG.BATCH_DELAY / 1000 / 60)}min pause every ${ITUNES_CONFIG.BATCH_SIZE} songs`)
  console.log(`   • At this rate: ~${Math.ceil(songsNeedingEnrichment.length / maxItunesRequests)} days to enrich all songs`)
  
  // Create enriched songs array with all songs that have stems or existing audioUrls
  const enrichedSongs = songsWithStems.filter(s => s.stems || s.audioUrl)
  const songsToSkip = songsWithStems.filter(s => !s.stems && !s.audioUrl && !shuffledNeedingEnrichment.includes(s))
  
  let itunesRequestsMade = 0
  
  // Process selected songs with aggressive delays and randomization
  for (let i = 0; i < shuffledNeedingEnrichment.length; i++) {
    const song = shuffledNeedingEnrichment[i]
    
    // Add random delay before request to avoid pattern detection
    const delay = getRandomDelay(ITUNES_CONFIG.REQUEST_DELAY)
    console.log(`⏳ Waiting ${Math.round(delay / 1000)}s before requesting "${song.title}"...`)
    await sleep(delay)
    
    // Fetch iTunes preview
    const audioUrl = await fetchItunesPreview(song)
    enrichedSongs.push({ ...song, audioUrl })
    itunesRequestsMade++
    
    const successful = enrichedSongs.filter(s => !s.stems && s.audioUrl).length
    console.log(`📊 Progress: ${itunesRequestsMade}/${shuffledNeedingEnrichment.length} | ${successful} successful | ${itunesRequestsMade - successful} failed`)
    
    // Pause between batches
    if (itunesRequestsMade % ITUNES_CONFIG.BATCH_SIZE === 0 && itunesRequestsMade < shuffledNeedingEnrichment.length) {
      const batchDelay = getRandomDelay(ITUNES_CONFIG.BATCH_DELAY)
      console.log(`⏸️  Batch complete. Pausing ${Math.round(batchDelay / 1000 / 60)}min before next batch...`)
      await sleep(batchDelay)
    }
  }
  
  // Add back songs we're not enriching this cycle
  enrichedSongs.push(...songsToSkip)
  
  // Sort back to original order by ID
  enrichedSongs.sort((a, b) => a.id - b.id)
  
  const withStems = enrichedSongs.filter(s => s.stems).length
  const withPreviews = enrichedSongs.filter(s => !s.stems && s.audioUrl).length
  const withoutAudio = enrichedSongs.filter(s => !s.stems && !s.audioUrl).length
  console.log(`✅ Enrichment complete: ${withStems} with stems, ${withPreviews} with iTunes previews, ${withoutAudio} without audio`)
  if (itunesRequestsMade > 0) {
    console.log(`📊 iTunes success rate: ${Math.round((withPreviews / itunesRequestsMade) * 100)}%`)
  }
  
  // Mark enrichment as complete
  itunesApiStatus.currentlyEnriching = false
  
  enrichedSongsCache = enrichedSongs
  lastEnriched = new Date()
  
  return enrichedSongs
}

// Get enriched songs (from cache or refresh)
export function getEnrichedSongs() {
  if (!enrichedSongsCache) {
    throw new Error('Songs not yet enriched. Server is still loading.')
  }
  
  return {
    songs: enrichedSongsCache,
    lastEnriched: lastEnriched,
    totalSongs: enrichedSongsCache.length,
    withStems: enrichedSongsCache.filter(s => s.stems).length,
    withPreviews: enrichedSongsCache.filter(s => !s.stems && s.audioUrl).length
  }
}

// Get songs that need iTunes URLs (no stems, no audioUrl)
export function getSongsNeedingItunes() {
  // Use enriched cache if available, otherwise load from database
  let songsToCheck = enrichedSongsCache
  
  if (!songsToCheck) {
    // Load songs from database
    const songs = JSON.parse(fs.readFileSync(TOP_SONGS_PATH, 'utf8'))
    
    // Add database IDs
    songsToCheck = songs.map((song, index) => ({
      ...song,
      id: index + 1
    }))
    
    // Scan for available stems
    const stemSongs = scanStemsDirectory()
    
    // Match with stems
    songsToCheck = songsToCheck.map(song => {
      const stemSong = stemSongs.find(s => {
        // Try exact match first
        if (s.title.toLowerCase() === song.title.toLowerCase() && 
            s.artist.toLowerCase() === song.artist.toLowerCase()) {
          return true
        }
        
        // Try partial matches
        const stemTitleLower = s.title.toLowerCase()
        const songTitleLower = song.title.toLowerCase()
        const stemArtistLower = s.artist.toLowerCase()
        const songArtistLower = song.artist.toLowerCase()
        
        const artistMatch = stemArtistLower.includes(songArtistLower) || 
                            songArtistLower.includes(stemArtistLower)
        const titleMatch = stemTitleLower.includes(songTitleLower) || 
                          songTitleLower.includes(stemTitleLower)
        
        return artistMatch && titleMatch
      })
      
      if (stemSong) {
        return { ...song, stems: stemSong.stems }
      }
      return song
    })
  }
  
  // Filter to songs without stems and map to clean output
  // Remove duplicates by using a Set with unique key (title + artist)
  const seen = new Set()
  const needingItunes = songsToCheck
    .filter(s => {
      // Must not have stems
      if (s.stems) return false
      
      // Create unique key
      const key = `${s.title.toLowerCase()}|||${s.artist.toLowerCase()}`
      
      // Skip if we've seen this song
      if (seen.has(key)) return false
      
      seen.add(key)
      return true
    })
    .map(s => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      audioUrl: s.audioUrl || null,
      hasAudio: !!s.audioUrl
    }))
    .sort((a, b) => {
      // Sort by: has audio first, then by ID
      if (a.hasAudio !== b.hasAudio) {
        return a.hasAudio ? -1 : 1  // Has audio comes first
      }
      return (a.id || 0) - (b.id || 0)
    })
  
  const withUrls = needingItunes.filter(s => s.hasAudio).length
  const withoutUrls = needingItunes.filter(s => !s.hasAudio).length
  
  return {
    songs: needingItunes,
    count: needingItunes.length,
    withUrls,
    withoutUrls,
    totalSongs: songsToCheck.length
  }
}

// Check if cache needs refresh (optional, for manual refresh endpoints)
export function needsRefresh() {
  if (!lastEnriched) return true
  
  const CACHE_DURATION = 23 * 60 * 60 * 1000 // 23 hours
  const timeSinceRefresh = Date.now() - lastEnriched.getTime()
  
  return timeSinceRefresh > CACHE_DURATION
}
