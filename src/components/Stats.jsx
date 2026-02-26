import { useState, useEffect } from 'react'
import './Stats.css'
import { getStats } from '../utils/gameLogic'

function Stats({ onBack }) {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    setStats(getStats())
  }, [])

  if (!stats) {
    return <div className="stats loading">Loading stats...</div>
  }

  return (
    <div className="stats">
      <div className="stats-container">
        <div className="stats-header">
          <button onClick={onBack} className="back-button">← Back</button>
          <h2>📊 Your Stats</h2>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.gamesPlayed}</div>
            <div className="stat-label">Games Played</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{stats.gamesWon}</div>
            <div className="stat-label">Games Won</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{stats.winRate}%</div>
            <div className="stat-label">Win Rate</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{stats.currentStreak}</div>
            <div className="stat-label">Current Streak</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{stats.maxStreak}</div>
            <div className="stat-label">Max Streak</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{stats.avgInstruments}</div>
            <div className="stat-label">Avg Instruments</div>
          </div>
        </div>

        <div className="guess-distribution">
          <h3>Guess Distribution</h3>
          {Object.entries(stats.guessDistribution).map(([attempts, count]) => (
            <div key={attempts} className="distribution-row">
              <div className="distribution-label">{attempts}</div>
              <div className="distribution-bar-container">
                <div 
                  className="distribution-bar"
                  style={{ width: `${(count / Math.max(...Object.values(stats.guessDistribution))) * 100}%` }}
                >
                  <span className="distribution-count">{count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Stats
