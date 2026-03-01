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
  const [songNumber, setSongNumber] = useState(1)
  
  // Refs for stem audio elements
  const bassAudioRef = useRef(null)
  const drumsAudioRef = useRef(null)
  const vocalsAudioRef = useRef(null)
  const otherAudioRef = useRef(null)
  
  // Single audio ref for songs without stems (iTunes URLs)
  const singleAudioRef = useRef(null)

  // Handle Escape key to go back
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
    // Reset song number when mode changes
    setSongNumber(1)
    
    // Load song based on mode
    const loadSong = async () => {
      try {
        setLoadError(null)
        setCurrentSong(null)
        
        if (mode === 'daily') {
          const song = await getSongForDay()
          console.log('📀 Daily song loaded:', song.title, 'by', song.artist)
          console.log('🎵 Has stems:', !!song.stems)
          console.log('🎵 Has audio URL:', !!song.audioUrl)
          setCurrentSong(song)
        } else {
          const song = await getRandomSong()
          console.log('📀 Practice song loaded:', song.title, 'by', song.artist)
          console.log('🎵 Has stems:', !!song.stems)
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

  const loadNextSong = async () => {
    // Increment song number
    setSongNumber(prev => prev + 1)
    
    // Reset game state
    setGuesses([])
    setIsGameOver(false)
    setHasWon(false)
    setCurrentInstrument(0)
    setSearchTerm('')
    setIsPlaying(false)
    
    // Pause any playing audio
    pauseAudio()
    
    // Load new random song
    try {
      setLoadError(null)
      setCurrentSong(null)
      
      const song = await getRandomSong()
      console.log('📀 Next practice song loaded:', song.title, 'by', song.artist)
      console.log('🎵 Has stems:', !!song.stems)
      console.log('🎵 Has audio URL:', !!song.audioUrl)
      setCurrentSong(song)
    } catch (error) {
      console.error('❌ Failed to load next song:', error)
      setLoadError(error.message || 'Failed to load song. Please try again.')
    }
  }

  const maxInstruments = 4 // Bass, Drums, Vocals, Other (full mix)

  const playAudio = async () => {
    if (!currentSong) return

    console.log('🎵 Attempting to play:', currentSong.title)
    console.log('🎵 Has stems:', !!currentSong.stems)
    console.log('🎚️ Current instrument level:', currentInstrument)
    
    try {
      if (currentSong.stems) {
        // This song has separated stems - play progressively
        const stemRefs = [bassAudioRef, drumsAudioRef, vocalsAudioRef, otherAudioRef]
        const stemNames = ['🎸 Bass', '🥁 Drums', '🎤 Vocals', '🎹 Other']
        
        // Play stems up to current instrument level
        for (let i = 0; i <= currentInstrument && i < stemRefs.length; i++) {
          if (stemRefs[i].current) {
            console.log(`▶️  Playing ${stemNames[i]}`)
            await stemRefs[i].current.play()
          }
        }
        
        // Set up onended handler on the bass track (all stems end together)
        if (bassAudioRef.current) {
          bassAudioRef.current.onended = () => {
            setIsPlaying(false)
          }
        }
      } else {
        // Fallback to single audio URL for songs without stems
        if (!currentSong.audioUrl) {
          console.error('❌ No audio URL available for this song!')
          alert('Sorry, no audio preview available for this song.')
          setIsPlaying(false)
          return
        }
        
        if (singleAudioRef.current) {
          console.log('🎵 Playing single audio (no stems available)')
          await singleAudioRef.current.play()
          
          singleAudioRef.current.onended = () => {
            setIsPlaying(false)
          }
        }
      }
      
      setIsPlaying(true)
      console.log('✅ Audio playing')
    } catch (error) {
      console.error('❌ Audio playback failed:', error)
      alert(`Failed to play audio: ${error.message}`)
      setIsPlaying(false)
    }
  }

  const pauseAudio = () => {
    // Pause all stem audios
    const stemRefs = [bassAudioRef, drumsAudioRef, vocalsAudioRef, otherAudioRef]
    stemRefs.forEach(ref => {
      if (ref.current) {
        ref.current.pause()
      }
    })
    
    // Also pause single audio if it exists
    if (singleAudioRef.current) {
      singleAudioRef.current.pause()
    }
    
    setIsPlaying(false)
    console.log('⏸️ Audio paused')
  }

  const togglePlayPause = () => {
    if (isPlaying) {
      pauseAudio()
    } else {
      playAudio()
    }
  }

  // When instrument level changes and audio is playing, restart with new stems
  useEffect(() => {
    if (isPlaying && currentSong?.stems) {
      // Pause all, then restart to include new stems
      pauseAudio()
      // Small delay to ensure pause completes
      setTimeout(() => {
        playAudio()
      }, 100)
    }
  }, [currentInstrument])

  const handleGuess = (formattedSong) => {
    // Extract title from "Title - Artist" format
    const songTitle = formattedSong.split(' - ')[0]
    
    const newGuesses = [...guesses, formattedSong]
    setGuesses(newGuesses)

    if (songTitle === currentSong.title) {
      // Win!
      pauseAudio()
      setIsPlaying(false)
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
      pauseAudio()
      setIsPlaying(false)
      setIsGameOver(true)
      setHasWon(false)
    }
    
    setSearchTerm('')
  }

  const filteredSongs = currentSong?.songList?.filter(song =>
    song.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []
  
  // Debug logging
  useEffect(() => {
    if (currentSong) {
      console.log('🎮 Song list available:', currentSong.songList?.length || 0, 'songs')
      if (!currentSong.songList || currentSong.songList.length === 0) {
        console.error('❌ No song list for guessing!')
      }
    }
  }, [currentSong])

  const skipInstrument = () => {
    if (currentInstrument < maxInstruments - 1) {
      setCurrentInstrument(currentInstrument + 1)
      setGuesses([...guesses, 'SKIPPED'])
    }
  }

  const shareResult = () => {
    const instrumentEmojis = ['🎸', '🥁', '�', '🎹']
      .slice(0, currentInstrument + 1)
      .join('')
    const result = `Band on the Run ${mode === 'daily' ? '🎯' : '🎮'}\n` +
                   `${hasWon ? '✅' : '❌'} ${guesses.length}/${maxInstruments} attempts\n` +
                   `${instrumentEmojis}\n` +
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
          <h2>
            {mode === 'daily' ? '🎯 Daily Challenge' : (
              currentSong?.id 
                ? `🎮 Practice Mode - Song #${currentSong.id}` 
                : `🎮 Practice Mode - Song #${songNumber}`
            )}
          </h2>
          {mode === 'practice' && currentSong && (
            <div className={`audio-type-badge ${currentSong.stems ? 'has-stems' : 'itunes-only'}`}>
              {currentSong.stems ? '🎸 Stems Available' : '🎵 iTunes Preview'}
            </div>
          )}
        </div>

        <div className="playback-controls">
          <button 
            onClick={togglePlayPause} 
            className="play-button"
          >
            {isPlaying ? '⏸️ Pause' : '▶️ Play'}
          </button>
          
          <div className="instruments-display">
            <h3>Instruments: {currentInstrument + 1}/{maxInstruments}</h3>
            <div className="instruments-list">
              {['🎸 Bass', '🥁 Drums', '🎤 Vocals', '🎹 Other'].map((instrument, idx) => (
                <span 
                  key={idx}
                  className={`instrument ${idx <= currentInstrument ? 'revealed' : 'hidden'}`}
                >
                  {idx <= currentInstrument ? instrument : '🔒'}
                </span>
              ))}
            </div>
          </div>
          
          {/* Audio elements for stem playback */}
          {currentSong.stems ? (
            <>
              <audio ref={bassAudioRef} src={currentSong.stems.bass} />
              <audio ref={drumsAudioRef} src={currentSong.stems.drums} />
              <audio ref={vocalsAudioRef} src={currentSong.stems.vocals} />
              <audio ref={otherAudioRef} src={currentSong.stems.other} />
            </>
          ) : (
            <audio ref={singleAudioRef} src={currentSong.audioUrl} />
          )}
        </div>

        {!isGameOver && (
          <div className="guess-section">
            <div className="guesses-header">
              <h4>Your Guesses: {guesses.length}</h4>
              {guesses.length > 0 && (
                <div className="guesses-compact">
                  {guesses.map((guess, idx) => {
                    const guessTitle = guess === 'SKIPPED' ? 'SKIPPED' : guess.split(' - ')[0]
                    const isCorrect = guessTitle === currentSong.title
                    return (
                      <span 
                        key={idx} 
                        className={`guess-chip ${isCorrect ? 'correct' : 'wrong'}`}
                        title={guess === 'SKIPPED' ? 'Skipped' : guess}
                      >
                        {guess === 'SKIPPED' ? '⏭️' : (isCorrect ? '✅' : '❌')}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
            
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for a song..."
              className="search-input"
            />
            
            {searchTerm && (
              <div className="song-suggestions">
                {filteredSongs.length > 0 ? (
                  filteredSongs.slice(0, 10).map((song, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleGuess(song)}
                      className="suggestion-button"
                    >
                      {song}
                    </button>
                  ))
                ) : (
                  <div className="no-results">
                    No songs found. Try a different search.
                  </div>
                )}
              </div>
            )}
            
            {!currentSong.songList && (
              <div className="loading-songs">
                ⏳ Loading song list...
              </div>
            )}
            
            <button 
              onClick={skipInstrument}
              className="skip-button"
              disabled={currentInstrument >= maxInstruments - 1}
            >
              ⏭️ Skip to Next Instrument
            </button>
            
            {mode === 'practice' && (
              <div className="practice-controls">
                <button 
                  onClick={() => {
                    pauseAudio()
                    setIsPlaying(false)
                    setIsGameOver(true)
                    setHasWon(false)
                  }}
                  className="reveal-button"
                >
                  👁️ Reveal Song
                </button>
                <button 
                  onClick={loadNextSong}
                  className="skip-song-button"
                >
                  ⏩ Skip Song
                </button>
              </div>
            )}
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
              {mode === 'practice' && (
                <button onClick={loadNextSong} className="next-song-button">
                  ⏭️ Next Song
                </button>
              )}
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
