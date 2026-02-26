import { useState, useEffect } from 'react'
import './App.css'
import Game from './components/Game'
import Menu from './components/Menu'
import Stats from './components/Stats'

function App() {
  const [currentView, setCurrentView] = useState('menu') // menu, daily, practice, stats
  const [gameMode, setGameMode] = useState(null)

  const startGame = (mode) => {
    setGameMode(mode)
    setCurrentView(mode)
  }

  const backToMenu = () => {
    setCurrentView('menu')
    setGameMode(null)
  }

  const showStats = () => {
    setCurrentView('stats')
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎵 Bandle</h1>
        <p className="tagline">Guess the song, one instrument at a time!</p>
      </header>

      {currentView === 'menu' && (
        <Menu onStartGame={startGame} onShowStats={showStats} />
      )}

      {(currentView === 'daily' || currentView === 'practice') && (
        <Game mode={gameMode} onBack={backToMenu} onShowStats={showStats} />
      )}

      {currentView === 'stats' && (
        <Stats onBack={backToMenu} />
      )}

      <footer className="app-footer">
        <p>Made with ❤️ | v0.1.0</p>
      </footer>
    </div>
  )
}

export default App
