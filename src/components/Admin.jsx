import { useState } from 'react'
import './Admin.css'
import { clearSpotifyCache } from '../utils/gameLogic'

function Admin({ onBack }) {
  const [message, setMessage] = useState('')

  const handleClearCache = () => {
    clearSpotifyCache()
    setMessage('✅ Cache cleared! Songs will be reloaded on next game.')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleClearStats = () => {
    if (confirm('Are you sure you want to clear all stats? This cannot be undone.')) {
      localStorage.removeItem('bandle_stats')
      localStorage.removeItem('bandle_daily')
      setMessage('✅ Stats cleared!')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  return (
    <div className="admin">
      <div className="admin-container">
        <div className="admin-header">
          <button onClick={onBack} className="back-button">← Back</button>
          <h2>⚙️ Admin Settings</h2>
        </div>

        <div className="admin-section">
          <h3>Cache Management</h3>
          <p className="admin-description">
            Clear the song cache to force reload from Deezer API. Use this if songs aren't loading properly.
          </p>
          <button onClick={handleClearCache} className="admin-button">
            🗑️ Clear Song Cache
          </button>
        </div>

        <div className="admin-section">
          <h3>Statistics</h3>
          <p className="admin-description">
            Clear all your game statistics and progress. This will reset everything.
          </p>
          <button onClick={handleClearStats} className="admin-button danger">
            ⚠️ Clear All Stats
          </button>
        </div>

        {message && (
          <div className="admin-message">
            {message}
          </div>
        )}

        <div className="admin-info">
          <h3>Debug Info</h3>
          <p>Cache Items: {localStorage.getItem('bandle_enriched_songs') ? 'Present' : 'None'}</p>
          <p>Stats: {localStorage.getItem('bandle_stats') ? 'Present' : 'None'}</p>
          <p>Daily Result: {localStorage.getItem('bandle_daily') ? 'Present' : 'None'}</p>
        </div>
      </div>
    </div>
  )
}

export default Admin
