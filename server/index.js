import express from 'express'
import cors from 'cors'
import { readFile } from 'fs/promises'
import { processStemsForTopSongs, getStemStatus, checkForInterruptedJob, getProcessingState, resumeInterruptedJob, retryFailedSongs, cancelProcessing, processMissingStems } from './stem-processor.js'
import { enrichAllSongs, getEnrichedSongs, needsRefresh, getItunesApiStatus } from './song-enrichment.js'

const app = express()
const PORT = 3001

// Display version banner on startup
let version = process.env.VERSION || '1.5.5'
try {
  const packageJson = JSON.parse(await readFile('./package.json', 'utf-8'))
  version = packageJson.version
} catch (error) {
  // Ignore if package.json not found (use env var or default)
}

console.log('\n' + '='.repeat(60))
console.log('🎵  Band on the Run - Backend Server')
console.log(`📦  Version: ${version}`)
console.log(`🚀  Environment: ${process.env.NODE_ENV || 'development'}`)
console.log('='.repeat(60) + '\n')

app.use(cors())
app.use(express.json())

// Check for interrupted stem processing job and auto-resume if found
checkForInterruptedJob()
  .then(state => {
    if (state) {
      console.log('✅ Interrupted job has been automatically resumed')
    }
  })
  .catch(error => {
    console.error('❌ Error checking for interrupted job:', error)
  })

// Initial song enrichment on server startup
console.log('🎵 Starting initial song enrichment...')
enrichAllSongs()
  .then(() => {
    console.log('✅ Initial song enrichment complete')
  })
  .catch(error => {
    console.error('❌ Failed to enrich songs on startup:', error)
  })

// Set up automatic refresh every 23 hours
const REFRESH_INTERVAL = 23 * 60 * 60 * 1000 // 23 hours in milliseconds
setInterval(async () => {
  console.log('🔄 Auto-refreshing song cache (23-hour maintenance)...')
  try {
    await enrichAllSongs()
    console.log('✅ Cache automatically refreshed')
  } catch (error) {
    console.error('❌ Failed to refresh song cache:', error)
  }
}, REFRESH_INTERVAL)

// Get enriched songs with iTunes previews
app.get('/api/songs/enriched', async (req, res) => {
  try {
    const data = getEnrichedSongs()
    res.json(data)
  } catch (error) {
    res.status(503).json({ 
      error: error.message,
      message: 'Server is still loading song data. Please try again in a moment.'
    })
  }
})

// Manual refresh endpoint (for admin use)
app.post('/api/songs/refresh', async (req, res) => {
  try {
    console.log('🔄 Manual song cache refresh requested')
    await enrichAllSongs()
    res.json({ 
      message: 'Song cache refreshed successfully',
      ...getEnrichedSongs()
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get iTunes API status (for monitoring rate limiting and errors)
app.get('/api/itunes/status', (req, res) => {
  try {
    const status = getItunesApiStatus()
    res.json(status)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get status of current stems
app.get('/api/stems/status', async (req, res) => {
  try {
    const status = await getStemStatus()
    res.json(status)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get current processing state
app.get('/api/stems/processing', async (req, res) => {
  try {
    const state = await getProcessingState()
    res.json(state || { isRunning: false })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Resume interrupted processing job
app.post('/api/stems/resume', async (req, res) => {
  try {
    // Start resuming in background
    resumeInterruptedJob()
      .then(result => {
        console.log('✅ Resumed stem processing completed:', result)
      })
      .catch(error => {
        console.error('❌ Resumed stem processing failed:', error)
      })
    
    res.json({ 
      message: 'Resuming interrupted stem processing job',
      status: 'processing'
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Process stems for top X songs
app.post('/api/stems/process', async (req, res) => {
  const { count } = req.body
  
  if (!count || count < 1 || count > 2500) {
    return res.status(400).json({ error: 'Count must be between 1 and 2500' })
  }

  try {
    // Start processing in background
    processStemsForTopSongs(count)
      .then(result => {
        console.log('✅ Stem processing completed:', result)
      })
      .catch(error => {
        console.error('❌ Stem processing failed:', error)
      })
    
    res.json({ 
      message: `Started processing stems for top ${count} songs`,
      status: 'processing'
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Retry failed songs
app.post('/api/stems/retry-failed', async (req, res) => {
  try {
    // Start retry processing in background
    retryFailedSongs()
      .then(result => {
        console.log('✅ Failed songs retry completed:', result)
      })
      .catch(error => {
        console.error('❌ Failed songs retry failed:', error)
      })
    
    res.json({ 
      message: 'Started retrying previously failed songs',
      status: 'processing'
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Cancel current processing
app.post('/api/stems/cancel', async (req, res) => {
  try {
    const result = await cancelProcessing()
    res.json(result)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Process only songs without stems
app.post('/api/stems/process-missing', async (req, res) => {
  try {
    // Start processing in background
    processMissingStems()
      .then(result => {
        console.log('✅ Missing stems processing completed:', result)
      })
      .catch(error => {
        console.error('❌ Missing stems processing failed:', error)
      })
    
    res.json({ 
      message: 'Started processing songs without stems',
      status: 'processing'
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`\n✅ Server ready on http://localhost:${PORT}\n`)
})
