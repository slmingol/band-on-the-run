// Sample song database
// In a real app, this would be much larger and possibly loaded from an API
const SONGS = [
  {
    title: "Bohemian Rhapsody",
    artist: "Queen",
    instruments: ["🎹 Piano", "🎸 Guitar", "🥁 Drums", "🎤 Vocals", "🎺 Brass"],
    audioUrl: "/audio/sample1.mp3" // Placeholder
  },
  {
    title: "Hotel California",
    artist: "Eagles",
    instruments: ["🎸 Guitar", "🥁 Drums", "🎹 Keyboard", "🎤 Vocals", "🎸 Bass"],
    audioUrl: "/audio/sample2.mp3"
  },
  {
    title: "Billie Jean",
    artist: "Michael Jackson",
    instruments: ["🥁 Drums", "🎸 Bass", "🎹 Synth", "🎤 Vocals", "🎺 Horns"],
    audioUrl: "/audio/sample3.mp3"
  },
  {
    title: "Sweet Child O' Mine",
    artist: "Guns N' Roses",
    instruments: ["🎸 Guitar", "🥁 Drums", "🎸 Bass", "🎤 Vocals", "🎹 Keyboard"],
    audioUrl: "/audio/sample4.mp3"
  },
  {
    title: "Smells Like Teen Spirit",
    artist: "Nirvana",
    instruments: ["🎸 Guitar", "🥁 Drums", "🎸 Bass", "🎤 Vocals"],
    audioUrl: "/audio/sample5.mp3"
  },
  {
    title: "Wonderwall",
    artist: "Oasis",
    instruments: ["🎸 Guitar", "🥁 Drums", "🎤 Vocals", "🎸 Bass"],
    audioUrl: "/audio/sample6.mp3"
  },
  {
    title: "Africa",
    artist: "Toto",
    instruments: ["🎹 Keyboard", "🥁 Drums", "🎸 Guitar", "🎤 Vocals", "🎺 Brass"],
    audioUrl: "/audio/sample7.mp3"
  },
  {
    title: "Don't Stop Believin'",
    artist: "Journey",
    instruments: ["🎹 Piano", "🎸 Guitar", "🥁 Drums", "🎤 Vocals", "🎸 Bass"],
    audioUrl: "/audio/sample8.mp3"
  }
]

// Create a song list for guessing
const SONG_LIST = SONGS.map(s => s.title).sort()

// Simple seeded random number generator
function seededRandom(seed) {
  const x = Math.sin(seed++) * 10000
  return x - Math.floor(x)
}

// Get song for today's daily puzzle
export function getSongForDay() {
  const today = new Date()
  const daysSinceEpoch = Math.floor(today.getTime() / (1000 * 60 * 60 * 24))
  const index = Math.floor(seededRandom(daysSinceEpoch) * SONGS.length)
  
  return {
    ...SONGS[index],
    songList: SONG_LIST
  }
}

// Get random song for practice mode
export function getRandomSong() {
  const index = Math.floor(Math.random() * SONGS.length)
  return {
    ...SONGS[index],
    songList: SONG_LIST
  }
}

// LocalStorage keys
const STATS_KEY = 'bandle_stats'
const DAILY_KEY = 'bandle_daily'

// Get current stats
export function getStats() {
  const stored = localStorage.getItem(STATS_KEY)
  
  if (!stored) {
    return {
      gamesPlayed: 0,
      gamesWon: 0,
      winRate: 0,
      currentStreak: 0,
      maxStreak: 0,
      avgInstruments: 0,
      guessDistribution: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0
      }
    }
  }
  
  return JSON.parse(stored)
}

// Save game result
export function saveStats(result) {
  const stats = getStats()
  
  stats.gamesPlayed++
  
  if (result.instrumentsUsed <= 6) {
    stats.gamesWon++
    stats.currentStreak++
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak)
    
    // Update guess distribution
    const attempts = Math.min(result.attempts, 6)
    stats.guessDistribution[attempts]++
  } else {
    stats.currentStreak = 0
  }
  
  stats.winRate = Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
  
  // Calculate average instruments
  const totalInstruments = Object.entries(stats.guessDistribution).reduce(
    (sum, [attempts, count]) => sum + (parseInt(attempts) * count),
    0
  )
  stats.avgInstruments = stats.gamesWon > 0 
    ? (totalInstruments / stats.gamesWon).toFixed(1)
    : 0
  
  localStorage.setItem(STATS_KEY, JSON.stringify(stats))
}

// Check if daily puzzle was completed today
export function getDailyResult() {
  const stored = localStorage.getItem(DAILY_KEY)
  if (!stored) return null
  
  const data = JSON.parse(stored)
  const today = new Date().toISOString().split('T')[0]
  
  if (data.date === today) {
    return data
  }
  
  return null
}

// Save daily puzzle result
export function saveDailyResult(result) {
  const today = new Date().toISOString().split('T')[0]
  localStorage.setItem(DAILY_KEY, JSON.stringify({
    ...result,
    date: today
  }))
}
