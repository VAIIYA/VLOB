import './style.css';
import { Game } from './engine';
import { InputManager } from './input/InputManager';
import { auth } from './utils/auth';
import { getUserProfile, createUserProfile, updateUserProfile, initSchema, UserProfile } from './utils/db';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const menu = document.getElementById('menu') as HTMLDivElement;
const playBtn = document.getElementById('playBtn') as HTMLButtonElement;
const playerNameInput = document.getElementById('playerName') as HTMLInputElement;

// Control Settings Wiring
const controlFollow = document.getElementById('controlFollow');
const controlJoystick = document.getElementById('controlJoystick');
const posLeft = document.getElementById('posLeft') as HTMLInputElement;
const posRight = document.getElementById('posRight') as HTMLInputElement;

const scoreValue = document.getElementById('scoreValue') as HTMLSpanElement;

let game: Game | null = null;
let inputManager: InputManager | null = null; // Declare inputManager globally

const leaderboardList = document.getElementById('leaderboardList') as HTMLDivElement;

const loginBtn = document.getElementById('loginBtn') as HTMLButtonElement;
const authSection = document.getElementById('authSection') as HTMLDivElement;
const profileSection = document.getElementById('profileSection') as HTMLDivElement;
const displayLevel = document.getElementById('displayLevel') as HTMLSpanElement;
const displayWins = document.getElementById('displayWins') as HTMLSpanElement;

let currentUser: UserProfile | null = null;

// Initial build
game = new Game(canvas, async (stats) => {
  // Handle Game Over
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

// Load existing map on startup
const initialMap = localStorage.getItem('vlob_custom_map');
if (initialMap) game.loadMap(JSON.parse(initialMap));

inputManager = new InputManager({
  onMove: (x, y) => game?.setPlayerTarget(x, y),
  onSplit: () => game?.split(),
  onEject: () => game?.ejectMass()
});

controlFollow?.addEventListener('click', () => {
  controlFollow.classList.add('active');
  controlJoystick?.classList.remove('active');
  inputManager?.setControlMode('follow');
});

controlJoystick?.addEventListener('click', () => {
  controlJoystick.classList.add('active');
  controlFollow?.classList.remove('active');
  inputManager?.setControlMode('joystick');
});

posLeft?.addEventListener('change', () => {
  if (posLeft.checked) inputManager?.setButtonPosition('left');
});

posRight?.addEventListener('change', () => {
  if (posRight.checked) inputManager?.setButtonPosition('right');
});

const DEV_WALLET = '2Z9eW3nwa2GZUM1JzXdfBK1MN57RPA2PrhuTREEZ31VY';
const createMapBtn = document.getElementById('createMapBtn') as HTMLButtonElement;
const editorToolbar = document.getElementById('editorToolbar') as HTMLDivElement;
const mapSizeInput = document.getElementById('mapSizeInput') as HTMLInputElement;
const toolBtns = document.querySelectorAll('.tool-btn:not(.danger):not(.success)');
const clearMapBtn = document.getElementById('clearMapBtn');
const saveMapBtn = document.getElementById('saveMapBtn');

async function handleLogin() {
  const wallet = await auth.connect();
  if (wallet) {
    if (wallet === DEV_WALLET) {
      createMapBtn.style.display = 'block';
    }

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

// --- Map Editor Logic ---
let isEditorMode = false;

createMapBtn.addEventListener('click', () => {
  isEditorMode = true;
  menu.style.display = 'none';
  editorToolbar.style.display = 'flex';
  if (game) {
    game.setEditorMode(true);
    // Load existing map if any
    const savedMap = localStorage.getItem('vlob_custom_map');
    if (savedMap) game.loadMap(JSON.parse(savedMap));
  }
});

toolBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    toolBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const shape = (btn as HTMLElement).dataset.shape as any;
    if (game) game.setSelectedShape(shape);
  });
});

mapSizeInput.addEventListener('change', () => {
  if (game) game.setWorldSize(parseInt(mapSizeInput.value));
});

clearMapBtn?.addEventListener('click', () => {
  if (game) game.clearMap();
});

saveMapBtn?.addEventListener('click', () => {
  if (game) {
    const mapData = game.getMapData();
    localStorage.setItem('vlob_custom_map', JSON.stringify(mapData));
    isEditorMode = false;
    game.setEditorMode(false);
    editorToolbar.style.display = 'none';
    menu.style.display = 'flex';
    menu.style.opacity = '1';
    alert('Map saved!');
  }
});

// Handle Editor Clicks
canvas.addEventListener('mousedown', (e) => {
  if (!isEditorMode || !game) return;

  // Convert click to world coordinates
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // Add object on left click, remove on right click or if Alt key is down
  if (e.button === 0 && !e.altKey) {
    // We need to access mouseToWorld logic
    // I'll add a helper to the game class or just implement it here
    // Actually game.setPlayerTarget already handles mousePos, I can use that or add a specific method
    const worldPos = (game as any).mouseToWorld(x, y);
    game.addObstacleAt(worldPos.x, worldPos.y);
  } else if (e.button === 2 || (e.button === 0 && e.altKey)) {
    const worldPos = (game as any).mouseToWorld(x, y);
    game.removeObstacleAt(worldPos.x, worldPos.y);
  }
});

// Prevent context menu in editor
canvas.addEventListener('contextmenu', (e) => {
  if (isEditorMode) e.preventDefault();
});

let selectedSkin = 'default';

// Skin Selection Wiring
const skinOptions = document.querySelectorAll('.skin-option');
skinOptions.forEach(opt => {
  opt.addEventListener('click', () => {
    skinOptions.forEach(o => o.classList.remove('active'));
    opt.classList.add('active');
    selectedSkin = opt.getAttribute('data-skin') || 'default';
    if (game) game.setPlayerSkin(selectedSkin);
  });
});

function startGame() {
  const name = playerNameInput.value || 'Guest';
  menu.style.opacity = '0';
  setTimeout(() => {
    menu.style.display = 'none';
  }, 300);

  // Use existing map if available
  const savedMap = localStorage.getItem('vlob_custom_map');
  if (game && savedMap) {
    game.loadMap(JSON.parse(savedMap));
  }

  if (game) {
    game.setPlayerName(name);
    game.setPlayerSkin(selectedSkin);
    game.setEditorMode(false);
  }

  // HUD Update Loop (only if not in editor)
  setInterval(async () => {
    if (game && !isEditorMode) {
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

// Register PWA service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // navigator.serviceWorker.register('/sw.js');
  });
}

