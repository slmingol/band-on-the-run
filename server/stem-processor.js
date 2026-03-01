import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'
import fetch from 'node-fetch'

const execAsync = promisify(exec)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.join(__dirname, '..')

const TOP_SONGS_PATH = path.join(PROJECT_ROOT, 'scripts', 'top-songs.json')
const ORIGINALS_DIR = path.join(PROJECT_ROOT, 'public', 'audio', 'originals')
const STEMS_DIR = path.join(PROJECT_ROOT, 'public', 'audio', 'stems', 'htdemucs')
const GAME_LOGIC_PATH = path.join(PROJECT_ROOT, 'src', 'utils', 'gameLogic.js')
const PROCESSING_STATE_PATH = path.join(PROJECT_ROOT, 'server', 'processing-state.json')

// Processing state management
let currentProcessingState = null

async function saveProcessingState(state) {
  currentProcessingState = state
  try {
    await fs.writeFile(PROCESSING_STATE_PATH, JSON.stringify(state, null, 2))
  } catch (error) {
    console.error('Failed to save processing state:', error.message)
  }
}

async function loadProcessingState() {
  try {
    const data = await fs.readFile(PROCESSING_STATE_PATH, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    return null
  }
}

async function clearProcessingState() {
  currentProcessingState = null
  try {
    await fs.unlink(PROCESSING_STATE_PATH)
  } catch (error) {
    // File might not exist, that's ok
  }
}

export async function getProcessingState() {
  return currentProcessingState || await loadProcessingState()
}

// Check for interrupted job on startup and optionally resume
export async function checkForInterruptedJob() {
  const state = await loadProcessingState()
  
  if (state && state.isRunning) {
    const startedAt = new Date(state.startedAt)
    const now = new Date()
    const elapsedMinutes = Math.floor((now - startedAt) / 1000 / 60)
    
    console.log(`\n⚠️  Detected interrupted stem processing job:`)
    console.log(`   Started: ${startedAt.toLocaleString()}`)
    console.log(`   Progress: ${state.currentIndex + 1}/${state.totalCount} songs`)
    console.log(`   Successful: ${state.results.successful}`)
    console.log(`   Skipped: ${state.results.skipped}`)
    console.log(`   Failed: ${state.results.failed?.length || 0}`)
    console.log(`   Time elapsed: ${elapsedMinutes} minutes`)
    console.log(`\n� Automatically resuming processing...\n`)
    
    // Automatically resume the interrupted job
    await resumeInterruptedJob()
    
    return state
  }
  
  return null
}

// Resume interrupted job
export async function resumeInterruptedJob() {
  const state = await loadProcessingState()
  
  if (!state || !state.isRunning) {
    throw new Error('No interrupted job found to resume')
  }
  
  console.log(`\n🔄 Resuming interrupted job from song ${state.currentIndex + 1}/${state.totalCount}...`)
  
  // Clear the interrupted state and start fresh from where we left off
  await clearProcessingState()
  
  // Process the remaining songs
  return await processStemsForTopSongs(state.totalCount)
}


// Calculate directory size recursively
async function getDirectorySize(dirPath) {
  let totalSize = 0
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      
      if (entry.isDirectory()) {
        totalSize += await getDirectorySize(fullPath)
      } else {
        const stats = await fs.stat(fullPath)
        totalSize += stats.size
      }
    }
  } catch (error) {
    // Directory might not exist yet
    return 0
  }
  
  return totalSize
}

// Format bytes to human readable format
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Helper function to sleep/delay
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Search iTunes for a song and get preview URL with retry logic
async function searchItunes(title, artist, retryCount = 0) {
  const maxRetries = 30 // Keep retrying for a long time
  const query = encodeURIComponent(`${title} ${artist}`)
  const url = `https://itunes.apple.com/search?term=${query}&media=music&entity=song&limit=1`
  
  try {
    const response = await fetch(url)
    
    // Try to parse as JSON regardless of content-type (iTunes sometimes sends wrong headers)
    let data
    try {
      data = await response.json()
    } catch (parseError) {
      // If JSON parse fails, check if it's a rate limit text response
      const text = await response.text()
      if (text.toLowerCase().includes('rate limit')) {
        throw new Error('RATE_LIMIT')
      }
      throw new Error(`Invalid response: ${text.substring(0, 100)}`)
    }
    
    if (data.results && data.results.length > 0) {
      const previewUrl = data.results[0].previewUrl
      if (previewUrl) {
        return previewUrl
      }
    }
    
    throw new Error(`No preview found for ${title} by ${artist}`)
  } catch (error) {
    if (error.message === 'RATE_LIMIT') {
      if (retryCount >= maxRetries) {
        throw new Error(`iTunes rate limit persists after ${maxRetries} retries - giving up on this song`)
      }
      
      // Exponential backoff capped at 300 seconds (5 minutes)
      const baseWait = Math.pow(2, Math.min(retryCount, 6)) * 5000
      const waitTime = Math.min(baseWait, 300000) // Max 300 second wait
      const statusMsg = `⏳ iTunes rate limit - waiting ${waitTime/1000}s (retry ${retryCount + 1}/${maxRetries})`
      console.log(statusMsg)
      
      // Update state with retry status
      if (currentProcessingState) {
        await saveProcessingState({
          ...currentProcessingState,
          statusMessage: statusMsg
        })
      }
      
      await sleep(waitTime)
      return searchItunes(title, artist, retryCount + 1)
    }
    throw error
  }
}

// Download audio file from iTunes with retry logic
async function downloadAudio(url, title, artist, retryCount = 0) {
  const maxRetries = 30 // Keep retrying for a long time
  const sanitizedTitle = `${artist}-${title}`.replace(/[^a-z0-9]/gi, '_')
  const outputPath = path.join(ORIGINALS_DIR, `${sanitizedTitle}.m4a`)
  
  // Skip if already downloaded
  try {
    await fs.access(outputPath)
    console.log(`⏭️  Already downloaded: ${sanitizedTitle}`)
    return outputPath
  } catch {
    // File doesn't exist, download it
  }
  
  try {
    console.log(`⬇️  Downloading: ${title} by ${artist}`)
    const response = await fetch(url)
    
    if (!response.ok) {
      if (response.status === 429 || response.status === 503) {
        throw new Error('RATE_LIMIT')
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const buffer = await response.arrayBuffer()
    await fs.writeFile(outputPath, Buffer.from(buffer))
    console.log(`✅ Downloaded: ${sanitizedTitle}`)
    
    return outputPath
  } catch (error) {
    if (error.message === 'RATE_LIMIT') {
      if (retryCount >= maxRetries) {
        throw new Error(`Download rate limit persists after ${maxRetries} retries - giving up on this song`)
      }
      
      // Exponential backoff capped at 300 seconds (5 minutes)
      const baseWait = Math.pow(2, Math.min(retryCount, 6)) * 5000
      const waitTime = Math.min(baseWait, 300000) // Max 300 second wait
      const statusMsg = `⏳ Download rate limit - waiting ${waitTime/1000}s (retry ${retryCount + 1}/${maxRetries})`
      console.log(statusMsg)
      
      // Update state with retry status
      if (currentProcessingState) {
        await saveProcessingState({
          ...currentProcessingState,
          statusMessage: statusMsg
        })
      }
      
      await sleep(waitTime)
      return downloadAudio(url, title, artist, retryCount + 1)
    }
    throw error
  }
}

// Process audio file with Demucs
async function processWithDemucs(audioPath) {
  const filename = path.basename(audioPath, path.extname(audioPath))
  const outputDir = path.join(STEMS_DIR, filename)
  
  // Skip if already processed
  try {
    await fs.access(path.join(outputDir, 'bass.mp3'))
    console.log(`⏭️  Stems already exist: ${filename}`)
    return outputDir
  } catch {
    // Stems don't exist, process them
  }
  
  console.log(`🎵 Processing stems: ${filename}`)
  
  // Try multiple demucs locations
  const demucsCommands = [
    'python3.13 -m demucs',
    '$HOME/Library/Python/3.13/bin/demucs',
    'demucs'
  ]
  
  const command = `${demucsCommands[0]} --mp3 --mp3-bitrate 192 -o "${path.join(PROJECT_ROOT, 'public', 'audio', 'stems')}" "${audioPath}"`
  
  try {
    const { stdout, stderr } = await execAsync(command)
    if (stderr && !stderr.includes('100%')) {
      console.log('Demucs output:', stderr)
    }
    console.log(`✅ Stems created: ${filename}`)
    return outputDir
  } catch (error) {
    console.error(`❌ Demucs failed for ${filename}:`, error.message)
    throw error
  }
}

// Get current stem processing status
export async function getStemStatus() {
  const topSongs = JSON.parse(await fs.readFile(TOP_SONGS_PATH, 'utf-8'))
  
  // Calculate storage usage
  const stemsSize = await getDirectorySize(STEMS_DIR)
  const originalsSize = await getDirectorySize(ORIGINALS_DIR)
  const totalSize = stemsSize + originalsSize
  
  const status = {
    total: topSongs.length,
    processed: 0,
    songs: [],
    storage: {
      stemsBytes: stemsSize,
      originalsBytes: originalsSize,
      totalBytes: totalSize,
      stemsFormatted: formatBytes(stemsSize),
      originalsFormatted: formatBytes(originalsSize),
      totalFormatted: formatBytes(totalSize)
    }
  }
  
  for (const song of topSongs) {
    const sanitizedTitle = `${song.artist}-${song.title}`.replace(/[^a-z0-9]/gi, '_')
    const stemPath = path.join(STEMS_DIR, sanitizedTitle)
    
    let hasStems = false
    try {
      await fs.access(path.join(stemPath, 'bass.mp3'))
      hasStems = true
      status.processed++
    } catch {
      hasStems = false
    }
    
    status.songs.push({
      title: song.title,
      artist: song.artist,
      hasStems
    })
  }
  
  return status
}

// Process stems for top X songs
export async function processStemsForTopSongs(count) {
  // Check if there's already a job running
  if (currentProcessingState && currentProcessingState.isRunning) {
    throw new Error('A stem processing job is already running. Please wait for it to complete.')
  }
  
  // Ensure directories exist
  await fs.mkdir(ORIGINALS_DIR, { recursive: true })
  await fs.mkdir(STEMS_DIR, { recursive: true })
  
  const topSongs = JSON.parse(await fs.readFile(TOP_SONGS_PATH, 'utf-8'))
  const songsToProcess = topSongs.slice(0, count)
  
  console.log(`🎵 Processing stems for top ${count} songs...`)
  
  const results = {
    attempted: 0,
    successful: 0,
    skipped: 0,
    failed: []
  }
  
  // Save initial processing state
  await saveProcessingState({
    isRunning: true,
    totalCount: count,
    currentIndex: 0,
    currentSong: null,
    statusMessage: null,
    startedAt: new Date().toISOString(),
    results
  })
  
  for (let i = 0; i < songsToProcess.length; i++) {
    const song = songsToProcess[i]
    results.attempted++
    console.log(`\n[${results.attempted}/${count}] ${song.title} by ${song.artist}`)
    
    // Update state before processing each song
    await saveProcessingState({
      isRunning: true,
      totalCount: count,
      currentIndex: i,
      currentSong: `${song.title} by ${song.artist}`,
      startedAt: currentProcessingState.startedAt,
      statusMessage: null,
      results
    })
    
    try {
      // Check if stems already exist before downloading
      const sanitizedTitle = `${song.artist}-${song.title}`.replace(/[^a-z0-9]/gi, '_')
      const stemPath = path.join(STEMS_DIR, sanitizedTitle)
      try {
        await fs.access(path.join(stemPath, 'bass.mp3'))
        console.log(`⏭️  Stems already exist: ${sanitizedTitle}`)
        results.skipped++
        
        // Clear status message
        await saveProcessingState({
          isRunning: true,
          totalCount: count,
          currentIndex: i,
          currentSong: `${song.title} by ${song.artist}`,
          startedAt: currentProcessingState.startedAt,
          statusMessage: null,
          results
        })
        
        continue
      } catch {
        // Continue processing
      }
      
      // Search iTunes
      const previewUrl = await searchItunes(song.title, song.artist)
      
      // Download audio
      const audioPath = await downloadAudio(previewUrl, song.title, song.artist)
      
      // Update status for Demucs processing
      await saveProcessingState({
        isRunning: true,
        totalCount: count,
        currentIndex: i,
        currentSong: `${song.title} by ${song.artist}`,
        startedAt: currentProcessingState.startedAt,
        statusMessage: '🎸 Separating audio into stems...',
        results
      })
      
      // Process with Demucs
      await processWithDemucs(audioPath)
      results.successful++
      
      // Clear status message after success
      await saveProcessingState({
        isRunning: true,
        totalCount: count,
        currentIndex: i,
        currentSong: `${song.title} by ${song.artist}`,
        startedAt: currentProcessingState.startedAt,
        statusMessage: null,
        results
      })
      
      // Add a small delay between songs to avoid rate limits (2 seconds)
      if (i < songsToProcess.length - 1) {
        await sleep(2000)
      }
      
    } catch (error) {
      console.error(`❌ Failed: ${song.title} - ${error.message}`)
      results.failed.push({ song, error: error.message })
      
      // If we failed due to rate limit after retries, add longer delay before next song
      if (error.message.includes('RATE_LIMIT') || error.message.includes('Rate limit')) {
        const pauseMsg = '⏸️  Pausing 30 seconds due to rate limits before continuing...'
        console.log(pauseMsg)
        
        await saveProcessingState({
          isRunning: true,
          totalCount: count,
          currentIndex: i,
          currentSong: `${song.title} by ${song.artist}`,
          startedAt: currentProcessingState.startedAt,
          statusMessage: pauseMsg,
          results
        })
        
        await sleep(30000)
        
        // Clear status after pause
        await saveProcessingState({
          isRunning: true,
          totalCount: count,
          currentIndex: i,
          currentSong: `${song.title} by ${song.artist}`,
          startedAt: currentProcessingState.startedAt,
          statusMessage: null,
          results
        })
      }
    }
  }
  
  console.log(`\n✅ Processing complete!`)
  console.log(`   Attempted: ${results.attempted}`)
  console.log(`   Successful: ${results.successful}`)
  console.log(`   Skipped (already processed): ${results.skipped}`)
  console.log(`   Failed: ${results.failed.length}`)
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed songs:')
    results.failed.forEach(f => {
      console.log(`   - ${f.song.title} by ${f.song.artist}: ${f.error}`)
    })
  }
  
  // Clear processing state when complete
  await clearProcessingState()
  
  // Update gameLogic.js
  await updateGameLogic()
  
  return results
}

// Update gameLogic.js with new stems
async function updateGameLogic() {
  console.log('\n📝 Updating gameLogic.js...')
  
  try {
    // Get all processed stems
    const stemDirs = await fs.readdir(STEMS_DIR)
    const songsWithStems = []
    
    for (const dir of stemDirs) {
      const bassPath = path.join(STEMS_DIR, dir, 'bass.mp3')
      try {
        await fs.access(bassPath)
        
        // Parse title and artist from directory name
        const parts = dir.split('-')
        const artist = parts[0].replace(/_/g, ' ')
        const title = parts.slice(1).join('-').replace(/_/g, ' ')
        
        songsWithStems.push({
          title,
          artist,
          dirname: dir
        })
      } catch {
        // Skip if bass.mp3 doesn't exist
      }
    }
    
    console.log(`✅ Found ${songsWithStems.length} songs with stems`)
    console.log('   Note: gameLogic.js should be updated manually or via script')
    console.log('   Songs ready:', songsWithStems.map(s => `${s.title} - ${s.artist}`).join(', '))
    
  } catch (error) {
    console.error('❌ Failed to update gameLogic.js:', error.message)
  }
}
