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

  game.onComboUpdate = (combo) => {
    const comboDisplay = document.getElementById('combo-display') as HTMLElement;
    const comboVal = document.getElementById('combo-val') as HTMLElement;
    if (combo > 1) {
      comboDisplay.classList.remove('hidden');
      comboVal.innerText = combo.toString();
    } else {
      comboDisplay.classList.add('hidden');
    }
  };

  game.onInputUpdate = (inputStr) => {
    (document.getElementById('input-val') as HTMLElement).innerText = inputStr || '_';
  };
});
