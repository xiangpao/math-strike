import './style.css';
import { Game } from './Game';
import { AudioSystem } from './AudioSystem';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const mainMenu = document.getElementById('main-menu') as HTMLElement;
  const gameHud = document.getElementById('game-hud') as HTMLElement;
  const gameOverScreen = document.getElementById('game-over') as HTMLElement;
  const stageClearScreen = document.getElementById('stage-clear') as HTMLElement;

  const btnStory = document.getElementById('btn-story') as HTMLButtonElement;
  const btnEndless = document.getElementById('btn-endless') as HTMLButtonElement;
  const btnRestart = document.getElementById('btn-restart') as HTMLButtonElement;
  const btnNextStage = document.getElementById('btn-next-stage') as HTMLButtonElement;
  
  const charCards = document.querySelectorAll('.char-card');
  let selectedChar = 'jiejie';

  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  const audioSystem = new AudioSystem();
  const game = new Game(canvas, audioSystem);

  charCards.forEach(card => {
    card.addEventListener('click', () => {
      charCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedChar = card.getAttribute('data-char') || 'jiejie';
    });
  });

  const startGame = (mode: 'story' | 'endless') => {
    audioSystem.init(); // Initialize audio on first user interaction
    audioSystem.playBGM();
    mainMenu.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    stageClearScreen.classList.add('hidden');
    gameHud.classList.remove('hidden');
    
    game.start(mode, selectedChar);
  };

  btnStory.addEventListener('click', () => startGame('story'));
  btnEndless.addEventListener('click', () => startGame('endless'));
  
  btnRestart.addEventListener('click', () => {
    audioSystem.stopBGM();
    gameOverScreen.classList.add('hidden');
    mainMenu.classList.remove('hidden');
  });

  btnNextStage.addEventListener('click', () => {
    stageClearScreen.classList.add('hidden');
    gameHud.classList.remove('hidden');
    game.startNextStage();
  });

  game.onGameOver = (score) => {
    audioSystem.stopBGM();
    gameHud.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    (document.getElementById('final-score-val') as HTMLElement).innerText = score.toString();
  };

  game.onStageClear = () => {
    gameHud.classList.add('hidden');
    stageClearScreen.classList.remove('hidden');
  };

  game.onScoreUpdate = (score) => {
    (document.getElementById('score-val') as HTMLElement).innerText = score.toString();
  };

  game.onHealthUpdate = (health) => {
    const healthContainer = document.getElementById('health-container') as HTMLElement;
    healthContainer.innerHTML = '';
    for (let i = 0; i < health; i++) {
      const heart = document.createElement('div');
      heart.className = 'heart';
      healthContainer.appendChild(heart);
    }
  };

  // Bomb display (HTML, not canvas)
  game.onBombsUpdate = (bombs) => {
    const bombVal = document.getElementById('bomb-val') as HTMLElement;
    const bombHint = document.querySelector('.bomb-hint') as HTMLElement;
    bombVal.innerText = bombs > 0 ? '★'.repeat(bombs) : '∅ 无';
    if (bombHint) bombHint.style.opacity = bombs > 0 ? '1' : '0.4';
  };

  let comboHideTimer: ReturnType<typeof setTimeout> | null = null;
  game.onComboUpdate = (combo) => {
    const comboDisplay = document.getElementById('combo-display') as HTMLElement;
    const comboVal = document.getElementById('combo-val') as HTMLElement;
    if (combo > 1) {
      comboDisplay.classList.remove('hidden');
      comboDisplay.classList.add('combo-show');
      comboVal.innerText = combo.toString();
      // Reset auto-hide timer
      if (comboHideTimer) clearTimeout(comboHideTimer);
      comboHideTimer = setTimeout(() => {
        comboDisplay.classList.add('hidden');
        comboDisplay.classList.remove('combo-show');
        comboHideTimer = null;
      }, 2000);
    } else {
      if (comboHideTimer) clearTimeout(comboHideTimer);
      comboDisplay.classList.add('hidden');
      comboDisplay.classList.remove('combo-show');
    }
  };

  game.onInputUpdate = (inputStr) => {
    (document.getElementById('input-val') as HTMLElement).innerText = inputStr || '_';
  };

  // ─── Mobile Controls ───────────────────────────────────────────────────────
  const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches;
  const mobileControls = document.getElementById('mobile-controls') as HTMLElement;
  const bombHint = document.querySelector('.bomb-hint') as HTMLElement;

  if (isTouchDevice()) {
    if (bombHint) bombHint.textContent = '[💥]';

    // Tell game engine to keep player above mobile controls bar
    game.setBottomMargin(160);

    // Show controls only while game HUD is visible
    const showMobile = () => mobileControls.classList.remove('hidden');
    const hideMobile = () => mobileControls.classList.add('hidden');

    // Hook into game state transitions
    btnStory.addEventListener('click', showMobile);
    btnEndless.addEventListener('click', showMobile);
    btnRestart.addEventListener('click', hideMobile);
    btnNextStage.addEventListener('click', showMobile);
    game.onGameOver = (score) => {
      audioSystem.stopBGM();
      gameHud.classList.add('hidden');
      gameOverScreen.classList.remove('hidden');
      (document.getElementById('final-score-val') as HTMLElement).innerText = score.toString();
      hideMobile();
    };
    game.onStageClear = () => {
      gameHud.classList.add('hidden');
      stageClearScreen.classList.remove('hidden');
      hideMobile();
    };

    // ── Joystick ──────────────────────────────────────────────────────────
    const joystickBase = document.getElementById('joystick-base') as HTMLElement;
    const joystickKnob = document.getElementById('joystick-knob') as HTMLElement;
    const KNOB_RADIUS = 32; // max travel in px (= joystick-base radius - knob radius)

    let joystickTouchId: number | null = null;
    let joystickOriginX = 0;
    let joystickOriginY = 0;

    joystickBase.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (joystickTouchId !== null) return;
      const t = e.changedTouches[0];
      joystickTouchId = t.identifier;
      const rect = joystickBase.getBoundingClientRect();
      joystickOriginX = rect.left + rect.width / 2;
      joystickOriginY = rect.top + rect.height / 2;
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (joystickTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier !== joystickTouchId) continue;
        const rawDx = t.clientX - joystickOriginX;
        const rawDy = t.clientY - joystickOriginY;
        const dist = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
        const clamped = Math.min(dist, KNOB_RADIUS);
        const angle = Math.atan2(rawDy, rawDx);
        const kx = Math.cos(angle) * clamped;
        const ky = Math.sin(angle) * clamped;
        joystickKnob.style.transform = `translate(${kx}px, ${ky}px)`;
        game.setJoystick(kx / KNOB_RADIUS, ky / KNOB_RADIUS);
        e.preventDefault();
      }
    }, { passive: false });

    const releaseJoystick = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joystickTouchId) {
          joystickTouchId = null;
          joystickKnob.style.transform = 'translate(0,0)';
          game.setJoystick(0, 0);
        }
      }
    };
    window.addEventListener('touchend', releaseJoystick);
    window.addEventListener('touchcancel', releaseJoystick);

    // ── Numpad ────────────────────────────────────────────────────────────
    const numBtns = document.querySelectorAll<HTMLButtonElement>('.num-btn[data-digit]');
    numBtns.forEach(btn => {
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const d = btn.getAttribute('data-digit');
        if (d) game.appendInput(d);
      }, { passive: false });
    });

    const btnDel = document.getElementById('btn-del') as HTMLButtonElement;
    btnDel.addEventListener('touchstart', (e) => {
      e.preventDefault();
      game.deleteInput();
    }, { passive: false });

    const btnFire = document.getElementById('btn-fire') as HTMLButtonElement;
    btnFire.addEventListener('touchstart', (e) => {
      e.preventDefault();
      game.triggerFire();
    }, { passive: false });

    const btnBombMobile = document.getElementById('btn-bomb-mobile') as HTMLButtonElement;
    btnBombMobile.addEventListener('touchstart', (e) => {
      e.preventDefault();
      game.triggerBomb();
    }, { passive: false });
  }
});
