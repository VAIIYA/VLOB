import './style.css';
import { Game } from './engine';
import { InputManager } from './input/InputManager';
import { auth } from './utils/auth';
import { getUserProfile, createUserProfile, updateUserProfile, initSchema, UserProfile, getTopMassPlayers, getTopKillPlayers, addOwnedSkin } from './utils/db';
import { SoundManager } from './engine/SoundManager';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const menu = document.getElementById('menu') as HTMLDivElement;
const playBtn = document.getElementById('playBtn') as HTMLButtonElement;
const playerNameInput = document.getElementById('playerName') as HTMLInputElement;

// Control Settings Wiring
const posLeft = document.getElementById('posLeft') as HTMLInputElement;
const posRight = document.getElementById('posRight') as HTMLInputElement;

// Sidebar & Leaderboards
const sidebarToggle = document.getElementById('sidebarToggle') as HTMLButtonElement;
const globalLeaderboards = document.getElementById('globalLeaderboards') as HTMLDivElement;
const massLeaderboard = document.getElementById('massLeaderboard') as HTMLDivElement;
const killLeaderboard = document.getElementById('killLeaderboard') as HTMLDivElement;

// Game Mode
const modeFFA = document.getElementById('modeFFA') as HTMLDivElement;
const modeTeam = document.getElementById('modeTeam') as HTMLDivElement;
let gameMode: 'ffa' | 'team' = 'ffa';

const scoreValue = document.getElementById('scoreValue') as HTMLSpanElement;

let game: Game | null = null;
let inputManager: InputManager | null = null; // Declare inputManager globally

// Leaderboard removed from HUD

const loginBtn = document.getElementById('loginBtn') as HTMLButtonElement;
const authSection = document.getElementById('authSection') as HTMLDivElement;
const profileSection = document.getElementById('profileSection') as HTMLDivElement;
const displayLevel = document.getElementById('displayLevel') as HTMLSpanElement;
const displayWins = document.getElementById('displayWins') as HTMLSpanElement;

// Store UI Elements
const openStoreBtn = document.getElementById('openStoreBtn') as HTMLButtonElement;
const storeModal = document.getElementById('storeModal') as HTMLDivElement;
const closeStoreBtn = document.getElementById('closeStoreBtn') as HTMLButtonElement;
const storeGrid = document.getElementById('storeGrid') as HTMLDivElement;
const storeTabs = document.querySelectorAll('.store-tab');

let currentUser: UserProfile | null = null;
let selectedSkin = 'default';
let activeStoreTab: 'premium' | 'free' = 'premium';
const PREMIUM_PRICE_SOL = 0.1;

// Define Skins
const premiumSkins = [
  { id: 'tiger', name: 'Tiger', type: 'image' },
  { id: 'skull', name: 'Skull', type: 'image' },
  { id: 'pumpkin', name: 'Pumpkin', type: 'image' },
  { id: 'ninja', name: 'Ninja', type: 'image' },
  { id: 'gorilla', name: 'Gorilla', type: 'image' }
];

const freeSkins = [
  { id: 'default', name: 'Default', type: 'color', value: '#3b82f6' },
  { id: 'neon', name: 'Neon', type: 'gradient', value: 'linear-gradient(45deg, #3b82f6, #60a5fa)' },
  { id: 'doge', name: 'Doge', type: 'image' },
  { id: 'bunny', name: 'Bunny', type: 'image' },
  { id: 'alien_face', name: 'Alien Face', type: 'image' }
];

// Preload Default free skins
freeSkins.filter(s => s.type === 'image').forEach(skin => {
  const img = new Image();
  img.src = `/skins/${skin.id}.png`;
});

// Death Popup Elements
const deathPopup = document.getElementById('deathPopup') as HTMLDivElement;
const deathMass = document.getElementById('deathMass') as HTMLSpanElement;
const deathTime = document.getElementById('deathTime') as HTMLSpanElement;
const respawnBtn = document.getElementById('respawnBtn') as HTMLButtonElement;
const observeBtn = document.getElementById('observeBtn') as HTMLButtonElement;
const quitBtn = document.getElementById('quitBtn') as HTMLButtonElement;

// Initial build
game = new Game(canvas, async (stats: any) => {
  // Handle Game Over
  deathMass.textContent = stats.mass.toString();
  deathTime.textContent = `${stats.timeAlive}s`;
  deathPopup.style.display = 'flex';

  if (currentUser) {
    currentUser.losses += 1;
    currentUser.total_mass += stats.mass;
    if (stats.mass > (currentUser.max_mass || 0)) currentUser.max_mass = stats.mass;
    if (stats.kills) currentUser.kills = (currentUser.kills || 0) + stats.kills;

    currentUser.level = Math.floor(currentUser.total_mass / 5000) + 1;
    await updateUserProfile(currentUser);

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

inputManager?.setControlMode('joystick'); // Force joystick mode for touch controls

sidebarToggle?.addEventListener('click', () => {
  globalLeaderboards?.classList.toggle('active');
});

modeFFA?.addEventListener('click', () => {
  modeFFA.classList.add('active');
  modeTeam?.classList.remove('active');
  gameMode = 'ffa';
});

modeTeam?.addEventListener('click', () => {
  modeTeam.classList.add('active');
  modeFFA?.classList.remove('active');
  gameMode = 'team';
});

async function loadLeaderboards() {
  try {
    const topMass = await getTopMassPlayers(5);
    if (massLeaderboard) {
      massLeaderboard.innerHTML = topMass.map((p, i) => `
        <div class="lb-item">
          <span class="name">${i + 1}. ${p.username}</span>
          <span class="value">${p.max_mass || 0}</span>
        </div>
      `).join('');
    }

    const topKills = await getTopKillPlayers(5);
    if (killLeaderboard) {
      killLeaderboard.innerHTML = topKills.map((p, i) => `
        <div class="lb-item">
          <span class="name">${i + 1}. ${p.username}</span>
          <span class="value">${p.kills || 0}</span>
        </div>
      `).join('');
    }
  } catch (e) {
    console.error('Failed to load leaderboards', e);
  }
}
loadLeaderboards();

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

// --- Store Logic ---
function renderStore() {
  if (!storeGrid) return;

  const defaultOwned = freeSkins.map(s => s.id);
  const ownedSkins = currentUser?.owned_skins || defaultOwned;
  const listToRender = activeStoreTab === 'premium' ? premiumSkins : freeSkins;

  storeGrid.innerHTML = listToRender.map(skin => {
    const isOwned = ownedSkins.includes(skin.id);
    const isEquipped = selectedSkin === skin.id;

    let previewStyle = '';
    if (skin.type === 'image') previewStyle = `background-image: url('/skins/${skin.id}.png');`;
    else if (skin.type === 'color' || skin.type === 'gradient') previewStyle = `background: ${(skin as any).value};`;

    let actionHtml = '';
    if (isEquipped) {
      actionHtml = `<button class="skin-action-btn btn-equipped">Equipped</button>`;
    } else if (isOwned) {
      actionHtml = `<button class="skin-action-btn btn-equip" data-skin="${skin.id}">Equip</button>`;
    } else {
      actionHtml = `<button class="skin-action-btn btn-buy" data-skin="${skin.id}">Buy (0.1 SOL)</button>`;
    }

    return `
      <div class="skin-card">
        <div class="skin-preview" style="${previewStyle}"></div>
        <div class="skin-name">${skin.name}</div>
        ${actionHtml}
      </div>
    `;
  }).join('');
}

storeTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    storeTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeStoreTab = tab.getAttribute('data-tab') as 'premium' | 'free';
    renderStore();
  });
});

openStoreBtn?.addEventListener('click', () => {
  storeModal.style.display = 'flex';
  renderStore();
});

closeStoreBtn?.addEventListener('click', () => {
  storeModal.style.display = 'none';
});

storeGrid?.addEventListener('click', async (e) => {
  const target = e.target as HTMLElement;

  if (target.classList.contains('btn-equip')) {
    const skinId = target.getAttribute('data-skin');
    if (skinId) {
      selectedSkin = skinId;
      if (game) game.setPlayerSkin(selectedSkin);
      renderStore();
      // Update main menu active skin display
      document.querySelectorAll('.skin-option').forEach(o => o.classList.remove('active'));
      const matchingOpt = document.querySelector(`.skin-option[data-skin="${skinId}"]`);
      if (matchingOpt) matchingOpt.classList.add('active');
    }
  } else if (target.classList.contains('btn-buy')) {
    const skinId = target.getAttribute('data-skin');
    if (!skinId) return;

    if (!auth.isConnected() || !currentUser) {
      alert('Please connect your Solana wallet first!');
      return;
    }

    target.textContent = 'Processing...';
    target.style.opacity = '0.5';

    const success = await auth.purchaseSkin(PREMIUM_PRICE_SOL, DEV_WALLET);
    if (success) {
      await addOwnedSkin(auth.walletAddress!, skinId);
      if (!currentUser.owned_skins) currentUser.owned_skins = freeSkins.map(s => s.id);
      if (!currentUser.owned_skins.includes(skinId)) {
        currentUser.owned_skins.push(skinId);
      }
      // Preload the purchased skin
      const img = new Image();
      img.src = `/skins/${skinId}.png`;

      alert(`Successfully purchased ${skinId}!`);
      renderStore();
    } else {
      alert('Transaction failed or was canceled.');
      renderStore();
    }
  }
});

// Skin Selection Wiring (Main Menu Legacy)
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
  SoundManager.init(); // Initialize Web Audio API on first user interaction
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
    (game as any).setGameMode(gameMode); // We'll add this method next
    game.respawn();
  }

  deathPopup.style.display = 'none';

  // HUD Update Loop (only if not in editor)
  setInterval(async () => {
    if (game && !isEditorMode) {
      const mass = game.getPlayerMass();
      scoreValue.textContent = mass.toString();
    }
  }, 200);
}

respawnBtn.addEventListener('click', () => {
  deathPopup.style.display = 'none';
  game?.respawn();
});

observeBtn.addEventListener('click', () => {
  deathPopup.style.display = 'none';
});

quitBtn.addEventListener('click', () => {
  deathPopup.style.display = 'none';
  menu.style.display = 'flex';
  menu.style.opacity = '1';
});

playBtn.addEventListener('click', startGame);

// Register PWA service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // navigator.serviceWorker.register('/sw.js');
  });
}

