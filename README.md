# 🎵 Band on the Run

A music guessing game where you guess the song one instrument at a time!

## Features

- 🎯 **Daily Puzzle Mode** - One puzzle per day, same for everyone
- 🎮 **Practice Mode** - Unlimited games with random songs
- 📊 **Stats Tracking** - Track your wins, streaks, and performance
- 📋 **Share Results** - Share your scores with friends
- 🎨 **Modern UI** - Clean, responsive design inspired by Spotify

## How to Play

1. Listen to the first instrument
2. Guess the song from the dropdown list
3. Each wrong guess reveals another instrument
4. Try to guess with as few instruments as possible!

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **CSS3** - Styling with CSS custom properties
- **LocalStorage** - Stats persistence

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
\`\`\`

## Project Structure

\`\`\`
bandle-clone/
├── src/
│   ├── components/
│   │   ├── Game.jsx          # Main game component
│   │   ├── Game.css
│   │   ├── Menu.jsx          # Main menu
│   │   ├── Menu.css
│   │   ├── Stats.jsx         # Statistics display
│   │   └── Stats.css
│   ├── utils/
│   │   └── gameLogic.js      # Game logic and data
│   ├── App.jsx               # Root component
│   ├── App.css
│   ├── main.jsx              # Entry point
│   └── index.css             # Global styles
├── public/                   # Static assets
├── index.html
├── vite.config.js
└── package.json
\`\`\`

## Adding Songs

To add more songs, edit \`src/utils/gameLogic.js\` and add entries to the \`SONGS\` array:

\`\`\`javascript
{
  title: "Song Title",
  artist: "Artist Name",
  instruments: ["🎸 Guitar", "🥁 Drums", "🎤 Vocals"],
  audioUrl: "/audio/your-song.mp3"
}
\`\`\`

## Audio Files

Currently, the app uses placeholder audio URLs. To add real audio:

1. Create a \`public/audio\` directory
2. Add your audio files (MP3 format recommended)
3. Update the \`audioUrl\` in each song object

For a production app, you would need:
- Separate audio tracks for each instrument
- Logic to layer instruments progressively
- Or use an audio processing library

## Future Enhancements

- [ ] Real multi-track audio with instrument isolation
- [ ] Multiplayer mode
- [ ] More songs (1000+)
- [ ] Weekly challenges
- [ ] Leaderboards
- [ ] Different difficulty levels
- [ ] Genre-specific modes
- [ ] Spotify/Apple Music integration

## License

MIT

## Acknowledgments

- Inspired by music guessing games
- Part of the daily puzzle game genre including Wordle, Heardle, and similar games
