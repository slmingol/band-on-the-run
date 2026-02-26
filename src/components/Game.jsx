import { useState, useEffect, useRef } from 'react'
import './Game.css'
import { getSongForDay, getRandomSong, saveDailyResult, saveStats } from '../utils/gameLogic'

function Game({ mode, onBack, onShowStats }) {
  const [currentSong, setCurrentSong] = useState(null)
  const [currentInstrument, setCurrentInstrument] = useState(0)
  const [guesses, setGuesses] = useState([])
  const [isGameOver, setIsGameOver] = useState(false)
  const [hasWon, setHasWon] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    // Load song based on mode
    if (mode === 'daily') {
      setCurrentSong(getSongForDay())
    } else {
      setCurrentSong(getRandomSong())
    }
  }, [mode])

  const maxInstruments = currentSong?.instruments?.length || 6

  const playAudio = () => {
    if (audioRef.current && currentSong) {
      // In a real implementation, this would play the audio up to currentInstrument layers
      audioRef.current.play()
      setIsPlaying(true)
      
      audioRef.current.onended = () => {
        setIsPlaying(false)
      }
    }
  }

  const handleGuess = (songTitle) => {
    const newGuesses = [...guesses, songTitle]
    setGuesses(newGuesses)

    if (songTitle === currentSong.title) {
      // Win!
      setHasWon(true)
      setIsGameOver(true)
      
      // Save stats
      const result = {
        attempts: newGuesses.length,
        instrumentsUsed: currentInstrument + 1,
        date: new Date().toISOString().split('T')[0]
      }
      
      if (mode === 'daily') {
        saveDailyResult(result)
      }
      saveStats(result)
    } else if (currentInstrument < maxInstruments - 1) {
      // Reveal next instrument
      setCurrentInstrument(currentInstrument + 1)
    } else {
      // Lost!
      setIsGameOver(true)
      setHasWon(false)
    }
    
    setSearchTerm('')
  }

  const filteredSongs = currentSong?.songList?.filter(song =>
    song.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const skipInstrument = () => {
    if (currentInstrument < maxInstruments - 1) {
      setCurrentInstrument(currentInstrument + 1)
      setGuesses([...guesses, 'SKIPPED'])
    }
  }

  const shareResult = () => {
    const instrumentEmojis = currentSong.instruments.slice(0, currentInstrument + 1).map(() => '🎵').join('')
    const result = `Bandle ${mode === 'daily' ? '🎯' : '🎮'}\n` +
                   `${hasWon ? '✅' : '❌'} ${guesses.length}/${maxInstruments} attempts\n` +
                   `${instrumentEmojis}\n` +
                   `${window.location.href}`
    
    navigator.clipboard.writeText(result)
    alert('Result copied to clipboard!')
  }

  if (!currentSong) {
    return <div className="game loading">Loading...</div>
  }

  return (
    <div className="game">
      <div className="game-container">
        <div className="game-header">
          <button onClick={onBack} className="back-button">← Back</button>
          <h2>{mode === 'daily' ? '🎯 Daily Bandle' : '🎮 Practice Mode'}</h2>
        </div>

        <div className="instruments-display">
          <h3>Instruments Revealed: {currentInstrument + 1}/{maxInstruments}</h3>
          <div className="instruments-list">
            {currentSong.instruments.map((instrument, idx) => (
              <span 
                key={idx}
                className={`instrument ${idx <= currentInstrument ? 'revealed' : 'hidden'}`}
              >
                {idx <= currentInstrument ? instrument : '🔒'}
              </span>
            ))}
          </div>
        </div>

        <div className="audio-player">
          <button 
            onClick={playAudio} 
            className="play-button"
            disabled={isPlaying}
          >
            {isPlaying ? '⏸️ Playing...' : '▶️ Play'}
          </button>
          <audio ref={audioRef} src={currentSong.audioUrl} />
        </div>

        <div className="guesses-display">
          <h4>Your Guesses: {guesses.length}</h4>
          <div className="guesses-list">
            {guesses.map((guess, idx) => (
              <div 
                key={idx} 
                className={`guess ${guess === currentSong.title ? 'correct' : 'wrong'}`}
              >
                {guess === 'SKIPPED' ? '⏭️ Skipped' : guess}
              </div>
            ))}
          </div>
        </div>

        {!isGameOver && (
          <div className="guess-input">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for a song..."
              className="search-input"
            />
            
            {searchTerm && (
              <div className="song-suggestions">
                {filteredSongs.slice(0, 10).map((song, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleGuess(song)}
                    className="suggestion-button"
                  >
                    {song}
                  </button>
                ))}
              </div>
            )}
            
            <button 
              onClick={skipInstrument}
              className="skip-button"
              disabled={currentInstrument >= maxInstruments - 1}
            >
              ⏭️ Skip to Next Instrument
            </button>
          </div>
        )}

        {isGameOver && (
          <div className={`game-result ${hasWon ? 'win' : 'lose'}`}>
            <h2>{hasWon ? '🎉 Congratulations!' : '😢 Game Over'}</h2>
            <p className="result-song">The song was: <strong>{currentSong.title}</strong></p>
            <p className="result-artist">by {currentSong.artist}</p>
            {hasWon && (
              <p className="result-stats">
                You guessed it in {guesses.length} {guesses.length === 1 ? 'attempt' : 'attempts'} 
                with {currentInstrument + 1} {currentInstrument + 1 === 1 ? 'instrument' : 'instruments'}!
              </p>
            )}
            
            <div className="result-actions">
              <button onClick={shareResult} className="share-button">
                📋 Share Result
              </button>
              <button onClick={onShowStats} className="stats-button">
                📊 View Stats
              </button>
              <button onClick={onBack} className="menu-button">
                🏠 Back to Menu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Game
