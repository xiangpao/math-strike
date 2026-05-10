import { AudioSystem } from './AudioSystem';

interface FloatText { x: number; y: number; text: string; color: string; life: number; vy: number; }
interface Obstacle { x: number; y: number; radius: number; vx: number; vy: number; rotation: number; rotSpeed: number; }

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audio: AudioSystem;
  private isRunning: boolean = false;

  private mode: 'story' | 'endless' = 'story';
  private stage: number = 1;
  private character: string = 'jiejie';
  
  private score: number = 0;
  private health: number = 5;
  private maxHealth: number = 5;
  private combo: number = 0;
  private currentInput: string = '';

  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private enemyBullets: EnemyBullet[] = [];
  private particles: Particle[] = [];
  private items: Item[] = [];
  private floatTexts: FloatText[] = [];
  private obstacles: Obstacle[] = [];
  private obstacleSpawnTimer: number = 0;
  private bgStars: {x: number, y: number, speed: number, size: number, color: string}[] = [];
  private gameTime: number = 0;
  
  private images: { [key: string]: HTMLImageElement } = {};

  private lastTime: number = 0;
  private enemySpawnTimer: number = 0;
  private enemySpawnInterval: number = 4000;
  private enemiesToSpawnThisStage: number = 0;
  private enemiesSpawned: number = 0;

  private playerX: number = 0;
  private playerY: number = 0;
  private playerSpeed: number = 400;
  private keys: { [key: string]: boolean } = {};

  // Mobile joystick input (-1 to 1)
  private joystickDx: number = 0;
  private joystickDy: number = 0;

  public setJoystick(dx: number, dy: number) {
    this.joystickDx = dx;
    this.joystickDy = dy;
  }

  public triggerFire() {
    if (this.isRunning) this.fireBullet();
  }

  public triggerBomb() {
    if (this.isRunning) this.useBomb();
  }

  public appendInput(digit: string) {
    if (!this.isRunning) return;
    if (this.currentInput.length < 3) {
      this.currentInput += digit;
      this.onInputUpdate(this.currentInput);
    }
  }

  public deleteInput() {
    if (!this.isRunning) return;
    this.currentInput = this.currentInput.slice(0, -1);
    this.onInputUpdate(this.currentInput);
  }
  
  // Buffs
  private slownessTimer: number = 0;
  private swiftnessTimer: number = 0;
  private piercingSword: boolean = false;
  private shieldActive: boolean = false;

  private weaponLevel: number = 1;
  private bombs: number = 1;
  private bombFlashTimer: number = 0;

  private bossActive: boolean = false;
  private bossEntity: Enemy | null = null;
  private bossTimer: number = 0;

  public onGameOver: (score: number) => void = () => {};
  public onStageClear: () => void = () => {};
  public onScoreUpdate: (score: number) => void = () => {};
  public onHealthUpdate: (health: number) => void = () => {};
  public onComboUpdate: (combo: number) => void = () => {};
  public onBombsUpdate: (bombs: number) => void = () => {};
  public onInputUpdate: (input: string) => void = () => {};

  // Height reserved for mobile controls at the bottom (px)
  private bottomMargin: number = 0;
  public setBottomMargin(px: number) { this.bottomMargin = px; }

  constructor(canvas: HTMLCanvasElement, audio: AudioSystem) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.audio = audio;
    
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    this.initStars();
    this.loadImages();
  }

  private loadImages() {
    const assets = [
      'player', 'maqi', 'creeper', 'zombie', 
      'skeleton', 'enderman', 'spider', 'wither', 'meteor'
    ];
    for (const name of assets) {
      const img = new Image();
      img.src = `/assets/${name}.png`;
      this.images[name] = img;
    }
  }

  private initStars() {
    this.bgStars = [];
    for(let i=0; i<100; i++) {
      this.bgStars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        speed: Math.random() * 50 + 20,
        size: Math.random() * 3 + 1,
        color: Math.random() > 0.5 ? '#5D9038' : '#866043' // Minecraft dirt/grass colors
      });
    }
  }

  public start(mode: 'story' | 'endless', character: string) {
    this.mode = mode;
    this.character = character;
    this.stage = 1;
    this.resetPlayerStats();
    this.initStage();
    
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public startNextStage() {
    this.stage++;
    this.initStage();
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private initStage() {
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.particles = [];
    this.items = [];
    this.floatTexts = [];
    this.obstacles = [];
    this.obstacleSpawnTimer = 0;
    this.currentInput = '';
    this.onInputUpdate(this.currentInput);
    this.enemiesSpawned = 0;
    this.slownessTimer = 0;
    this.swiftnessTimer = 0;
    this.piercingSword = false;
    this.shieldActive = false;
    this.bossActive = false;
    this.bossEntity = null;

    if (this.mode === 'story') {
      this.enemiesToSpawnThisStage = 5 + this.stage * 3; // Reduced number for testing
      this.enemySpawnInterval = Math.max(2000, 4000 - this.stage * 500);
    } else {
      this.enemySpawnInterval = 3000;
    }

    this.playerX = this.canvas.width / 2;
    this.playerY = this.canvas.height - this.bottomMargin - 100;
    
    this.onHealthUpdate(this.health);
    this.onScoreUpdate(this.score);
    this.onComboUpdate(this.combo);
  }

  private resetPlayerStats() {
    this.score = 0;
    this.health = 5;
    if (this.character === 'jiejie') {
      this.health = 6;
      this.maxHealth = 6;
    } else {
      this.maxHealth = 5;
    }
    this.combo = 0;
    this.weaponLevel = 1;
    this.bombs = 1;
    this.onBombsUpdate(this.bombs);
  }

  private handleKeyDown(e: KeyboardEvent) {
    this.keys[e.key] = true;
    if (!this.isRunning) return;

    if (e.key >= '0' && e.key <= '9') {
      if (this.currentInput.length < 3) {
        this.currentInput += e.key;
        this.onInputUpdate(this.currentInput);
      }
    } else if (e.key === 'Backspace') {
      this.currentInput = this.currentInput.slice(0, -1);
      this.onInputUpdate(this.currentInput);
    } else if (e.key === ' ') {
      this.useBomb();
      e.preventDefault();
    } else if (e.key === 'Enter') {
      this.fireBullet();
      e.preventDefault();
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    this.keys[e.key] = false;
  }

  private useBomb() {
    if (!this.isRunning || this.bombs <= 0) return;
    this.bombs--;
    this.onBombsUpdate(this.bombs);
    this.audio.playBomb();
    this.bombFlashTimer = 1.0;
    this.enemyBullets = [];
    
    // Deal massive damage to all enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.hp -= 50;
      if (e.hp <= 0) {
        this.createParticles(e.x, e.y, '#ff0000', 20);
        this.enemies.splice(i, 1);
        this.score += e.type.startsWith('boss') ? 100 : 10;
        this.spawnItem(e.x, e.y, e.dropLoot);
        if (e.type.startsWith('boss')) {
          this.bossActive = false;
          if (this.mode === 'story') {
            this.isRunning = false;
            this.onStageClear();
          }
        }
      }
    }
    this.onScoreUpdate(this.score);
  }

  private fireBullet() {
    if (this.currentInput === '') return;
    
    const ans = parseInt(this.currentInput, 10);
    this.currentInput = '';
    this.onInputUpdate(this.currentInput);

    let target: Enemy | null = null;
    let maxHitY = -1;
    for (const enemy of this.enemies) {
      if (enemy.answer === ans && enemy.y > maxHitY && enemy.y > 0) {
        maxHitY = enemy.y;
        target = enemy;
      }
    }

    if (target) {
      this.combo++;
      this.onComboUpdate(this.combo);

      let bType: 'normal' | 'fire' | 'tnt' | 'laser' = 'normal';
      let spread = 1;

      if (this.character === 'jiejie') {
         if (this.weaponLevel === 1) { bType = 'normal'; spread = 1; }
         else if (this.weaponLevel === 2) { bType = 'fire'; spread = 3; }
         else { bType = 'tnt'; spread = 3; }
         if (Math.random() < 0.3) bType = 'tnt';
      } else {
         if (this.weaponLevel === 1) { bType = 'normal'; spread = 1; }
         else if (this.weaponLevel === 2) { bType = 'laser'; spread = 1; }
         else { bType = 'laser'; spread = 3; }
      }

      if (this.combo >= 10 && spread < 5) spread += 2;

      // Play milestone combo sounds
      if (this.combo === 3 || this.combo === 6 || this.combo === 10) this.audio.playCombo();
      if (bType === 'laser') this.audio.playLaser();
      else this.audio.playShoot();
      
      for (let i = 0; i < spread; i++) {
        const angleOffset = (i - Math.floor(spread/2)) * 0.2;
        this.bullets.push({
          x: this.playerX,
          y: this.playerY - 40,
          speed: bType === 'normal' ? 800 : 1200,
          target,
          type: bType,
          angleOffset,
          piercing: this.piercingSword || bType === 'laser'
        });
      }
    } else {
      this.combo = 0;
      this.onComboUpdate(this.combo);
      this.audio.playError();
      this.createParticles(this.playerX, this.playerY - 50, '#ff0000', 10);
    }
  }

  private generateMathProblem(): { problem: string, answer: number } {
    let limit = 10;
    if (this.mode === 'story') {
      if (this.stage === 2) limit = 30;
      else if (this.stage === 3) limit = 50;
      else if (this.stage >= 4) limit = 100;
    } else {
      limit = Math.min(100, 10 + Math.floor(this.score / 50) * 10);
    }

    let a, b, answer;
    const isAdd = Math.random() > 0.5;
    if (isAdd) {
      a = Math.floor(Math.random() * (limit / 2)) + 1;
      b = Math.floor(Math.random() * (limit / 2)) + 1;
      answer = a + b;
    } else {
      a = Math.floor(Math.random() * (limit - 5)) + 5;
      b = Math.floor(Math.random() * a);
      answer = a - b;
    }
    return { problem: `${a} ${isAdd ? '+' : '-'} ${b}`, answer };
  }

  private spawnEnemy() {
    const { problem, answer } = this.generateMathProblem();
    
    let type: EnemyType = 'zombie';
    const rand = Math.random();
    if (this.stage >= 1 && rand > 0.7) type = 'creeper';
    if (this.stage >= 2 && rand > 0.85) type = 'skeleton';
    if (this.stage >= 3 && rand > 0.9) type = 'enderman';

    // Base speed significantly slower than before
    let speed = 40 + Math.random() * 30; 
    if (this.mode === 'endless') {
      speed += Math.floor(this.score / 200) * 10;
    }

    // 40% chance this enemy drops loot — flagged visually
    const willDrop = Math.random() < 0.4;
    this.enemies.push({
      x: Math.random() * (this.canvas.width - 100) + 50,
      y: -50,
      width: 50, height: 50,
      speed, problem, answer, type,
      hp: 1, maxHp: 1, stateTimer: 0,
      dropLoot: willDrop
    });
    this.enemiesSpawned++;
  }

  private spawnBoss() {
    this.bossActive = true;
    let bossType: EnemyType = 'boss_spider';
    if (this.stage === 2) bossType = 'boss_wither';
    else if (this.stage === 3) bossType = 'boss_dragon';
    else if (this.stage >= 4) bossType = 'boss_wither_storm';

    let hp = 3 + this.stage * 2;
    this.bossEntity = {
      x: this.canvas.width / 2,
      y: -150,
      width: 150, height: 100,
      speed: 30, problem: '', answer: -1, type: bossType,
      hp, maxHp: hp, stateTimer: 0
    };
    this.enemies.push(this.bossEntity);
    this.updateBossMath();
  }

  private updateBossMath() {
    if (this.bossEntity) {
      const { problem, answer } = this.generateMathProblem();
      this.bossEntity.problem = problem;
      this.bossEntity.answer = answer;
    }
  }

  private createParticles(x: number, y: number, color: string, count: number) {
    for(let i=0; i<count; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 180,  // slower = stay on screen longer
        vy: (Math.random() - 0.8) * 180,
        life: 1.0, color,
        size: Math.random() * 8 + 5        // bigger base size
      });
    }
  }

  private spawnFloatText(x: number, y: number, text: string, color: string) {
    this.floatTexts.push({ x, y, text, color, life: 1.0, vy: -80 });
  }

  private spawnItem(x: number, y: number, guaranteed: boolean = false) {
    const rand = Math.random();
    let itemType: 'heal' | 'powerup' | 'bomb' | 'totem' | null = null;
    if (guaranteed) {
      const types: Array<'heal' | 'powerup' | 'bomb' | 'totem'> = ['heal', 'powerup', 'bomb', 'totem'];
      itemType = types[Math.floor(Math.random() * types.length)];
    } else if (rand < 0.08) itemType = 'heal';
    else if (rand < 0.16) itemType = 'powerup';
    else if (rand < 0.20) itemType = 'bomb';
    else if (rand < 0.23) itemType = 'totem';

    if (itemType) {
      this.items.push({ x, y, type: itemType as any, speed: 90, width: 34, height: 34, age: 0 });
      const labels: Record<string, string> = { heal: '💛 金苹果！', powerup: '⚔ 武器升级！', bomb: '⭐ 下界之星！', totem: '🛡 不死图腾！' };
      this.spawnFloatText(x, y - 30, labels[itemType], '#FFD700');
    }
  }

  private damagePlayer() {
    if (this.shieldActive) {
      this.shieldActive = false;
      this.audio.playExplosion();
      this.createParticles(this.playerX, this.playerY, '#FFFF00', 30);
      return;
    }
    this.health--;
    this.combo = 0;
    this.onHealthUpdate(this.health);
    this.onComboUpdate(this.combo);
    this.audio.playExplosion();
    this.createParticles(this.playerX, this.playerY, '#FF0000', 30);
    if (this.health <= 0) {
      this.isRunning = false;
      this.onGameOver(this.score);
    }
  }

  private loop = (timestamp: number) => {
    if (!this.isRunning) return;
    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    this.update(dt);
    this.draw();

    if (this.isRunning) {
      requestAnimationFrame(this.loop);
    }
  }

  private update(dt: number) {
    this.gameTime += dt;
    // Timers
    if (this.slownessTimer > 0) this.slownessTimer -= dt;
    if (this.swiftnessTimer > 0) this.swiftnessTimer -= dt;
    else this.piercingSword = false; // Sword expires with swiftness for simplicity, or we can make it infinite for stage

    // Player Movement (keyboard + mobile joystick)
    let dx = 0, dy = 0;
    if (this.keys['ArrowUp']) dy -= 1;
    if (this.keys['ArrowDown']) dy += 1;
    if (this.keys['ArrowLeft']) dx -= 1;
    if (this.keys['ArrowRight']) dx += 1;
    // Merge joystick input
    dx += this.joystickDx;
    dy += this.joystickDy;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx*dx + dy*dy);
      const norm = Math.min(len, 1); // clamp to unit
      let speed = this.playerSpeed;
      if (this.character === 'maijie') speed *= 1.25;
      if (this.swiftnessTimer > 0) speed *= 1.3;
      this.playerX += (dx/len) * norm * speed * dt;
      this.playerY += (dy/len) * norm * speed * dt;
    }
    
    // Bounds (respect bottomMargin so player stays in visible area)
    this.playerX = Math.max(30, Math.min(this.canvas.width - 30, this.playerX));
    this.playerY = Math.max(30, Math.min(this.canvas.height - this.bottomMargin - 30, this.playerY));

    // Spawn and Update Obstacles
    this.obstacleSpawnTimer -= dt * 1000;
    if (this.obstacleSpawnTimer <= 0) {
      this.obstacleSpawnTimer = 2000 + Math.random() * 3000;
      const isDynamic = Math.random() > 0.5;
      this.obstacles.push({
        x: Math.random() * this.canvas.width,
        y: -50,
        radius: 20 + Math.random() * 20,
        vx: isDynamic ? (Math.random() - 0.5) * 100 : 0,
        vy: 100 + Math.random() * 100,
        rotation: 0,
        rotSpeed: (Math.random() - 0.5) * 2
      });
    }

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x += obs.vx * dt;
      obs.y += obs.vy * dt;
      obs.rotation += obs.rotSpeed * dt;

      // Check collision with player
      const odx = this.playerX - obs.x;
      const ody = this.playerY - obs.y;
      if (Math.sqrt(odx*odx + ody*ody) < obs.radius + 20) {
        this.obstacles.splice(i, 1);
        this.createParticles(obs.x, obs.y, '#7D7D7D', 20);
        this.audio.playExplosion();
        if (!this.shieldActive) {
          this.health--;
          this.combo = 0;               // Bug 1 fix: reset combo on obstacle hit
          this.onHealthUpdate(this.health);
          this.onComboUpdate(this.combo); // Bug 2 fix: fire callback so UI hides
          if (this.health <= 0) {
            this.isRunning = false;
            this.onGameOver(this.score);
            return;
          }
        } else {
          this.shieldActive = false;
          this.spawnFloatText(this.playerX, this.playerY - 20, '护盾抵挡！', '#A0A0FF');
        }
        continue;
      }
      if (obs.y > this.canvas.height + 50) this.obstacles.splice(i, 1);
    }

    // Spawn logic
    if (!this.bossActive) {
      this.enemySpawnTimer -= dt * 1000;
      if (this.enemySpawnTimer <= 0) {
        if (this.mode === 'endless' || this.enemiesSpawned < this.enemiesToSpawnThisStage) {
          this.spawnEnemy();
          this.enemySpawnTimer = this.enemySpawnInterval;
        } else if (this.mode === 'story' && this.enemies.length === 0) {
          this.spawnBoss();
        }
      }
    }

    // Update Enemies
    const speedMult = this.slownessTimer > 0 ? 0.4 : 1.0;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.stateTimer += dt;

      // AI Behaviors
      if (e.type === 'zombie') {
        e.y += e.speed * dt * speedMult;
      } else if (e.type === 'creeper') {
        // Kamikaze - accelerates towards player
        const edx = this.playerX - e.x;
        const edy = this.playerY - e.y;
        const dist = Math.sqrt(edx*edx + edy*edy);
        e.x += (edx/dist) * e.speed * 1.5 * dt * speedMult;
        e.y += (edy/dist) * e.speed * 1.5 * dt * speedMult;
      } else if (e.type === 'skeleton') {
        // Stops midway, shoots arrows
        if (e.y < 200) e.y += e.speed * dt * speedMult;
        else {
          if (e.stateTimer > 2) {
            e.stateTimer = 0;
            const edx = this.playerX - e.x;
            const edy = this.playerY - e.y;
            const dist = Math.sqrt(edx*edx + edy*edy);
            this.enemyBullets.push({
              x: e.x, y: e.y, vx: (edx/dist)*200, vy: (edy/dist)*200, radius: 5, color: '#fff'
            });
          }
        }
      } else if (e.type === 'enderman') {
        e.y += e.speed * dt * speedMult;
        if (e.stateTimer > 3) {
          e.stateTimer = 0;
          e.x = Math.random() * (this.canvas.width - 100) + 50;
          this.createParticles(e.x, e.y, '#8A2BE2', 15);
        }
      } else if (e.type.startsWith('boss')) {
        if (e.y < 100) e.y += e.speed * dt;
        else {
          // Boss Strafe
          e.x += Math.sin(e.stateTimer) * 100 * dt;
          
          this.bossTimer -= dt;
          if (this.bossTimer <= 0) {
            this.bossTimer = 1.5;
            // Boss shoot
            for(let a=0; a<3; a++){
              const angle = Math.atan2(this.playerY - e.y, this.playerX - e.x) + (a-1)*0.2;
              this.enemyBullets.push({
                x: e.x, y: e.y, vx: Math.cos(angle)*250, vy: Math.sin(angle)*250, radius: 8, color: '#ff00ff'
              });
            }
          }
        }
      }
      
      // Collision with player (Ramming)
      if (Math.abs(e.x - this.playerX) < (e.width/2 + 20) && Math.abs(e.y - this.playerY) < (e.height/2 + 20)) {
        this.enemies.splice(i, 1);
        this.damagePlayer();
        continue;
      }

      if (e.y > this.canvas.height + 100) {
        this.enemies.splice(i, 1);
        this.damagePlayer();
      }
    }

    // Update Enemy Bullets
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      
      if (Math.abs(b.x - this.playerX) < 20 && Math.abs(b.y - this.playerY) < 20) {
        this.enemyBullets.splice(i, 1);
        this.damagePlayer();
        continue;
      }

      if (b.y > this.canvas.height || b.y < 0 || b.x < 0 || b.x > this.canvas.width) {
        this.enemyBullets.splice(i, 1);
      }
    }

    // Update Items
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.y += item.speed * dt;
      item.age = (item.age || 0) + dt;
      // Magnetic attract when near player
      const idx = this.items.indexOf(item);
      if (idx !== -1) {
        const magnetRadius = this.character === 'maijie' ? 240 : 120;
        const ddx = this.playerX - item.x, ddy = this.playerY - item.y;
        const d = Math.sqrt(ddx*ddx + ddy*ddy);
        if (d < magnetRadius) {
          item.x += (ddx/d) * 200 * dt;
          item.y += (ddy/d) * 200 * dt;
        }
      }
      if (Math.abs(item.x - this.playerX) < 30 && Math.abs(item.y - this.playerY) < 30) {
        this.audio.playPowerUp();
        const buffLabels: Record<string, string> = { 
          heal: '+1 生命！', powerup: '火力升级！', bomb: '获得炸弹！', 
          apple: '+1 生命！', potion: '加速中！', sword: '穿透激活！', totem: '护盾激活！' 
        };
        this.spawnFloatText(item.x, item.y - 10, buffLabels[item.type] || 'UP!', '#00FF88');
        
        if (item.type === 'heal' || item.type === 'apple') {
          this.health = Math.min(this.health + 1, this.maxHealth);
          this.onHealthUpdate(this.health);
        } else if (item.type === 'powerup') {
          this.weaponLevel = Math.min(3, this.weaponLevel + 1);
        } else if (item.type === 'bomb') {
          this.bombs = Math.min(3, this.bombs + 1);
          this.onBombsUpdate(this.bombs);
        } else if (item.type === 'potion') {
          this.swiftnessTimer = 10;
          this.slownessTimer = 5;
        } else if (item.type === 'sword') {
          this.piercingSword = true;
          this.swiftnessTimer = 10;
        } else if (item.type === 'totem') {
          this.shieldActive = true;
        }
        this.createParticles(item.x, item.y, '#ffff00', 30);
        this.items.splice(i, 1);
        continue;
      }
      if (item.y > this.canvas.height) this.items.splice(i, 1);
    }

    // Update Float Texts
    for (let i = this.floatTexts.length - 1; i >= 0; i--) {
      const ft = this.floatTexts[i];
      ft.y += ft.vy * dt;
      ft.life -= dt * 1.2;
      if (ft.life <= 0) this.floatTexts.splice(i, 1);
    }

    // Update Player Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      let targetValid = this.enemies.includes(b.target);

      // 1. Move Bullet
      let dx = 0, dy = -1;
      let distToTarget = 9999;
      if (targetValid) {
         dx = b.target.x - b.x;
         dy = b.target.y - b.y;
         distToTarget = Math.sqrt(dx*dx + dy*dy);
         const moveX = (dx / distToTarget) * b.speed * dt;
         const moveY = (dy / distToTarget) * b.speed * dt;
         b.x += moveX + (b.angleOffset ? b.angleOffset * 50 * dt : 0);
         b.y += moveY;
      } else {
         b.x += (b.angleOffset ? b.angleOffset * 50 * dt : 0);
         b.y -= b.speed * dt;
      }

      // 2. Out of bounds check
      if (b.y < -50 || b.x < -50 || b.x > this.canvas.width + 50) {
         this.bullets.splice(i, 1);
         continue;
      }

      if (b.type === 'fire') this.createParticles(b.x, b.y, '#ff4500', 1);

      // 3. Obstacle (Meteorite) Collision
      let hitObstacle = false;
      for (const obs of this.obstacles) {
        const odx = obs.x - b.x;
        const ody = obs.y - b.y;
        if (Math.sqrt(odx*odx + ody*ody) < obs.radius + 10) {
           hitObstacle = true;
           this.createParticles(b.x, b.y, '#cccccc', 5); // spark
           break;
        }
      }
      if (hitObstacle && !b.piercing) {
         this.bullets.splice(i, 1);
         continue;
      }

      // 4. Enemy Collision
      let hitEnemy: Enemy | null = null;
      if (targetValid && distToTarget < b.speed * dt) {
         hitEnemy = b.target;
      } else if (!targetValid) {
         // Stray bullet collision
         for (const e of this.enemies) {
            const edx = e.x - b.x;
            const edy = e.y - b.y;
            const hitRadius = Math.max(e.width, e.height) / 2;
            if (Math.sqrt(edx*edx + edy*edy) < hitRadius) {
               hitEnemy = e;
               break;
            }
         }
      }

      // 5. Handle Enemy Hit
      if (hitEnemy) {
        if (!b.piercing) this.bullets.splice(i, 1);
        
        hitEnemy.hp--;
        if (hitEnemy.hp <= 0) {
          const eIdx = this.enemies.indexOf(hitEnemy);
          if (eIdx !== -1) {
            const e = this.enemies[eIdx];
            this.enemies.splice(eIdx, 1);
            this.audio.playHit();
            const pts = e.type.startsWith('boss') ? 100 : 10;
            this.score += pts;
            this.onScoreUpdate(this.score);
            this.spawnFloatText(e.x, e.y - 20, `+${pts}`, '#FFFFFF');
            this.spawnItem(e.x, e.y, e.dropLoot || false);
            
            if (b.type === 'tnt' || b.type === 'laser') {
              this.audio.playExplosion();
              this.createParticles(e.x, e.y, '#FFA500', 40);
              for (let j = this.enemies.length - 1; j >= 0; j--) {
                const other = this.enemies[j];
                const odx = other.x - e.x, ody = other.y - e.y;
                if (Math.sqrt(odx*odx + ody*ody) < 200) {
                   other.hp--;
                   if (other.hp <= 0) {
                     this.createParticles(other.x, other.y, '#ff0000', 10);
                     this.enemies.splice(j, 1);
                     this.score += 10;
                   }
                }
              }
              this.onScoreUpdate(this.score);
            } else {
              this.createParticles(e.x, e.y, '#00ff00', 20);
            }

            if (e.type.startsWith('boss')) {
              this.bossActive = false;
              if (this.mode === 'story') {
                this.isRunning = false;
                this.onStageClear();
              }
            }
          }
        } else {
          this.audio.playHit();
          this.createParticles(hitEnemy.x, hitEnemy.y, '#ffffff', 5);
          if (hitEnemy.type.startsWith('boss')) {
            this.updateBossMath();
          }
        }
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.life -= dt * 1.8;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Scroll Background
    for (const s of this.bgStars) {
      s.y += s.speed * dt;
      if (s.y > this.canvas.height) {
        s.y = 0;
        s.x = Math.random() * this.canvas.width;
      }
    }
  }

  private draw() {
    this.ctx.fillStyle = '#111'; // Dark background
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Background Stars/Blocks
    for (const s of this.bgStars) {
      this.ctx.fillStyle = s.color;
      this.ctx.fillRect(s.x, s.y, s.size * 4, s.size * 4);
    }

    // Draw Items with glow and bounce
    for (const item of this.items) {
      const age = item.age || 0;
      const bounce = Math.sin(age * 5) * 4;
      const pulse = 0.6 + 0.4 * Math.sin(age * 6);
      const colors: Record<string, string> = { heal: '#FFD700', powerup: '#00FFFF', bomb: '#FFFFFF', totem: '#FF8C00', apple: '#FFD700', potion: '#B44FE8', sword: '#00FFFF' };
      const glows: Record<string, string> = { heal: 'rgba(255,215,0,', powerup: 'rgba(0,255,255,', bomb: 'rgba(255,255,255,', totem: 'rgba(255,140,0,', apple: 'rgba(255,215,0,', potion: 'rgba(180,79,232,', sword: 'rgba(0,255,255,' };
      const col = colors[item.type] || '#fff';
      const glow = glows[item.type] || 'rgba(255,255,255,';
      this.ctx.save();
      // Outer glow
      const grad = this.ctx.createRadialGradient(item.x, item.y + bounce, 4, item.x, item.y + bounce, 30);
      grad.addColorStop(0, glow + (pulse * 0.7) + ')');
      grad.addColorStop(1, glow + '0)');
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(item.x, item.y + bounce, 30, 0, Math.PI * 2);
      this.ctx.fill();
      // Item box
      this.ctx.fillStyle = col;
      this.ctx.shadowBlur = 16;
      this.ctx.shadowColor = col;
      this.ctx.fillRect(item.x - item.width/2, item.y - item.height/2 + bounce, item.width, item.height);
      this.ctx.shadowBlur = 0;
      // Icon text
      const icons: Record<string, string> = { heal: '🍎', powerup: '⚔', bomb: '⭐', totem: '🗿', apple: '🍎', potion: '⚗', sword: '⚔' };
      this.ctx.font = '20px serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(icons[item.type] || '?', item.x, item.y + bounce);
      this.ctx.restore();
    }

    // Draw Enemies
    for (const e of this.enemies) {
      this.ctx.save();
      this.ctx.translate(e.x, e.y);

      // Drop loot glow aura
      if (e.dropLoot) {
        const auraPhase = (Math.sin(this.gameTime * 4) + 1) / 2;
        const auraGrad = this.ctx.createRadialGradient(0, 0, e.width * 0.3, 0, 0, e.width * 0.9);
        auraGrad.addColorStop(0, `rgba(255, 215, 0, ${0.25 + auraPhase * 0.25})`);
        auraGrad.addColorStop(1, 'rgba(255, 140, 0, 0)');
        this.ctx.fillStyle = auraGrad;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, e.width * 0.9, 0, Math.PI * 2);
        this.ctx.fill();
        // Chest icon badge
        this.ctx.font = '14px serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🎁', e.width/2 + 4, -e.height/2 - 8);
      }
      
      let imgName = e.type as string;
      if (e.type.startsWith('boss')) {
         if (e.type === 'boss_wither' || e.type === 'boss_wither_storm') imgName = 'wither';
         else if (e.type === 'boss_spider') imgName = 'spider';
         else if (e.type === 'boss_dragon') imgName = 'enderman';
      }

      const img = this.images[imgName];
      if (img && img.complete) {
        if (e.type === 'boss_wither_storm') {
           // Make it huge and tinted maybe, or just huge
           this.ctx.drawImage(img, -e.width/2, -e.height/2, e.width, e.height);
        } else {
           this.ctx.drawImage(img, -e.width/2, -e.height/2, e.width, e.height);
        }
      } else {
        if (e.type === 'creeper') this.ctx.fillStyle = '#27c239';
        else if (e.type === 'zombie') this.ctx.fillStyle = '#006400';
        else if (e.type === 'skeleton') this.ctx.fillStyle = '#dddddd';
        else if (e.type === 'enderman') this.ctx.fillStyle = '#111111';
        else if (e.type.startsWith('boss')) this.ctx.fillStyle = '#440044';
        
        this.ctx.fillRect(-e.width/2, -e.height/2, e.width, e.height);
        
        if (e.type === 'enderman') {
          this.ctx.fillStyle = '#ff00ff';
          this.ctx.fillRect(-10, -10, 6, 4);
          this.ctx.fillRect(4, -10, 6, 4);
        }
      }

      if (e.type.startsWith('boss')) {
        this.ctx.fillStyle = '#ff0000';
        const hpBarW = 100;
        this.ctx.fillRect(-hpBarW/2, -e.height/2 - 20, hpBarW, 10);
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(-hpBarW/2, -e.height/2 - 20, hpBarW * (e.hp/e.maxHp), 10);
      }

      this.ctx.font = 'bold 18px Courier';
      const textWidth = this.ctx.measureText(e.problem).width;
      const boxWidth = Math.max(60, textWidth + 20);

      this.ctx.fillStyle = '#D2B48C';
      this.ctx.fillRect(-boxWidth/2, -e.height/2 - 30, boxWidth, 25);
      this.ctx.fillStyle = '#000';
      this.ctx.font = 'bold 18px Courier';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(e.problem, 0, -e.height/2 - 17);
      
      this.ctx.restore();
    }

    // Draw Obstacles
    for (const obs of this.obstacles) {
      this.ctx.save();
      this.ctx.translate(obs.x, obs.y);
      this.ctx.rotate(obs.rotation);
      const mImg = this.images['meteor'];
      if (mImg && mImg.complete) {
        this.ctx.drawImage(mImg, -obs.radius, -obs.radius, obs.radius * 2, obs.radius * 2);
      } else {
        this.ctx.fillStyle = '#7D7D7D';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#555';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
      }
      this.ctx.restore();
    }

    // Draw Enemy Bullets
    for (const b of this.enemyBullets) {
      this.ctx.fillStyle = b.color;
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI*2);
      this.ctx.fill();
    }

    // Draw Player
    this.ctx.save();
    this.ctx.translate(this.playerX, this.playerY);
    
    // Shield visual
    if (this.shieldActive) {
      this.ctx.strokeStyle = '#00FFFF';
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 45, 0, Math.PI*2);
      this.ctx.stroke();
    }

    if (this.character === 'jiejie') {
      if (this.images['player'] && this.images['player'].complete) {
        this.ctx.drawImage(this.images['player'], -20, -20, 40, 40);
      } else {
        this.ctx.fillStyle = '#E74C3C'; // Red/Pink
        this.ctx.fillRect(-20, -20, 40, 40);
      }
    } else {
      if (this.images['maqi'] && this.images['maqi'].complete) {
        this.ctx.drawImage(this.images['maqi'], -20, -20, 40, 40);
      } else {
        this.ctx.fillStyle = '#3498DB'; // Blue
        this.ctx.fillRect(-20, -20, 40, 40);
      }
    }
    
    // Engine flame
    this.ctx.fillStyle = '#FF4500';
    this.ctx.beginPath();
    this.ctx.moveTo(-10, 20);
    this.ctx.lineTo(10, 20);
    this.ctx.lineTo(0, 20 + Math.random()*20 + 10);
    this.ctx.fill();
    
    this.ctx.restore();

    // Draw Bullets
    for (const b of this.bullets) {
      this.ctx.save();
      this.ctx.translate(b.x, b.y);
      if (b.type === 'normal') {
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(-3, -10, 6, 20);
      } else if (b.type === 'fire') {
        this.ctx.fillStyle = '#FF4500';
        this.ctx.fillRect(-5, -15, 10, 30);
      } else if (b.type === 'tnt') {
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fillRect(-12, -12, 24, 24);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '10px Courier';
        this.ctx.fillText('TNT', -8, 4);
      } else if (b.type === 'laser') {
        this.ctx.fillStyle = '#00FFFF';
        this.ctx.fillRect(-8, -40, 16, 80);
      }
      this.ctx.restore();
    }

    // Draw Particles
    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.fillStyle = p.color;
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = p.color;
      const sz = p.size || 8;  // fixed size — fade via alpha only
      this.ctx.fillRect(p.x - sz/2, p.y - sz/2, sz, sz);
      this.ctx.restore();
    }

    // Draw Float Texts
    for (const ft of this.floatTexts) {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, ft.life);
      this.ctx.font = `bold ${18 + (1 - ft.life) * 6}px 'Courier New', monospace`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      this.ctx.lineWidth = 3;
      this.ctx.strokeText(ft.text, ft.x, ft.y);
      this.ctx.fillStyle = ft.color;
      this.ctx.fillText(ft.text, ft.x, ft.y);
      this.ctx.restore();
    }
    
    // Screen Effects
    if (this.slownessTimer > 0) {
      this.ctx.fillStyle = 'rgba(138, 43, 226, 0.1)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    if (this.swiftnessTimer > 0) {
      this.ctx.fillStyle = 'rgba(0, 255, 255, 0.05)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    if (this.bombFlashTimer > 0) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${this.bombFlashTimer})`;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.bombFlashTimer -= 0.016 * 1.5; // Approx dt
    }
    
    // Bomb HUD is now rendered in HTML (see #bomb-val in index.html)
  }
}

type EnemyType = 'zombie' | 'creeper' | 'skeleton' | 'enderman' | 'boss_spider' | 'boss_wither' | 'boss_dragon' | 'boss_wither_storm';

interface Enemy {
  x: number; y: number;
  width: number; height: number;
  speed: number;
  problem: string; answer: number;
  type: EnemyType;
  hp: number; maxHp: number;
  stateTimer: number;
  dropLoot?: boolean;
}

interface FloatText {
  x: number; y: number;
  text: string; color: string;
  life: number; vy: number;
}

interface Bullet {
  x: number; y: number;
  speed: number; target: Enemy;
  type: 'normal' | 'fire' | 'tnt' | 'laser';
  angleOffset?: number;
  piercing?: boolean;
}

interface EnemyBullet {
  x: number; y: number;
  vx: number; vy: number;
  radius: number; color: string;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; color: string;
  size?: number;
}

interface Item {
  x: number; y: number;
  width: number; height: number;
  type: 'heal' | 'powerup' | 'bomb' | 'apple' | 'potion' | 'sword' | 'totem';
  speed: number;
  age?: number;
}
