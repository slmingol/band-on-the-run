import express from 'express'
import cors from 'cors'
import { readFile, writeFile } from 'fs/promises'
import { exec } from 'child_process'
import { promisify } from 'util'
import { processStemsForTopSongs, getStemStatus, checkForInterruptedJob, getProcessingState, resumeInterruptedJob, retryFailedSongs, cancelProcessing, processMissingStems, getItunesApiConfig, setItunesApiEnabled } from './stem-processor.js'
import { enrichAllSongs, getEnrichedSongs, needsRefresh, getItunesApiStatus, getSongsNeedingItunes, saveEnrichedSongs, getEnrichmentState } from './song-enrichment.js'

const execAsync = promisify(exec)

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
console.log(`🎵  iTunes API: ${parseInt(process.env.ENABLE_ITUNES_API || '0') ? 'Enabled' : 'Disabled (set ENABLE_ITUNES_API=1 to enable)'}`)
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

// Check for interrupted enrichment and resume if found
const enrichmentState = getEnrichmentState()
const shouldResumeEnrichment = enrichmentState && enrichmentState.isRunning

enrichAllSongs(shouldResumeEnrichment)
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

// Manual save endpoint (persist current enrichments to disk)
app.post('/api/songs/save', async (req, res) => {
  try {
    const data = getEnrichedSongs()
    const count = saveEnrichedSongs(data.songs)
    res.json({ 
      message: 'Enriched songs saved to disk',
      savedCount: count
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

// Get enrichment state (for monitoring interrupted enrichment)
app.get('/api/enrichment/status', (req, res) => {
  try {
    const state = getEnrichmentState()
    res.json(state || { isRunning: false })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Resume interrupted enrichment
app.post('/api/enrichment/resume', async (req, res) => {
  try {
    const state = getEnrichmentState()
    if (!state || !state.isRunning) {
      return res.status(400).json({ error: 'No interrupted enrichment found' })
    }
    
    // Start resuming in background
    enrichAllSongs(true)
      .then(result => {
        console.log('✅ Resumed enrichment completed')
      })
      .catch(error => {
        console.error('❌ Resumed enrichment failed:', error)
      })
    
    res.json({ 
      message: 'Resuming interrupted enrichment',
      status: 'processing',
      remaining: state.queue.length
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get songs that need iTunes URLs
app.get('/api/songs/needing-itunes', (req, res) => {
  try {
    const result = getSongsNeedingItunes()
    res.json(result)
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
    // Check if server is ready
    try {
      getEnrichedSongs() // This will throw if not ready
    } catch (error) {
      return res.status(503).json({ 
        error: 'Server is still loading songs. Please wait a moment and try again.',
        loading: true
      })
    }
    
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

// Get application configuration (including danger zone PIN)
app.get('/api/config', (req, res) => {
  try {
    res.json({
      dangerZonePin: process.env.DANGER_ZONE_PIN || '1234'
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get iTunes API configuration
app.get('/api/config/itunes', (req, res) => {
  try {
    const config = getItunesApiConfig()
    res.json(config)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Set iTunes API enabled/disabled
app.post('/api/config/itunes', async (req, res) => {
  try {
    const { enabled } = req.body
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' })
    }
    
    const config = setItunesApiEnabled(enabled)
    res.json({ 
      message: `iTunes API ${enabled ? 'enabled' : 'disabled'}`,
      config
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Add songs to library
app.post('/api/songs/add', async (req, res) => {
  const { count } = req.body
  
  if (!count || count < 1 || count > 1000) {
    return res.status(400).json({ error: 'Count must be between 1 and 1000' })
  }

  let originalBatchSize
  try {
    // Read current config
    const configPath = './config/song-library-config.json'
    const config = JSON.parse(await readFile(configPath, 'utf-8'))
    
    // Store original batch size
    originalBatchSize = config.batchSize
    
    // Temporarily set batch size to requested amount
    config.batchSize = count
    await writeFile(configPath, JSON.stringify(config, null, 2))
    
    // Run the add-songs script
    console.log(`📚 Adding ${count} songs to library...`)
    const { stdout, stderr } = await execAsync('npm run add-songs', {
      cwd: process.cwd(),
      env: { ...process.env }
    })
    
    // Restore original batch size
    const updatedConfig = JSON.parse(await readFile(configPath, 'utf-8'))
    updatedConfig.batchSize = originalBatchSize
    await writeFile(configPath, JSON.stringify(updatedConfig, null, 2))
    
    // Also update the public config (optional - may not exist in Docker)
    try {
      const publicConfigPath = './public/config/song-library-config.json'
      await writeFile(publicConfigPath, JSON.stringify(updatedConfig, null, 2))
    } catch (error) {
      // Ignore if public directory doesn't exist - not critical in production
      console.log('⚠️  Could not update public config (non-critical)')
    }
    
    console.log('✅ Songs added successfully')
    console.log(stdout)
    
    // Trigger a refresh of enriched songs
    await enrichAllSongs()
    
    res.json({ 
      message: `Successfully added ${count} songs to the library`,
      newCount: updatedConfig.currentSongCount,
      target: updatedConfig.targetSongCount,
      output: stdout
    })
  } catch (error) {
    console.error('❌ Error adding songs:', error)
    // Try to restore original batch size on error
    try {
      if (typeof originalBatchSize !== 'undefined') {
        const config = JSON.parse(await readFile('./config/song-library-config.json', 'utf-8'))
        config.batchSize = originalBatchSize
        await writeFile('./config/song-library-config.json', JSON.stringify(config, null, 2))
      }
    } catch {}
    
    res.status(500).json({ 
      error: error.message,
      stderr: error.stderr || ''
    })
  }
})

app.listen(PORT, () => {
  console.log(`\n✅ Server ready on http://localhost:${PORT}\n`)
})
