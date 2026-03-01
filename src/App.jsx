import { useState, useEffect } from 'react'
import './App.css'
import Game from './components/Game'
import Menu from './components/Menu'
import Stats from './components/Stats'
import Admin from './components/Admin'
import StemStatus from './components/StemStatus'
import LibraryStats from './components/LibraryStats'
import { preloadSongs } from './utils/gameLogic'
import { useTheme } from './utils/useTheme'

function App() {
  const [currentView, setCurrentView] = useState('menu') // menu, daily, practice, stats, admin
  const [gameMode, setGameMode] = useState(null)
  const [isPreloading, setIsPreloading] = useState(true)
  const [version, setVersion] = useState('1.0.0')
  const { themePreference, effectiveTheme, setTheme } = useTheme()

  // Fetch version from version.json
  useEffect(() => {
    fetch('/version.json')
      .then(res => res.json())
      .then(data => setVersion(data.version))
      .catch(() => setVersion('1.0.0'))
  }, [])

  // Preload songs in background on app startup
  useEffect(() => {
    const loadSongs = async () => {
      await preloadSongs()
      setIsPreloading(false)
    }
    loadSongs()
  }, [])

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

  const showAdmin = () => {
    setCurrentView('admin')
  }

  return (
    <div className="app">
      <StemStatus />
      <LibraryStats />
      
      <header className="app-header">
        <h1>🎵 Band on the Run</h1>
        <p className="tagline">Guess the song, one instrument at a time!</p>
      </header>

      {currentView === 'menu' && (
        <Menu onStartGame={startGame} onShowStats={showStats} onShowAdmin={showAdmin} />
      )}

      {(currentView === 'daily' || currentView === 'practice') && (
        <Game mode={gameMode} onBack={backToMenu} onShowStats={showStats} />
      )}

      {currentView === 'stats' && (
        <Stats onBack={backToMenu} />
      )}

      {currentView === 'admin' && (
        <Admin 
          onBack={backToMenu}
          themePreference={themePreference}
          effectiveTheme={effectiveTheme}
          onThemeChange={setTheme}
        />
      )}

      {isPreloading && (
        <div className="preload-status">🎵 Loading song library...</div>
      )}

      <footer className="app-footer">
        <div className="version-info">
          © {new Date().getFullYear()} Band on the Run
          <span className="version-number">v{version}</span>
        </div>
      </footer>
    </div>
  )
}

export default App
