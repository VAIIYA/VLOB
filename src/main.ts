import './style.css';
import { Game } from './engine';
import { InputManager } from './input/InputManager';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const menu = document.getElementById('menu') as HTMLDivElement;
const playBtn = document.getElementById('playBtn') as HTMLButtonElement;
const playerNameInput = document.getElementById('playerName') as HTMLInputElement;
const scoreValue = document.getElementById('scoreValue') as HTMLSpanElement;

let game: Game | null = null;

const leaderboardList = document.getElementById('leaderboardList') as HTMLDivElement;

function startGame() {
  const name = playerNameInput.value || 'Guest';
  menu.style.opacity = '0';
  setTimeout(() => {
    menu.style.display = 'none';
  }, 300);

  game = new Game(canvas);
  game.setPlayerName(name);

  new InputManager({
    onMove: (x, y) => {
      if (game) game.setPlayerTarget(x, y);
    },
    onSplit: () => {
      if (game) game.split();
    },
    onEject: () => {
      if (game) game.ejectMass();
    }
  });

  // HUD Update Loop
  setInterval(() => {
    if (game) {
      // Update Score
      scoreValue.textContent = game.getPlayerMass().toString();

      // Update Leaderboard
      const topPlayers = game.getLeaderboard();
      leaderboardList.innerHTML = topPlayers.map((p, i) => `
        <div class="leaderboard-item ${p.name === 'YOU' ? 'me' : ''}">
          <span>${i + 1}. ${p.name}</span>
          <span>${p.mass}</span>
        </div>
      `).join('');
    }
  }, 200);
}

playBtn.addEventListener('click', startGame);

// Register PWA service worker (Vite PWA handles this automatically, but we can verify)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // navigator.serviceWorker.register('/sw.js');
  });
}
