import './style.css';
import { Game } from './engine';
import { InputManager } from './input/InputManager';
import { auth } from './utils/auth';
import { getUserProfile, createUserProfile, updateUserProfile, initSchema, UserProfile } from './utils/db';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const menu = document.getElementById('menu') as HTMLDivElement;
const playBtn = document.getElementById('playBtn') as HTMLButtonElement;
const playerNameInput = document.getElementById('playerName') as HTMLInputElement;
const scoreValue = document.getElementById('scoreValue') as HTMLSpanElement;

let game: Game | null = null;

const leaderboardList = document.getElementById('leaderboardList') as HTMLDivElement;

const loginBtn = document.getElementById('loginBtn') as HTMLButtonElement;
const authSection = document.getElementById('authSection') as HTMLDivElement;
const profileSection = document.getElementById('profileSection') as HTMLDivElement;
const displayLevel = document.getElementById('displayLevel') as HTMLSpanElement;
const displayWins = document.getElementById('displayWins') as HTMLSpanElement;

let currentUser: UserProfile | null = null;

async function handleLogin() {
  const wallet = await auth.connect();
  if (wallet) {
    await initSchema();
    let profile = await getUserProfile(wallet);
    if (!profile) {
      profile = await createUserProfile(wallet, playerNameInput.value || 'Guest');
    }

    if (profile) {
      currentUser = profile;
      playerNameInput.value = profile.username;
      displayLevel.textContent = `Lvl ${profile.level}`;
      displayWins.textContent = `Wins: ${profile.wins}`;

      authSection.style.display = 'none';
      profileSection.style.display = 'block';
    }
  }
}

loginBtn.addEventListener('click', handleLogin);

function startGame() {
  const name = playerNameInput.value || 'Guest';
  menu.style.opacity = '0';
  setTimeout(() => {
    menu.style.display = 'none';
  }, 300);

  game = new Game(canvas, async (stats) => {
    if (currentUser) {
      currentUser.losses += 1;
      currentUser.total_mass += stats.mass;
      // Simple level up logic
      currentUser.level = Math.floor(currentUser.total_mass / 5000) + 1;

      await updateUserProfile(currentUser);

      // Update UI
      displayLevel.textContent = `Lvl ${currentUser.level}`;
      displayWins.textContent = `Wins: ${currentUser.wins}`;
    }
  });
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
  setInterval(async () => {
    if (game) {
      const mass = game.getPlayerMass();
      scoreValue.textContent = mass.toString();

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
