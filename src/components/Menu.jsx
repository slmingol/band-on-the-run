import { useState, useEffect } from 'react'
import './Menu.css'

const INSTRUCTIONS_DISMISSED_KEY = 'band_on_the_run_instructions_dismissed'

function Menu({ onStartGame, onShowStats, onShowAdmin }) {
  const [showInstructions, setShowInstructions] = useState(true)

  useEffect(() => {
    const dismissed = localStorage.getItem(INSTRUCTIONS_DISMISSED_KEY)
    if (dismissed === 'true') {
      setShowInstructions(false)
    }
  }, [])

  const dismissInstructions = () => {
    setShowInstructions(false)
    localStorage.setItem(INSTRUCTIONS_DISMISSED_KEY, 'true')
  }

  const showInstructionsAgain = () => {
    setShowInstructions(true)
  }

  return (
    <div className="menu">
      <div className="menu-container">
        {!showInstructions && (
          <button className="show-instructions-link" onClick={showInstructionsAgain}>
            ❓ How to Play
          </button>
        )}

        {showInstructions && (
          <div className="instructions-banner">
            <button className="close-instructions" onClick={dismissInstructions} aria-label="Dismiss instructions">
              ×
            </button>
            <h3>🎵 How to Play</h3>
            <ol>
              <li>Listen to the first instrument</li>
              <li>Guess the song from the list</li>
              <li>Each wrong guess reveals another instrument</li>
              <li>Try to guess with as few instruments as possible!</li>
            </ol>
          </div>
        )}

        <div className="menu-buttons">
          <button 
            className="menu-button primary"
            onClick={() => onStartGame('daily')}
          >
            🎯 Daily Challenge
          </button>
          
          <button 
            className="menu-button"
            onClick={() => onStartGame('practice')}
          >
            🎮 Practice Mode
          </button>
          
          <button 
            className="menu-button"
            onClick={onShowStats}
          >
            📊 Your Stats
          </button>
          
          <button 
            className="menu-button secondary"
            onClick={onShowAdmin}
          >
            ⚙️ Admin
          </button>
        </div>
      </div>
    </div>
  )
}

export default Menu
