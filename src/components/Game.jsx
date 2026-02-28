import { useState, useEffect, useRef } from 'react'
import './Game.css'
import { getSongForDay, getRandomSong, saveDailyResult, saveStats } from '../utils/gameLogic'

function Game({ mode, onBack, onShowStats }) {
  const [currentSong, setCurrentSong] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [currentInstrument, setCurrentInstrument] = useState(0)
  const [guesses, setGuesses] = useState([])
  const [isGameOver, setIsGameOver] = useState(false)
  const [hasWon, setHasWon] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef(null)
  
  // Web Audio API refs for frequency filtering
  const audioContextRef = useRef(null)
  const sourceNodeRef = useRef(null)
  const filtersRef = useRef([])
  const gainNodeRef = useRef(null)

  useEffect(() => {
    // Load song based on mode (now async with Spotify integration)
    const loadSong = async () => {
      try {
        setLoadError(null)
        setCurrentSong(null)
        
        if (mode === 'daily') {
          const song = await getSongForDay()
          console.log('📀 Daily song loaded:', song.title, 'by', song.artist)
          console.log('🎵 Has audio URL:', !!song.audioUrl)
          setCurrentSong(song)
        } else {
          const song = await getRandomSong()
          console.log('📀 Practice song loaded:', song.title, 'by', song.artist)
          console.log('🎵 Has audio URL:', !!song.audioUrl)
          setCurrentSong(song)
        }
      } catch (error) {
        console.error('❌ Failed to load song:', error)
        setLoadError(error.message || 'Failed to load song. Please try again.')
      }
    }
    
    loadSong()
  }, [mode])

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  // Setup Web Audio API with frequency filters
  const setupAudioFilters = () => {
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      audioContextRef.current = new AudioContext()
    }

    const context = audioContextRef.current
    const audioElement = audioRef.current

    // Create source node if it doesn't exist
    if (!sourceNodeRef.current) {
      sourceNodeRef.current = context.createMediaElementSource(audioElement)
    }

    // Define frequency bands for "instruments"
    // Each band represents a different part of the mix
    const frequencyBands = [
      { name: '🎸 Bass', type: 'lowpass', frequency: 250, Q: 1.0 },      // Only bass frequencies
      { name: '🥁 Low-Mids', type: 'bandpass', frequency: 500, Q: 1.0 }, // Add mid-low frequencies
      { name: '🎹 Mids', type: 'bandpass', frequency: 1500, Q: 1.0 },    // Add mid frequencies
      { name: '🎤 Vocals', type: 'bandpass', frequency: 3000, Q: 1.0 },  // Add vocal range
      { name: '🎺 Highs', type: 'highpass', frequency: 4000, Q: 1.0 },   // Add high frequencies
      { name: '✨ Full Mix', type: 'allpass', frequency: 1000, Q: 1.0 }  // Full frequency range
    ]

    // Clear existing filters
    filtersRef.current.forEach(filter => filter.disconnect())
    filtersRef.current = []

    // Create filter chain based on current instrument level
    let previousNode = sourceNodeRef.current

    // Create a combined filter based on revealed instruments
    if (currentInstrument === 0) {
      // Only bass frequencies
      const filter = context.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 250
      filter.Q.value = 1.0
      previousNode.connect(filter)
      previousNode = filter
      filtersRef.current.push(filter)
    } else if (currentInstrument === 1) {
      // Bass + low-mids
      const filter = context.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 800
      filter.Q.value = 1.0
      previousNode.connect(filter)
      previousNode = filter
      filtersRef.current.push(filter)
    } else if (currentInstrument === 2) {
      // Bass + low-mids + mids
      const filter = context.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 2000
      filter.Q.value = 1.0
      previousNode.connect(filter)
      previousNode = filter
      filtersRef.current.push(filter)
    } else if (currentInstrument === 3) {
      // Bass + mids + vocals
      const filter = context.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 4000
      filter.Q.value = 1.0
      previousNode.connect(filter)
      previousNode = filter
      filtersRef.current.push(filter)
    } else if (currentInstrument === 4) {
      // Almost full mix (slight high cut)
      const filter = context.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 8000
      filter.Q.value = 1.0
      previousNode.connect(filter)
      previousNode = filter
      filtersRef.current.push(filter)
    }
    // else: Full mix (no filter)

    // Create gain node for volume control
    if (!gainNodeRef.current) {
      gainNodeRef.current = context.createGain()
    }
    
    previousNode.connect(gainNodeRef.current)
    gainNodeRef.current.connect(context.destination)
  }

  const maxInstruments = 6 // Fixed to 6 frequency bands

  const playAudio = async () => {
    if (audioRef.current && currentSong) {
      console.log('🎵 Attempting to play:', currentSong.title)
      console.log('📍 Audio URL:', currentSong.audioUrl)
      console.log('🎚️ Current instrument level:', currentInstrument)
      
      if (!currentSong.audioUrl) {
        console.error('❌ No audio URL available for this song!')
        alert('Sorry, no audio preview available for this song.')
        setIsPlaying(false)
        return
      }
      
      try {
        // Setup or update audio filters
        setupAudioFilters()
        
        // Resume audio context if suspended (browser autoplay policy)
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume()
        }
        
        await audioRef.current.play()
        setIsPlaying(true)
        console.log('✅ Audio playing with filter level:', currentInstrument)
        
        audioRef.current.onended = () => {
          setIsPlaying(false)
        }
      } catch (error) {
        console.error('❌ Audio playback failed:', error)
        alert(`Failed to play audio: ${error.message}`)
        setIsPlaying(false)
      }
    }
  }

  // Update filters when instrument level changes
  useEffect(() => {
    if (isPlaying && audioContextRef.current) {
      // Pause, update filters, and resume
      const wasPlaying = !audioRef.current.paused
      if (wasPlaying) {
        audioRef.current.pause()
      }
      
      // Disconnect old filters
      if (filtersRef.current.length > 0) {
        filtersRef.current.forEach(filter => filter.disconnect())
        if (gainNodeRef.current) {
          gainNodeRef.current.disconnect()
        }
      }
      
      // Setup new filters
      setupAudioFilters()
      
      if (wasPlaying) {
        audioRef.current.play()
      }
    }
  }, [currentInstrument])

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
    const frequencyEmojis = ['🎸', '🥁', '🎹', '🎤', '🎺', '✨']
      .slice(0, currentInstrument + 1)
      .join('')
    const result = `Band on the Run ${mode === 'daily' ? '🎯' : '🎮'}\n` +
                   `${hasWon ? '✅' : '❌'} ${guesses.length}/${maxInstruments} attempts\n` +
                   `${frequencyEmojis}\n` +
                   `${window.location.href}`
    
    navigator.clipboard.writeText(result)
    alert('Result copied to clipboard!')
  }

  if (loadError) {
    return (
      <div className="game error-state">
        <div className="error-message">
          <h2>❌ Error</h2>
          <p>{loadError}</p>
          <button onClick={onBack} className="back-button">← Back to Menu</button>
        </div>
      </div>
    )
  }

  if (!currentSong) {
    return <div className="game loading">Loading...</div>
  }

  return (
    <div className="game">
      <div className="game-container">
        <div className="game-header">
          <button onClick={onBack} className="back-button">← Back</button>
          <h2>{mode === 'daily' ? '🎯 Daily Challenge' : '🎮 Practice Mode'}</h2>
        </div>

        <div className="instruments-display">
          <h3>Frequencies Revealed: {currentInstrument + 1}/{maxInstruments}</h3>
          <div className="instruments-list">
            {['🎸 Bass', '🥁 Low-Mids', '🎹 Mids', '🎤 Vocals', '🎺 Highs', '✨ Full Mix'].map((instrument, idx) => (
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
              ⏭️ Reveal More Frequencies
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
                with {currentInstrument + 1} {currentInstrument + 1 === 1 ? 'frequency band' : 'frequency bands'}!
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
