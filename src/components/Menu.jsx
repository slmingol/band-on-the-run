import './Menu.css'

function Menu({ onStartGame, onShowStats, onShowAdmin }) {
  return (
    <div className="menu">
      <div className="menu-container">
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

        <div className="how-to-play">
          <h3>How to Play</h3>
          <ol>
            <li>Listen to the first instrument</li>
            <li>Guess the song from the list</li>
            <li>Each wrong guess reveals another instrument</li>
            <li>Try to guess with as few instruments as possible!</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

export default Menu
