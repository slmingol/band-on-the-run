import { useState, useEffect } from 'react'
import './Admin.css'
import { clearSpotifyCache } from '../utils/gameLogic'

const STEM_SERVER_URL = '' // Use relative URLs for API calls

function Admin({ onBack, themePreference, effectiveTheme, onThemeChange }) {
  const [message, setMessage] = useState('')
  const [stemCount, setStemCount] = useState(10)
  const [stemStatus, setStemStatus] = useState(null)
  const [enrichmentStatus, setEnrichmentStatus] = useState(null)
  const [itunesStatus, setItunesStatus] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [stemServerAvailable, setStemServerAvailable] = useState(false)
  const [libraryConfig, setLibraryConfig] = useState(null)
  const [processingState, setProcessingState] = useState(null)
  const [lastCompletedResults, setLastCompletedResults] = useState(null)
  const [itunesApiEnabled, setItunesApiEnabled] = useState(false)
  const [songsNeedingItunes, setSongsNeedingItunes] = useState(null)
  const [showNeedingItunes, setShowNeedingItunes] = useState(false)
  
  // Danger Zone security
  const [dangerZoneUnlocked, setDangerZoneUnlocked] = useState(false)
  const [dangerZoneExpanded, setDangerZoneExpanded] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [dangerZonePin, setDangerZonePin] = useState('1234') // Loaded from backend at runtime

  // Check if stem server is running and get status
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onBack()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onBack])

  useEffect(() => {
    const fetchAppConfig = async () => {
      try {
        const response = await fetch(`${STEM_SERVER_URL}/api/config`)
        if (response.ok) {
          const config = await response.json()
          setDangerZonePin(config.dangerZonePin)
        }
      } catch (error) {
        console.log('App config not available, using default PIN')
      }
    }
    
    const checkStemServer = async () => {
      try {
        const response = await fetch(`${STEM_SERVER_URL}/api/stems/status`)
        if (response.ok) {
          const status = await response.json()
          setStemStatus(status)
          setStemServerAvailable(true)
        } else {
          // Server responded but with an error - keep current status, mark as available
          console.log('Stem status returned error:', response.status)
        }
      } catch (error) {
        // Network error or server down - keep status but mark unavailable
        console.log('[DEBUG] Stem server fetch error:', error.message)
        setStemServerAvailable(false)
      }
    }
    
    const checkEnrichmentStatus = async () => {
      try {
        const response = await fetch(`${STEM_SERVER_URL}/api/songs/enriched`)
        if (response.ok) {
          const data = await response.json()
          setEnrichmentStatus({
            totalSongs: data.totalSongs,
            withStems: data.withStems,
            withPreviews: data.withPreviews,
            lastEnriched: data.lastEnriched
          })
        } else if (response.status === 503) {
          // Server is still loading, don't log error
          console.log('⏳ Server still enriching songs...')
        }
      } catch (error) {
        console.log('Enrichment status not available:', error.message)
      }
    }
    
    const checkItunesStatus = async () => {
      try {
        const response = await fetch(`${STEM_SERVER_URL}/api/itunes/status`)
        if (response.ok) {
          const data = await response.json()
          setItunesStatus(data)
        }
      } catch (error) {
        console.log('iTunes status not available')
      }
    }
    
    const checkItunesApiConfig = async () => {
      try {
        const response = await fetch(`${STEM_SERVER_URL}/api/config/itunes`)
        if (response.ok) {
          const data = await response.json()
          setItunesApiEnabled(data.enabled)
        }
      } catch (error) {
        console.log('iTunes API config not available')
      }
    }
    
    const checkProcessingState = async () => {
      try {
        const response = await fetch(`${STEM_SERVER_URL}/api/stems/processing`)
        if (response.ok) {
          const data = await response.json()
          
          // If processing just finished, save the results for display
          if (processingState?.isRunning && !data.isRunning && processingState.results) {
            setLastCompletedResults(processingState.results)
            // Clear completion banner after 15 seconds
            setTimeout(() => setLastCompletedResults(null), 15000)
          }
          
          setProcessingState(data)
          
          // Clear local processing state if backend reports not running
          if (!data.isRunning) {
            setIsProcessing(false)
          }
        }
      } catch (error) {
        console.log('Processing state not available:', error.message)
      }
    }
    
    const fetchLibraryConfig = async () => {
      try {
        const response = await fetch('/config/song-library-config.json')
        if (response.ok) {
          const config = await response.json()
          setLibraryConfig(config)
        }
      } catch (error) {
        console.log('Library config not available')
      }
    }
    
    fetchAppConfig()
    checkStemServer()
    checkEnrichmentStatus()
    checkItunesStatus()
    checkItunesApiConfig()
    checkProcessingState()
    fetchLibraryConfig()
    
    // Poll status every 3 seconds for live updates
    const interval = setInterval(() => {
      checkStemServer()
      checkItunesStatus()
      checkItunesApiConfig()
      checkEnrichmentStatus()
      checkProcessingState()
    }, 3000)
    
    return () => clearInterval(interval)
  }, [])

  // Sync isProcessing with backend processingState
  useEffect(() => {
    if (processingState && !processingState.isRunning && isProcessing) {
      setIsProcessing(false)
    }
  }, [processingState, isProcessing])

  const handleProcessStems = async (e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    
    const count = stemCount === '' ? 10 : stemCount
    
    if (!count || count < 1 || count > 2500) {
      setMessage('❌ Count must be between 1 and 2500')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setIsProcessing(true)
    setMessage(`🎵 Starting processing for top ${count} songs... Check the terminal running "npm run stem-server" for detailed progress.`)

    try {
      const response = await fetch(`${STEM_SERVER_URL}/api/stems/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count })
      })

      if (response.ok) {
        setMessage(`✅ Processing started! Watch the terminal for real-time progress. This will take approximately ${Math.ceil(count * 10 / 60)} minutes. Status updates every 30 seconds...`)
        
        // Auto-refresh status every 30 seconds while processing
        const interval = setInterval(async () => {
          try {
            const statusResponse = await fetch(`${STEM_SERVER_URL}/api/stems/status`)
            if (statusResponse.ok) {
              const status = await statusResponse.json()
              setStemStatus(status)
              setMessage(`⏳ Processing... ${status.processed}/${count} songs completed. Check terminal for details.`)
            }
          } catch (err) {
            // Silently fail, user can manually refresh
          }
        }, 30000)
        
        // Stop auto-refresh after estimated completion time + buffer
        setTimeout(() => {
          clearInterval(interval)
          setIsProcessing(false)
          refreshStemStatus()
        }, (count * 10 + 60) * 1000)
      } else {
        const error = await response.json()
        setMessage(`❌ Failed: ${error.error}`)
        setIsProcessing(false)
      }
    } catch (error) {
      setMessage('❌ Stem server not running! Start it with: npm run stem-server')
      setIsProcessing(false)
    }
  }

  const handleRetryFailedSongs = async (e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    
    const failedCount = lastCompletedResults?.failed?.length || processingState?.results?.failed?.length || 0
    
    if (failedCount === 0) {
      setMessage('❌ No failed songs to retry')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setIsProcessing(true)
    setMessage(`🔄 Starting retry for ${failedCount} failed songs... Check the terminal for progress.`)

    try {
      const response = await fetch(`${STEM_SERVER_URL}/api/stems/retry-failed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        setMessage(`✅ Retry started! Processing ${failedCount} songs. This will take approximately ${Math.ceil(failedCount * 10 / 60)} minutes. Status updates every 30 seconds...`)
        setLastCompletedResults(null) // Clear the completion banner since we're reprocessing
        
        // Auto-refresh status every 30 seconds while processing
        const interval = setInterval(async () => {
          try {
            const statusResponse = await fetch(`${STEM_SERVER_URL}/api/stems/status`)
            if (statusResponse.ok) {
              const status = await statusResponse.json()
              setStemStatus(status)
              setMessage(`⏳ Retrying... Check terminal for details.`)
            }
          } catch (err) {
            // Silently fail, user can manually refresh
          }
        }, 30000)
        
        // Stop auto-refresh after estimated completion time + buffer
        setTimeout(() => {
          clearInterval(interval)
          setIsProcessing(false)
          refreshStemStatus()
        }, (failedCount * 10 + 60) * 1000)
      } else {
        const error = await response.json()
        setMessage(`❌ Failed: ${error.error}`)
        setIsProcessing(false)
      }
    } catch (error) {
      setMessage('❌ Stem server not running! Start it with: npm run stem-server')
      setIsProcessing(false)
    }
  }

  const handleCancelProcessing = async (e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    
    if (!window.confirm('Are you sure you want to cancel the current processing job? Progress will be saved and you can resume later.')) {
      return
    }

    try {
      const response = await fetch(`${STEM_SERVER_URL}/api/stems/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        setMessage('🛑 Processing cancelled. Progress has been saved.')
        setIsProcessing(false)
        setTimeout(() => setMessage(''), 3000)
      } else {
        const error = await response.json()
        setMessage(`❌ Failed to cancel: ${error.error}`)
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (error) {
      setMessage('❌ Failed to cancel processing')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleToggleItunesApi = async (enabled) => {
    try {
      const response = await fetch(`${STEM_SERVER_URL}/api/config/itunes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      })

      if (response.ok) {
        setItunesApiEnabled(enabled)
        setMessage(`✅ iTunes API ${enabled ? 'enabled' : 'disabled'}`)
        setTimeout(() => setMessage(''), 3000)
      } else {
        const error = await response.json()
        setMessage(`❌ Failed: ${error.error}`)
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (error) {
      setMessage('❌ Failed to update iTunes API setting')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleViewNeedingItunes = async () => {
    if (showNeedingItunes) {
      // Just toggle off
      setShowNeedingItunes(false)
      return
    }
    
    // Fetch and show
    try {
      const response = await fetch(`${STEM_SERVER_URL}/api/songs/needing-itunes`)
      if (response.ok) {
        const data = await response.json()
        setSongsNeedingItunes(data)
        setShowNeedingItunes(true)
      } else {
        setMessage('❌ Failed to fetch songs needing iTunes')
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (error) {
      setMessage('❌ Failed to connect to server')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleProcessMissingStems = async (e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    
    if (!stemStatus) {
      setMessage('❌ Please refresh stem status first')
      setTimeout(() => setMessage(''), 3000)
      return
    }
    
    const missingCount = stemStatus.songs.filter(s => !s.hasStems).length
    
    if (missingCount === 0) {
      setMessage('✅ All songs already have stems!')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setIsProcessing(true)
    setMessage(`🔄 Starting processing for ${missingCount} songs without stems... Check the terminal for progress.`)

    try {
      const response = await fetch(`${STEM_SERVER_URL}/api/stems/process-missing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        setMessage(`✅ Processing started! Processing ${missingCount} songs. This will take approximately ${Math.ceil(missingCount * 10 / 60)} minutes. Status updates every 30 seconds...`)
        
        // Auto-refresh status every 30 seconds while processing
        const interval = setInterval(async () => {
          try {
            const statusResponse = await fetch(`${STEM_SERVER_URL}/api/stems/status`)
            if (statusResponse.ok) {
              const status = await statusResponse.json()
              setStemStatus(status)
              setMessage(`⏳ Processing... Check terminal for details.`)
            }
          } catch (err) {
            // Silently fail, user can manually refresh
          }
        }, 30000)
        
        // Stop auto-refresh after estimated completion time + buffer
        setTimeout(() => {
          clearInterval(interval)
          setIsProcessing(false)
          refreshStemStatus()
        }, (missingCount * 10 + 60) * 1000)
      } else {
        const error = await response.json()
        setMessage(`❌ Failed: ${error.error}`)
        setIsProcessing(false)
      }
    } catch (error) {
      setMessage('❌ Stem server not running! Start it with: npm run stem-server')
      setIsProcessing(false)
    }
  }

  const refreshStemStatus = async () => {
    try {
      const response = await fetch(`${STEM_SERVER_URL}/api/stems/status`)
      if (response.ok) {
        const status = await response.json()
        setStemStatus(status)
      }
      
      const enrichResponse = await fetch(`${STEM_SERVER_URL}/api/songs/enriched`)
      if (enrichResponse.ok) {
        const data = await enrichResponse.json()
        setEnrichmentStatus({
          totalSongs: data.totalSongs,
          withStems: data.withStems,
          withPreviews: data.withPreviews,
          lastEnriched: data.lastEnriched
        })
      }
      
      setMessage('✅ Status refreshed!')
      setTimeout(() => setMessage(''), 2000)
    } catch (error) {
      setMessage('❌ Failed to refresh status')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleResumeJob = async () => {
    setMessage('🔄 Resuming interrupted job...')
    
    try {
      const response = await fetch(`${STEM_SERVER_URL}/api/stems/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        setMessage('✅ Resumed processing! Check the terminal for progress.')
        setTimeout(() => setMessage(''), 3000)
      } else {
        const error = await response.json()
        setMessage(`❌ Failed: ${error.error}`)
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (error) {
      setMessage('❌ Stem server not running!')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleClearCache = () => {
    clearSpotifyCache()
    setMessage('✅ Cache cleared! Songs will be reloaded on next game.')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleRefreshEnrichment = async () => {
    if (!stemServerAvailable) {
      setMessage('❌ Stem server not running! Start it with: npm run stem-server')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setMessage('⏳ Triggering enrichment refresh... This may take 1-2 minutes.')
    
    try {
      const response = await fetch(`${STEM_SERVER_URL}/api/songs/refresh`, {
        method: 'POST'
      })

      if (response.ok) {
        setMessage('✅ Enrichment refresh started! Check terminal for progress. Refreshing status in 5 seconds...')
        
        // Wait a bit then refresh status
        setTimeout(async () => {
          await refreshStemStatus()
          setMessage('✅ Enrichment completed and status refreshed!')
          setTimeout(() => setMessage(''), 3000)
        }, 5000)
      } else {
        const error = await response.json()
        setMessage(`❌ Failed: ${error.error}`)
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (error) {
      setMessage('❌ Failed to trigger refresh. Make sure stem server is running.')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleClearStats = () => {
    const userInput = prompt('⚠️ WARNING: This will permanently delete all stats!\n\nType "DELETE" to confirm:')
    if (userInput === 'DELETE') {
      localStorage.removeItem('band_on_the_run_stats')
      localStorage.removeItem('band_on_the_run_daily')
      setMessage('✅ Stats cleared!')
      setTimeout(() => setMessage(''), 3000)
    } else if (userInput !== null) {
      setMessage('❌ Confirmation failed - stats not cleared')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleClearAllCache = () => {
    const userInput = prompt('🚨 NUCLEAR OPTION: This will clear EVERYTHING!\n\nType "DELETE EVERYTHING" to confirm:')
    if (userInput === 'DELETE EVERYTHING') {
      localStorage.clear()
      sessionStorage.clear()
      setMessage('💥 Clearing everything...')
      onBack() // Dismiss the admin modal
      setTimeout(() => {
        window.location.reload() // Reload the page after a brief moment
      }, 100)
    } else if (userInput !== null) {
      setMessage('❌ Confirmation failed - nothing cleared')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleUnlockDangerZone = () => {
    if (pinInput === dangerZonePin) {
      setDangerZoneUnlocked(true)
      setDangerZoneExpanded(true)
      setMessage('🔓 Danger Zone unlocked')
      setTimeout(() => setMessage(''), 2000)
    } else {
      setMessage('❌ Incorrect PIN')
      setTimeout(() => setMessage(''), 2000)
      setPinInput('')
    }
  }

  const handleLockDangerZone = () => {
    setDangerZoneUnlocked(false)
    setDangerZoneExpanded(false)
    setPinInput('')
    setMessage('🔒 Danger Zone locked')
    setTimeout(() => setMessage(''), 2000)
  }

  return (
    <div className="admin">
      <div className="admin-container">
        <div className="admin-header">
          <button onClick={onBack} className="back-button">← Back</button>
          <h2>⚙️ Admin Settings</h2>
        </div>

        <div className="admin-section theme-selector-admin">
          <h3>🎨 Theme</h3>
          <div className="theme-options">
            <button 
              className={`theme-option ${themePreference === 'light' ? 'active' : ''}`}
              onClick={() => onThemeChange('light')}
              title="Light theme"
            >
              ☀️ Light
            </button>
            <button 
              className={`theme-option ${themePreference === 'dark' ? 'active' : ''}`}
              onClick={() => onThemeChange('dark')}
              title="Dark theme"
            >
              🌙 Dark
            </button>
            <button 
              className={`theme-option ${themePreference === 'system' ? 'active' : ''}`}
              onClick={() => onThemeChange('system')}
              title="Follow system preference"
            >
              💻 System
            </button>
          </div>
          {themePreference === 'system' && (
            <span className="theme-info">Currently using: {effectiveTheme}</span>
          )}
        </div>

        {stemStatus && enrichmentStatus && (
          <div className="admin-section library-stats">
            <h3>📚 Library Statistics</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{enrichmentStatus.totalSongs}</div>
                <div className="stat-label">Total Songs</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stemStatus.processed}</div>
                <div className="stat-label">With Stems</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{enrichmentStatus.withPreviews}</div>
                <div className="stat-label">iTunes Previews</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {enrichmentStatus.totalSongs - stemStatus.processed - enrichmentStatus.withPreviews}
                </div>
                <div className="stat-label">No Audio</div>
              </div>
            </div>
            
            <div className="enrichment-details">
              <div className="enrichment-row">
                <span className="enrichment-label">🎸 Stem Coverage:</span>
                <span className="enrichment-value">
                  {Math.round((stemStatus.processed / enrichmentStatus.totalSongs) * 100)}%
                  <small> ({stemStatus.processed}/{enrichmentStatus.totalSongs})</small>
                </span>
              </div>
              <div className="enrichment-row">
                <span className="enrichment-label">🎵 iTunes Success:</span>
                <span className="enrichment-value">
                  {enrichmentStatus.totalSongs - stemStatus.processed > 0 
                    ? Math.round((enrichmentStatus.withPreviews / (enrichmentStatus.totalSongs - stemStatus.processed)) * 100)
                    : 0}%
                  <small> ({enrichmentStatus.withPreviews}/{enrichmentStatus.totalSongs - stemStatus.processed})</small>
                </span>
              </div>
              {stemStatus.storage && (
                <div className="enrichment-row">
                  <span className="enrichment-label">💾 Storage Used:</span>
                  <span className="enrichment-value">
                    {stemStatus.storage.totalFormatted}
                    <small> ({stemStatus.storage.stemsFormatted} stems + {stemStatus.storage.originalsFormatted} originals)</small>
                  </span>
                </div>
              )}
              {enrichmentStatus.lastEnriched && (
                <div className="enrichment-row">
                  <span className="enrichment-label">🕒 Last Enriched:</span>
                  <span className="enrichment-value">
                    {new Date(enrichmentStatus.lastEnriched).toLocaleString()}
                    <small> (Auto-refreshes every 23h)</small>
                  </span>
                </div>
              )}
              {enrichmentStatus.withPreviews === 0 && enrichmentStatus.totalSongs > stemStatus.processed && (
                <div className="enrichment-warning">
                  ⚠️ iTunes API is currently blocking automated requests. Using long-tail enrichment approach.
                  <div style={{ marginTop: '0.5rem' }}>
                    <small>
                      <strong>Long-tail strategy:</strong> Only 3 random songs enriched per 23-hour cycle with 60s+ delays and randomization.
                      At this rate, all {enrichmentStatus.totalSongs - stemStatus.processed} songs needing iTunes will be enriched in ~{Math.ceil((enrichmentStatus.totalSongs - stemStatus.processed) / 3)} days.
                      This avoids API blocking while slowly building the database.
                    </small>
                  </div>
                </div>
              )}
              {enrichmentStatus.withPreviews > 0 && enrichmentStatus.withPreviews < (enrichmentStatus.totalSongs - stemStatus.processed) && (
                <div className="enrichment-info">
                  ℹ️ Long-tail enrichment in progress: {enrichmentStatus.withPreviews}/{enrichmentStatus.totalSongs - stemStatus.processed} songs enriched.
                  <div style={{ marginTop: '0.5rem' }}>
                    <small>
                      Remaining: ~{Math.ceil((enrichmentStatus.totalSongs - stemStatus.processed - enrichmentStatus.withPreviews) / 3)} days at 3 songs per day.
                    </small>
                  </div>
                </div>
              )}
            </div>
            
            {libraryConfig && (
              <div className="library-progress">
                <div className="progress-info">
                  <span>Library Growth Progress</span>
                  <span><strong>{stemStatus.total}</strong> / {libraryConfig.targetSongCount} songs</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${(stemStatus.total / libraryConfig.targetSongCount) * 100}%` }}
                  />
                </div>
                <p className="progress-detail">
                  <small>Last updated: {libraryConfig.lastUpdated} • Run <code>npm run add-songs</code> to add {libraryConfig.batchSize} more songs</small>
                </p>
              </div>
            )}
            <div className="library-info">
              <p><small>
                🎸 <strong>Stems:</strong> AI-separated instrument tracks (bass, drums, vocals, other) for progressive reveal<br/>
                🎵 <strong>iTunes:</strong> 30-second preview clips from iTunes API (rate-limited)<br/>
                ⚠️ <strong>No Audio:</strong> Songs without stems where iTunes API is unavailable
              </small></p>
            </div>
          </div>
        )}

        {itunesStatus && stemServerAvailable && (
          <div className="admin-section itunes-api-status">
            <h3>🎵 iTunes API Status {itunesStatus.currentlyEnriching && <span className="enriching-badge">⏳ Enriching...</span>}</h3>
            
            <div className="api-stats-grid">
              <div className="api-stat">
                <div className="api-stat-value">{itunesStatus.totalRequests}</div>
                <div className="api-stat-label">Total Requests</div>
              </div>
              <div className="api-stat success">
                <div className="api-stat-value">{itunesStatus.successfulRequests}</div>
                <div className="api-stat-label">✅ Successful</div>
              </div>
              <div className="api-stat rate-limited">
                <div className="api-stat-value">{itunesStatus.rateLimitedRequests}</div>
                <div className="api-stat-label">⚠️ Rate Limited</div>
              </div>
              <div className="api-stat forbidden">
                <div className="api-stat-value">{itunesStatus.forbiddenRequests}</div>
                <div className="api-stat-label">🚫 Forbidden</div>
              </div>
            </div>
            
            <div className="api-summary">
              <div className="api-summary-row">
                <span>Success Rate:</span>
                <span className={itunesStatus.successRate > 50 ? 'good' : itunesStatus.successRate > 0 ? 'warning' : 'bad'}>
                  {itunesStatus.successRate}%
                </span>
              </div>
              {itunesStatus.lastRequestTime && (
                <div className="api-summary-row">
                  <span>Last Request:</span>
                  <span>{new Date(itunesStatus.lastRequestTime).toLocaleTimeString()}</span>
                </div>
              )}
              {itunesStatus.duration > 0 && (
                <div className="api-summary-row">
                  <span>Session Duration:</span>
                  <span>{Math.round(itunesStatus.duration / 1000)}s</span>
                </div>
              )}
            </div>
            
            {itunesStatus.recentRequests && itunesStatus.recentRequests.length > 0 && (
              <div className="recent-requests">
                <h4>Recent Requests (Last 10)</h4>
                <div className="requests-list">
                  {itunesStatus.recentRequests.slice(0, 10).map((req, idx) => (
                    <div key={idx} className={`request-item ${req.status}`}>
                      <div className="request-song">{req.song}</div>
                      <div className="request-details">
                        <span className="request-status">
                          {req.status === 'success' && '✅'}
                          {req.status === 'rate_limited' && '⚠️ Rate Limited'}
                          {req.status === 'forbidden' && '🚫 Forbidden (403)'}
                          {req.status === 'non_json' && '❌ Non-JSON'}
                          {req.status === 'no_results' && '⭕ No Results'}
                          {req.status === 'error' && '❌ Error'}
                          {req.status === 'network_error' && '🌐 Network Error'}
                        </span>
                        <span className="request-time">
                          {new Date(req.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {req.error && <div className="request-error">{req.error}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {itunesStatus.forbiddenRequests > 10 && !itunesStatus.currentlyEnriching && (
              <div className="api-warning">
                <strong>⚠️ High Forbidden Rate Detected</strong>
                <p>iTunes API is blocking most requests. System is now using long-tail enrichment:</p>
                <ul>
                  <li><strong>3 random songs</strong> per 23-hour cycle</li>
                  <li><strong>60-120s random delays</strong> between requests</li>
                  <li><strong>5min pauses</strong> every 3 songs</li>
                  <li>Avoid pattern detection by randomizing song selection</li>
                  <li>Build database slowly over weeks instead of hours</li>
                </ul>
                <p style={{ marginTop: '0.5rem' }}><small>This approach minimizes blocking while gradually enriching your library. Focus on processing stems for immediate premium experience.</small></p>
              </div>
            )}
            
            {itunesStatus.currentlyEnriching && (
              <div className="api-info">
                <strong>⏳ Currently Enriching</strong>
                <p>Long-tail enrichment in progress. This will take 5-15 minutes for 3 songs with randomized delays to avoid detection.</p>
              </div>
            )}
          </div>
        )}



        <div className="admin-section">
          <h3>🎸 Stem Management</h3>
          <p className="admin-description">
            Download and process song stems from the library. 
            Stems enable progressive instrument revelation in gameplay.
          </p>
          
          {!stemServerAvailable && (
            <div className="admin-warning">
              ⚠️ Stem server not running. Start it with: <code>npm run stem-server</code>
            </div>
          )}
          
          {stemStatus && (
            <div className="stem-status">
              <p><strong>📊 Current Status:</strong> {stemStatus.processed} / {stemStatus.total} songs processed</p>
              <p><small>(You can process up to {stemStatus.total} songs. Add more to scripts/top-songs.json to expand the library.)</small></p>
              <button onClick={refreshStemStatus} className="admin-button small">
                🔄 Refresh Status
              </button>
            </div>
          )}
          
          {lastCompletedResults && !processingState?.isRunning && (
            <div className="processing-complete">
              <h4>✅ Processing Complete!</h4>
              <p>
                ✅ <strong>{lastCompletedResults.successful}</strong> new stems created | 
                ⏭️ <strong>{lastCompletedResults.skipped}</strong> already existed | 
                ❌ <strong>{lastCompletedResults.failed?.length || 0}</strong> failed
              </p>
              {lastCompletedResults.failed && lastCompletedResults.failed.length > 0 && (
                <details style={{ marginTop: '0.5rem' }}>
                  <summary>Show {lastCompletedResults.failed.length} failed songs (after 30 retries each)</summary>
                  <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', maxHeight: '300px', overflow: 'auto' }}>
                    {lastCompletedResults.failed.map((f, i) => (
                      <li key={i} style={{ marginBottom: '0.75rem' }}>
                        <small>
                          <strong>{f.song?.title}</strong> by {f.song?.artist}
                          <br/>
                          <span style={{ color: '#d32f2f' }}>→ {f.error}</span>
                        </small>
                      </li>
                    ))}
                  </ul>
                  <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#666' }}>
                    💡 Tip: These songs failed after 5 retry attempts with exponential backoff (up to 5 minutes per retry). 
                    The system now fails fast to test other songs and detect when iTunes rate limits lift.
                    You can try running the process again later - rate limits reset over time.
                  </p>
                </details>
              )}
            </div>
          )}
          
          {processingState && processingState.isRunning && (
            <div className="processing-progress">
              <p>🎵 Currently processing: <strong>{processingState.currentSong || 'Initializing...'}</strong></p>
              <p>Progress: {processingState.currentIndex + 1}/{processingState.totalCount} songs</p>
              <p><small>
                ✅ {processingState.results?.successful || 0} successful | 
                ⏭️ {processingState.results?.skipped || 0} skipped | 
                ❌ {processingState.results?.failed?.length || 0} failed
              </small></p>
              
              {/* Processing Pipeline Visualization */}
              <div className="processing-pipeline">
                <div className={`pipeline-stage ${processingState.currentStage === 'searching' ? 'active' : processingState.currentStage !== 'checking' ? 'complete' : ''}`}>
                  <div className="stage-icon">🔍</div>
                  <div className="stage-label">Search iTunes</div>
                  <div className="stage-desc">Get preview URL</div>
                </div>
                <div className="pipeline-arrow">→</div>
                <div className={`pipeline-stage ${processingState.currentStage === 'downloading' ? 'active' : processingState.currentStage === 'processing' || processingState.currentStage === 'complete' ? 'complete' : ''}`}>
                  <div className="stage-icon">⬇️</div>
                  <div className="stage-label">Download</div>
                  <div className="stage-desc">Get .m4a file</div>
                </div>
                <div className="pipeline-arrow">→</div>
                <div className={`pipeline-stage ${processingState.currentStage === 'processing' ? 'active' : processingState.currentStage === 'complete' ? 'complete' : ''}`}>
                  <div className="stage-icon">🎸</div>
                  <div className="stage-label">Separate</div>
                  <div className="stage-desc">AI stem generation</div>
                </div>
              </div>
              
              {processingState.statusMessage && (
                <div className="retry-banner">
                  {processingState.statusMessage}
                  {processingState.statusMessage.includes('retry') && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', opacity: 0.9 }}>
                      💡 iTunes is rate limiting requests. The system will automatically retry with increasing delays (5s → 300s max) up to 5 times per song before moving on.
                    </div>
                  )}
                </div>
              )}
              {processingState.results?.failed && processingState.results.failed.length > 0 && (
                <details style={{ marginTop: '0.75rem' }}>
                  <summary style={{ cursor: 'pointer', color: '#d32f2f', fontSize: '0.9rem' }}>
                    Show {processingState.results.failed.length} failed songs
                  </summary>
                  <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', maxHeight: '200px', overflow: 'auto' }}>
                    {processingState.results.failed.map((f, i) => (
                      <li key={i} style={{ marginBottom: '0.5rem' }}>
                        <small style={{ color: '#666' }}>
                          <strong>{f.song?.title}</strong> by {f.song?.artist}
                          <br/>
                          <span style={{ color: '#d32f2f' }}>→ {f.error}</span>
                        </small>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              
              <button 
                type="button"
                onClick={handleCancelProcessing} 
                className="admin-button danger small"
                style={{ marginTop: '1rem' }}
              >
                🛑 Cancel Processing
              </button>
            </div>
          )}
          
          <div className="stem-controls">
            {stemStatus && stemStatus.songs.filter(s => !s.hasStems).length > 0 && !isProcessing && (
              <div className="recommended-action">
                <p className="action-description">
                  <strong>📌 Recommended:</strong> Process all songs that are missing stems
                </p>
                <button 
                  type="button"
                  onClick={handleProcessMissingStems} 
                  className="admin-button primary-action"
                  disabled={!stemServerAvailable}
                >
                  🎸 Process {stemStatus.songs.filter(s => !s.hasStems).length} Songs Without Stems
                </button>
                <p className="action-note">
                  <small>This will automatically find and process only the songs that don't have stems yet.</small>
                </p>
              </div>
            )}
            
            <div className="itunes-api-toggle" style={{ 
              marginTop: '1.5rem', 
              padding: '1rem', 
              backgroundColor: itunesApiEnabled ? '#e8f5e9' : '#fff3e0',
              border: `1px solid ${itunesApiEnabled ? '#4caf50' : '#ff9800'}`,
              borderRadius: '8px',
              color: '#333'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <strong style={{ color: '#000' }}>🎵 iTunes API for New Songs</strong>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#555' }}>
                    {itunesApiEnabled 
                      ? '⚠️ Enabled - May encounter rate limiting after ~20 requests'
                      : '✅ Disabled - Prevents rate limiting (recommended for existing stems)'}
                  </p>
                </div>
                <label className="toggle-switch" style={{ marginLeft: '1rem' }}>
                  <input 
                    type="checkbox" 
                    checked={itunesApiEnabled}
                    onChange={(e) => handleToggleItunesApi(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
            
            <div style={{ marginTop: '1rem' }}>
              <button 
                onClick={handleViewNeedingItunes}
                className="admin-button"
                style={{ 
                  width: '100%',
                  backgroundColor: showNeedingItunes ? '#f5f5f5' : '#2196f3',
                  color: showNeedingItunes ? '#333' : 'white',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>
                  {showNeedingItunes ? '▼ Hide' : '▶ View'} Songs Without Stems
                </span>
                {songsNeedingItunes && (
                  <span style={{ fontSize: '0.85rem' }}>
                    {songsNeedingItunes.count} total 
                    {songsNeedingItunes.withUrls > 0 && ` (${songsNeedingItunes.withUrls} have URLs)`}
                  </span>
                )}
              </button>
              
              {showNeedingItunes && songsNeedingItunes && (
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '1.5rem', 
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  maxHeight: '500px',
                  overflowY: 'auto'
                }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>
                      📋 Songs Without Stems ({songsNeedingItunes.count} total)
                    </h4>
                    <div style={{ 
                      display: 'flex', 
                      gap: '1rem', 
                      fontSize: '0.85rem',
                      marginBottom: '1rem'
                    }}>
                      <span style={{ color: '#4caf50', fontWeight: 'bold' }}>
                        ✅ {songsNeedingItunes.withUrls} with iTunes URLs
                      </span>
                      <span style={{ color: '#ff9800', fontWeight: 'bold' }}>
                        ⚠️ {songsNeedingItunes.withoutUrls} need URLs
                      </span>
                    </div>
                  </div>
                  
                  {songsNeedingItunes.count === 0 ? (
                    <p style={{ fontStyle: 'italic', color: '#4caf50', margin: '0' }}>
                      ✅ All songs have either stems or iTunes URLs!
                    </p>
                  ) : (
                    <div>
                      {songsNeedingItunes.withUrls > 0 && (
                        <div style={{ marginBottom: '1.5rem' }}>
                          <h5 style={{ 
                            margin: '0 0 0.5rem 0', 
                            fontSize: '0.9rem',
                            color: '#4caf50',
                            borderBottom: '2px solid #4caf50',
                            paddingBottom: '0.25rem'
                          }}>
                            ✅ With iTunes URLs ({songsNeedingItunes.withUrls})
                          </h5>
                          <div style={{ fontSize: '0.85rem' }}>
                            {songsNeedingItunes.songs
                              .filter(s => s.hasAudio)
                              .map((song) => (
                                <div key={`${song.id}-${song.title}`} style={{ 
                                  marginBottom: '0.75rem',
                                  padding: '0.75rem',
                                  backgroundColor: '#f0f8f0',
                                  borderLeft: '3px solid #4caf50',
                                  borderRadius: '4px',
                                  color: '#333'
                                }}>
                                  <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', color: '#000' }}>
                                    #{song.id} {song.title}
                                  </div>
                                  <div style={{ color: '#666', marginBottom: '0.25rem' }}>
                                    by {song.artist}
                                  </div>
                                  <div style={{ 
                                    fontSize: '0.75rem', 
                                    color: '#2196f3',
                                    wordBreak: 'break-all',
                                    fontFamily: 'monospace',
                                    backgroundColor: '#fff',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '3px',
                                    border: '1px solid #e0e0e0'
                                  }}>
                                    {song.audioUrl}
                                  </div>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      )}
                      
                      {songsNeedingItunes.withoutUrls > 0 && (
                        <div>
                          <h5 style={{ 
                            margin: '0 0 0.5rem 0', 
                            fontSize: '0.9rem',
                            color: '#ff9800',
                            borderBottom: '2px solid #ff9800',
                            paddingBottom: '0.25rem'
                          }}>
                            ⚠️ Missing iTunes URLs ({songsNeedingItunes.withoutUrls})
                          </h5>
                          <div style={{ fontSize: '0.85rem' }}>
                            {songsNeedingItunes.songs
                              .filter(s => !s.hasAudio)
                              .map((song) => (
                                <div key={`${song.id}-${song.title}`} style={{ 
                                  marginBottom: '0.5rem',
                                  padding: '0.5rem 0.75rem',
                                  backgroundColor: '#fff8e1',
                                  borderLeft: '3px solid #ff9800',
                                  borderRadius: '4px',
                                  color: '#333'
                                }}>
                                  <div>
                                    <strong style={{ color: '#000' }}>#{song.id}</strong> <span style={{ color: '#000' }}>{song.title}</span> <span style={{ color: '#666', fontSize: '0.9em' }}>by {song.artist}</span>
                                  </div>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="manual-action" style={{ marginTop: stemStatus?.songs.filter(s => !s.hasStems).length > 0 ? '2rem' : '0', paddingTop: stemStatus?.songs.filter(s => !s.hasStems).length > 0 ? '2rem' : '0', borderTop: stemStatus?.songs.filter(s => !s.hasStems).length > 0 ? '1px solid #ddd' : 'none' }}>
              <p className="action-description">
                <strong>Advanced:</strong> Process a specific number of songs (starts from beginning of list)
              </p>
              <label htmlFor="stem-count">
                Process up to <input 
                  id="stem-count"
                  type="number" 
                  min="1" 
                  max="2500" 
                  value={stemCount || ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : parseInt(e.target.value)
                    setStemCount(val)
                  }}
                  onBlur={() => {
                    // Reset to 10 if empty when user leaves field
                    if (stemCount === '') setStemCount(10)
                  }}
                  className="stem-count-input"
                /> songs
              </label>
              
              {stemCount > 2500 && (
                <div className="admin-error">
                  ⚠️ Maximum is 2500 songs
                </div>
              )}
              {stemCount < 1 && stemCount !== '' && (
                <div className="admin-error">
                  ⚠️ Minimum is 1 song
                </div>
              )}
              
              <button 
                type="button"
                onClick={handleProcessStems} 
                className="admin-button"
                disabled={!stemServerAvailable || isProcessing}
              >
                {isProcessing ? '⏳ Processing...' : '🎵 Process from Start of List'}
              </button>
              <p className="action-note">
                <small>Note: This may re-process songs that already have stems (they'll be skipped quickly).</small>
              </p>
            </div>
            
            {(lastCompletedResults?.failed?.length > 0 || processingState?.results?.failed?.length > 0) && !isProcessing && (
              <button 
                type="button"
                onClick={handleRetryFailedSongs} 
                className="admin-button retry-button"
                disabled={!stemServerAvailable}
                style={{ marginTop: '1rem' }}
              >
                🔄 Retry {lastCompletedResults?.failed?.length || processingState?.results?.failed?.length} Failed Songs
              </button>
            )}
          </div>
          
          <p className="admin-note">
            <small>
              ℹ️ Processing time: ~10 seconds per song. Already processed songs will be skipped.
              Stems are stored in <code>public/audio/stems</code>. 
              To add more songs, edit <code>scripts/top-songs.json</code>.
            </small>
          </p>
        </div>

        <div className="admin-section danger-zone" style={{
          backgroundColor: '#ffebee',
          border: '4px solid #d32f2f',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(211, 47, 47, 0.3)',
          marginTop: '3rem',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: '-20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#d32f2f',
            color: 'white',
            padding: '0.5rem 2rem',
            borderRadius: '20px',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            border: '3px solid #b71c1c'
          }}>
            {dangerZoneUnlocked ? '🔓 UNLOCKED' : '🔒 LOCKED'} DANGER ZONE {dangerZoneUnlocked ? '🔓' : '🔒'}
          </div>
          
          <div style={{ paddingTop: '2rem' }}>
            <h3 style={{ 
              color: '#b71c1c', 
              fontSize: '1.3rem',
              textAlign: 'center',
              margin: '0 0 1rem 0',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Advanced Operations - Use With Caution
            </h3>

            {!dangerZoneUnlocked ? (
              // PIN Entry Screen
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                backgroundColor: '#fff',
                borderRadius: '8px',
                border: '3px solid #d32f2f'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                <p style={{ 
                  fontSize: '1.1rem', 
                  fontWeight: 600, 
                  marginBottom: '1.5rem',
                  color: '#333'
                }}>
                  Enter PIN to unlock Danger Zone
                </p>
                <div style={{ marginBottom: '1rem' }}>
                  <input
                    type="password"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleUnlockDangerZone()
                      }
                    }}
                    placeholder="Enter PIN"
                    maxLength="6"
                    style={{
                      padding: '0.75rem 1rem',
                      fontSize: '1.5rem',
                      width: '200px',
                      textAlign: 'center',
                      letterSpacing: '0.5rem',
                      border: '2px solid #d32f2f',
                      borderRadius: '8px',
                      fontFamily: 'monospace'
                    }}
                    autoFocus
                  />
                </div>
                <button 
                  onClick={handleUnlockDangerZone}
                  style={{
                    padding: '0.75rem 2rem',
                    fontSize: '1rem',
                    fontWeight: 600,
                    backgroundColor: '#d32f2f',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  🔓 Unlock
                </button>
                <p style={{ 
                  marginTop: '1.5rem', 
                  fontSize: '0.85rem', 
                  color: '#666',
                  fontStyle: 'italic'
                }}>
                  Set PIN in .env.local (VITE_DANGER_ZONE_PIN)
                </p>
              </div>
            ) : (
              // Unlocked - Show Danger Zone Controls
              <>
                <div style={{
                  textAlign: 'center',
                  marginBottom: '1.5rem'
                }}>
                  <button
                    onClick={handleLockDangerZone}
                    style={{
                      padding: '0.5rem 1.5rem',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      backgroundColor: '#4caf50',
                      color: 'white',
                      border: '2px solid #388e3c',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    🔒 Lock Danger Zone
                  </button>
                </div>

                <p className="admin-description" style={{ 
                  color: '#c62828', 
                  fontWeight: 600,
                  textAlign: 'center',
                  fontSize: '0.95rem',
                  backgroundColor: '#fff',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '2px solid #ef5350'
                }}>
                  ⚠️ These operations can trigger backend processing or permanently delete data ⚠️
                </p>
          
                <div style={{ 
                  marginTop: '1.5rem',
                  padding: '1rem',
                  backgroundColor: '#fff',
                  borderRadius: '6px',
                  border: '2px solid #ffcdd2'
                }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 600 }}>Frontend Cache Operations</h4>
                  <p className="admin-description" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                    Clear cached data in your browser. Safe - backend data remains intact.
                  </p>
                  <button onClick={handleClearCache} className="admin-button" style={{ marginBottom: '0.5rem' }}>
                    🗑️ Clear Song Cache
                  </button>
                  <p style={{ fontSize: '0.75rem', color: '#666', margin: 0 }}>
                    Forces reload from backend. Use if songs aren't loading properly.
                  </p>
                </div>

                {stemServerAvailable && (
                  <div style={{ 
                    marginTop: '1rem',
                    padding: '1rem',
                    backgroundColor: '#fff9e6',
                    borderRadius: '6px',
                    border: '2px solid #ff9800'
                  }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 600, color: '#e65100' }}>⚠️ Backend Operations</h4>
                    <p className="admin-description" style={{ fontSize: '0.85rem', marginBottom: '0.75rem', color: '#e65100' }}>
                      <strong>CAUTION:</strong> Triggers backend processing. May cause iTunes rate limiting.
                    </p>
                    <button onClick={handleRefreshEnrichment} className="admin-button" style={{
                      backgroundColor: '#ff9800',
                      color: 'white',
                      border: '2px solid #f57c00'
                    }}>
                      🔄 Refresh Backend Enrichment
                    </button>
                    <p style={{ fontSize: '0.75rem', color: '#666', margin: '0.5rem 0 0 0' }}>
                      Re-scans stems and retries iTunes API. Backend auto-refreshes every 23 hours anyway.
                    </p>
                  </div>
                )}

                <div style={{ 
                  marginTop: '1rem',
                  padding: '1.25rem',
                  backgroundColor: '#ffcdd2',
                  borderRadius: '6px',
                  border: '3px solid #d32f2f'
                }}>
                  <h4 style={{ 
                    margin: '0 0 0.75rem 0', 
                    fontSize: '1.1rem', 
                    fontWeight: 700, 
                    color: '#b71c1c',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    🚨 Destructive Operations - Cannot Be Undone
                  </h4>
                  <p className="admin-description" style={{ 
                    fontSize: '0.9rem', 
                    marginBottom: '1rem', 
                    color: '#c62828',
                    fontWeight: 600,
                    backgroundColor: '#fff',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '2px solid #ef5350'
                  }}>
                    ⛔ WARNING: These actions permanently delete data!<br/>
                    <small style={{ fontSize: '0.85rem' }}>You will be asked to type a confirmation phrase.</small>
                  </p>
                  <button onClick={handleClearStats} className="admin-button danger" style={{ 
                    marginBottom: '0.75rem',
                    fontSize: '1rem',
                    fontWeight: 600
                  }}>
                    ⚠️ Clear All Stats
                  </button>
                  <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: '1.25rem', paddingLeft: '0.5rem' }}>
                    Deletes all game statistics and progress history. (Type "DELETE")
                  </p>
                  <button onClick={handleClearAllCache} className="admin-button danger" style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    backgroundColor: '#b71c1c',
                    borderColor: '#7f0000'
                  }}>
                    💥 Clear Everything & Reload
                  </button>
                  <p style={{ fontSize: '0.75rem', color: '#666', margin: '0.5rem 0 0 0', paddingLeft: '0.5rem' }}>
                    Nuclear option: Clears ALL browser cache. (Type "DELETE EVERYTHING")
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {message && (
          <div className="admin-message">
            {message}
          </div>
        )}

        <div className="admin-info">
          <h3>Debug Info</h3>
          <p>Cache Items: {localStorage.getItem('band_on_the_run_enriched_songs') ? 'Present' : 'None'}</p>
          <p>Stats: {localStorage.getItem('band_on_the_run_stats') ? 'Present' : 'None'}</p>
          <p>Daily Result: {localStorage.getItem('band_on_the_run_daily') ? 'Present' : 'None'}</p>
        </div>
      </div>
    </div>
  )
}

export default Admin
