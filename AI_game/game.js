document.addEventListener('DOMContentLoaded', () => {

    const Game = {
        init() {
            this.container = document.getElementById('game-container'); this.world = document.getElementById('world'); this.hpBar = document.getElementById('hp-bar'); this.gaugeBar = document.getElementById('gauge-bar'); this.gameOverScreen = document.getElementById('game-over-screen'); this.gameClearScreen = document.getElementById('game-clear-screen'); this.parallaxBgFar = document.getElementById('parallax-bg-far'); this.parallaxBgNear = document.getElementById('parallax-bg-near'); this.rideCooldownBar = document.getElementById('ride-cooldown-bar');
            this.scoreDisplay = document.getElementById('score-display');
            this.pauseScreen = document.getElementById('pause-screen'); // ポーズ画面要素を取得
            this.WIDTH = 800; this.HEIGHT = 600; this.GRAVITY = 1.4; this.JUMP_POWER = -23; this.JUMP_CUT_GRAVITY = 4.0; this.GROUND_Y = this.HEIGHT + 200;
            this.WORLD_WIDTH = 7200; this.cameraX = 0;
            
            this.stageData = {
                obstacles: [ { x: 50, y: 500, width: 300, height: 100 }, { x: 450, y: 450, width: 150, height: 40 }, { x: 700, y: 400, width: 120, height: 40 }, { x: 950, y: 450, width: 200, height: 40 }, { x: 1250, y: 380, width: 80, height: 40 }, { x: 1400, y: 320, width: 80, height: 40 }, { x: 1550, y: 260, width: 80, height: 40 }, { x: 1750, y: 350, width: 300, height: 40 }, { x: 2150, y: 300, width: 40, height: 40 }, { x: 2300, y: 250, width: 40, height: 40 }, { x: 2450, y: 200, width: 40, height: 40 }, { x: 2600, y: 400, width: 250, height: 40 }, { x: 2950, y: 400, width: 250, height: 40 }, { x: 3300, y: 350, width: 150, height: 150 }, { x: 3600, y: 250, width: 100, height: 40 }, { x: 3800, y: 200, width: 100, height: 40 }, { x: 4000, y: 150, width: 100, height: 40 }, { x: 4200, y: 400, width: 400, height: 200 }, { x: 4700, y: 450, width: 150, height: 40 }, { x: 4950, y: 420, width: 100, height: 40 }, { x: 5150, y: 380, width: 100, height: 40 }, { x: 5350, y: 340, width: 100, height: 40 }, { x: 5550, y: 350, width: 200, height: 40 }, { x: 5850, y: 400, width: 60, height: 40 }, { x: 6000, y: 350, width: 60, height: 40 }, { x: 6150, y: 300, width: 60, height: 40 }, { x: 6350, y: 400, width: 150, height: 40 }, { x: 6600, y: 480, width: 250, height: 40 }, { x: 6900, y: 400, width: 250, height: 40 }, ],
                fixedEnemies: [ { type: 'turret', x: 1000, y: 390 }, { type: 'turret', x: 1800, y: 290 }, { type: 'turret', x: 2800, y: 340 }, { type: 'turret', x: 3100, y: 340 }, { type: 'turret', x: 4400, y: 340 }, { type: 'turret', x: 5700, y: 290 }, { type: 'turret', x: 6700, y: 440 } ],
                groundEnemies: [ { type: 'onibi', x: 800, y: 400 }, { type: 'onibi', x: 1850, y: 350 }, { type: 'onibi', x: 2650, y: 400 }, { type: 'onibi', x: 3000, y: 400 }, { type: 'onibi', x: 6550, y: 500 }, ],
                damageZones: [ { x: 3300, y: 580, width: 150, height: 20 }, { x: 4200, y: 580, width: 400, height: 20 } ]
            };
            this.keys = {}; this.player = new Player(); this.gameObjects = []; this.ofudaCooldown = false; this.lastTime = 0;
            this.score = 0;
            this.gamepadIndex = null; this.prevGamepadButtons = []; this.inputState = { left: false, right: false, jump: false, shoot: false, special: false, fly: false, guard: false };
            this.initAudio();
            this.setupEventListeners(); this.startNewGame(); requestAnimationFrame((time) => this.gameLoop(time));
        },
        initAudio() {
            this.audioCtx = null;
            this.audio = {
                bgm: document.getElementById('bgm-main'), jump: document.getElementById('se-jump'), shoot: document.getElementById('se-shoot'), hit: document.getElementById('se-hit'), damage: document.getElementById('se-damage'), explosion: document.getElementById('se-explosion'), gameover: document.getElementById('se-gameover'), clear: document.getElementById('se-clear'),
            };
            if (this.audio.bgm) this.audio.bgm.volume = 0.3; if (this.audio.jump) this.audio.jump.volume = 0.4; if (this.audio.shoot) this.audio.shoot.volume = 0.3; if (this.audio.hit) this.audio.hit.volume = 0.5; if (this.audio.damage) this.audio.damage.volume = 0.6; if (this.audio.explosion) this.audio.explosion.volume = 0.7; if (this.audio.gameover) this.audio.gameover.volume = 0.5; if (this.audio.clear) this.audio.clear.volume = 0.5;
        },
        resumeAudioContext() {
            if (!this.audioCtx) { this.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
            if (this.audioCtx.state === 'suspended') { this.audioCtx.resume(); }
        },
        playBGM() {
            if (!this.audio.bgm || this.gameState === 'paused') return;
            this.resumeAudioContext();
            const playPromise = this.audio.bgm.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    const playOnInteraction = () => { this.resumeAudioContext(); this.audio.bgm.play(); document.body.removeEventListener('click', playOnInteraction); document.body.removeEventListener('keydown', playOnInteraction); };
                    document.body.addEventListener('click', playOnInteraction); document.body.addEventListener('keydown', playOnInteraction);
                });
            }
        },
        stopBGM() { if (this.audio.bgm) { this.audio.bgm.pause(); this.audio.bgm.currentTime = 0; } },
        playSE(name) { const se = this.audio[name]; if (se) { se.currentTime = 0; se.play().catch(e => {}); } },
        setupEventListeners() {
            document.addEventListener('keydown', e => {
                this.keys[e.code] = true;
                if (e.code === 'Escape' && (this.gameState === 'playing' || this.gameState === 'paused')) {
                    this.togglePause();
                }
            });
            document.addEventListener('keyup', e => this.keys[e.code] = false);
            document.getElementById('restart-button').addEventListener('click', () => this.startNewGame());
            document.getElementById('restart-button-clear').addEventListener('click', () => this.startNewGame());
            // ポーズ画面のボタン
            document.getElementById('resume-button').addEventListener('click', () => this.togglePause());
            document.getElementById('back-to-select-button').addEventListener('click', () => {
                this.stopBGM();
                window.location.href = 'stage_select.html';
            });
            window.addEventListener('gamepadconnected', e => this.handleGamepadConnected(e));
            window.addEventListener('gamepaddisconnected', e => this.handleGamepadDisconnected(e));
        },
        startNewGame() {
            document.querySelectorAll('.enemy, .ofuda, .small-ofuda, .special-ofuda, .bomb, .explosion, .obstacle, .goal, .heal-item, .enemy-bullet, .fireball, .damage-zone').forEach(el => el.remove());
            this.player.reset(); this.gameObjects = [this.player]; this.createStage(); this.gameState = 'playing'; this.gauge = 0; this.score = 0; this.updateScoreDisplay(); this.cameraX = 0; this.enemySpawnTimer = 3000; this.updateHpBar(); this.updateGaugeBar(); this.resetRideCooldownVisual(); this.gameOverScreen.classList.add('hidden'); this.gameClearScreen.classList.add('hidden');
            this.pauseScreen.classList.add('hidden');
            this.container.classList.remove('screen-shake'); this.stopBGM(); Object.values(this.audio).forEach(audioEl => audioEl && audioEl.pause()); this.playBGM();
        },
        createStage() { this.world.style.width = `${this.WORLD_WIDTH}px`; this.stageData.obstacles.forEach(d => this.add(new Obstacle(d.x, d.y, d.width, d.height))); this.stageData.fixedEnemies.forEach(d => { if (d.type === 'turret') this.add(new TurretEnemy(d.x, d.y)); }); this.stageData.groundEnemies.forEach(d => { if(d.type === 'onibi') this.add(new OnibiEnemy(d.x, d.y)); }); this.stageData.damageZones.forEach(d => this.add(new DamageZone(d.x, d.y, d.width, d.height))); 
        if (this.stageData.healItems) {
                this.stageData.healItems.forEach(d => this.add(new HealItem(d.x, d.y)));
            }
        this.add(new Goal(this.WORLD_WIDTH - 200, 200, 100, 200)); },
        gameLoop(currentTime) {
            if (this.gameState === 'paused') {
                this.lastTime = currentTime; // ポーズ中は時間を進めない
                requestAnimationFrame((time) => this.gameLoop(time));
                return;
            }
            const deltaTime = Math.min(currentTime - this.lastTime, 100);
            this.lastTime = currentTime;
            if (this.gameState === 'playing') {
                this.update(deltaTime);
                this.draw();
            }
            requestAnimationFrame((time) => this.gameLoop(time));
        },
        togglePause() {
            if (this.gameState === 'paused') {
                this.gameState = 'playing';
                this.pauseScreen.classList.add('hidden');
                this.playBGM();
            } else if (this.gameState === 'playing') {
                this.gameState = 'paused';
                this.pauseScreen.classList.remove('hidden');
                this.audio.bgm.pause();
            }
        },
        update(deltaTime) {
            this.updateInputState(); this.enemySpawnTimer -= deltaTime; if (this.enemySpawnTimer <= 0) { this.spawnEnemy(); this.enemySpawnTimer = 2500 + Math.random() * 2000; } this.gameObjects.forEach(obj => obj.update(deltaTime)); this.updateCamera(); this.gameObjects = this.gameObjects.filter(obj => !obj.isDestroyed);
        },
        // ... (以降のメソッドとクラス定義は変更なし) ...
        updateInputState() {
            if (Object.values(this.keys).some(k => k) || (this.gamepadIndex !== null && navigator.getGamepads()[this.gamepadIndex].buttons.some(b => b.pressed))) { this.resumeAudioContext(); }
            this.inputState.left = this.keys.ArrowLeft; this.inputState.right = this.keys.ArrowRight; this.inputState.jump = this.keys.Space; this.inputState.shoot = this.keys.KeyX; this.inputState.fly = this.keys.KeyZ; this.inputState.guard = this.keys.KeyA;
            if (this.keys.KeyC && this.gauge >= 100) this.activateSpecialAttack();
            if (this.gamepadIndex !== null) {
                const gamepad = navigator.getGamepads()[this.gamepadIndex];
                if (gamepad) {
                    const deadZone = 0.3;
                    this.inputState.left = this.inputState.left || gamepad.axes[0] < -deadZone || gamepad.buttons[14].pressed; this.inputState.right = this.inputState.right || gamepad.axes[0] > deadZone || gamepad.buttons[15].pressed; this.inputState.jump = this.inputState.jump || gamepad.buttons[0].pressed; this.inputState.fly = this.inputState.fly || gamepad.buttons[1].pressed; this.inputState.shoot = this.inputState.shoot || gamepad.buttons[2].pressed; this.inputState.guard = this.inputState.guard || gamepad.buttons[4].pressed;
                    if (gamepad.buttons[3].pressed && !this.prevGamepadButtons[3] && this.gauge >= 100) { this.activateSpecialAttack(); }
                    if (gamepad.buttons[9].pressed && !this.prevGamepadButtons[9] && (this.gameState === 'playing' || this.gameState === 'paused')) { this.togglePause(); } // ゲームパッドのStartボタン(9)でもポーズ
                    this.prevGamepadButtons = gamepad.buttons.map(b => b.pressed);
                }
            }
        },
        handleGamepadConnected(e) { if (this.gamepadIndex === null) { this.gamepadIndex = e.gamepad.index; console.log(`Gamepad connected at index ${e.gamepad.index}: ${e.gamepad.id}.`); } },
        handleGamepadDisconnected(e) { if (this.gamepadIndex === e.gamepad.index) { this.gamepadIndex = null; this.prevGamepadButtons = []; console.log(`Gamepad disconnected from index ${e.gamepad.index}.`); } },
        updateCamera() { const targetX = this.player.x - this.WIDTH / 2; this.cameraX += (targetX - this.cameraX) * 0.1; this.cameraX = Math.max(0, Math.min(this.cameraX, this.WORLD_WIDTH - this.WIDTH)); this.parallaxBgFar.style.backgroundPositionX = `-${this.cameraX * 0.2}px`; this.parallaxBgNear.style.backgroundPositionX = `-${this.cameraX * 0.5}px`; },
        draw() { this.world.style.left = `-${this.cameraX}px`; this.gameObjects.forEach(obj => obj.draw()); },
        add(gameObject) { this.gameObjects.push(gameObject); },
        spawnEnemy() { const spawnSide = Math.random() < 0.5 ? 'left' : 'right'; const x = spawnSide === 'left' ? this.cameraX - 70 : this.cameraX + this.WIDTH; const speed = (Math.random() * 2 + 1.5) * (spawnSide === 'left' ? 1 : -1); this.add(new AirEnemy(x, speed)); },
        activateSpecialAttack() { if(this.gameState !== 'playing' || this.gauge < 100) return; this.gauge = 0; this.updateGaugeBar(); this.add(new SpecialOfuda(this.player.x, this.player.y, this.player.direction)); },
        checkRectCollision: (o1, o2) => o1.x < o2.x + o2.width && o1.x + o1.width > o2.x && o1.y < o2.y + o2.height && o1.y + o1.height > o2.y,
        updateHpBar() { const hpPercent = this.player.hp / this.player.maxHp * 100; this.hpBar.style.width = `${hpPercent}%`; this.hpBar.classList.toggle("warning", hpPercent <= 50 && hpPercent > 25); this.hpBar.classList.toggle("danger", hpPercent <= 25);},
        updateGaugeBar() { this.gaugeBar.style.width = `${this.gauge}%`; },
        addScore(value) { this.score += value; this.updateScoreDisplay(); },
        updateScoreDisplay() { this.scoreDisplay.textContent = this.score; },
        handleGameOver() { this.gameState = "gameOver"; this.gameOverScreen.classList.remove("hidden"); this.player.destroy(); this.stopBGM(); this.playSE('gameover'); },
        handleGameClear() { if (this.gameState === 'playing') { this.gameState = "cleared"; this.gameClearScreen.classList.remove("hidden"); this.player.vx = 0; this.stopBGM(); this.playSE('clear'); } },
        startRideCooldownVisual() { this.rideCooldownBar.style.transition = 'none'; this.rideCooldownBar.style.width = '0%'; void this.rideCooldownBar.offsetWidth; this.rideCooldownBar.style.transition = `width ${this.player.rideCooldownTime / 1000}s linear`; this.rideCooldownBar.style.width = '100%'; },
        resetRideCooldownVisual() { this.rideCooldownBar.style.transition = 'none'; this.rideCooldownBar.style.width = '100%'; }
    };
    class GameObject { constructor(className) { this.element = document.createElement('div'); this.element.className = className; Game.world.appendChild(this.element); this.isDestroyed = false; } update(deltaTime) {} draw() { this.element.style.left = `${this.x}px`; this.element.style.top = `${this.y}px`; } destroy() { if(!this.isDestroyed) { this.isDestroyed = true; this.element.remove(); } } }
    class Player extends GameObject {
        constructor() {
            super('');
            this.element = document.getElementById('player');
            this.type = 'player';
            this.width = 48; this.height = 64; this.maxHp = 100; this.moveSpeed = 6; this.airMoveSpeed = 3.5;
            this.rideEffect = document.getElementById('player-ride-ofuda');
            this.rideDuration = 800; this.rideCooldownTime = 15000; this.rideSpeed = 10; this.rideLift = 1.5;
            this.vx_inertia = 0; this.chargeThreshold = 300; this.isDamagedByZone = false;
            this.guardEffect = document.getElementById('player-guard-effect');
            this.isGuarding = false;
            this.isGuardBroken = false;
            this.runAnimTimer = 0;
            this.runAnimDuration = 600;
        }
        reset() {
            this.x = 150; this.y = 500 - this.height; this.vx = 0; this.vy = 0; this.direction = 'right'; this.hp = this.maxHp; this.isInvincible = false; this.isKnockback = false; this.isDestroyed = false; this.element.style.visibility = 'visible'; this.element.classList.remove('invincible', 'is-idling', 'is-running', 'is-jumping', 'is-charging'); this.element.classList.add('is-idling'); this.prevY = this.y; this.onGround = true; this.isRidingOfuda = false; this.ofudaRideCooldown = false; this.ofudaRideTimer = 0; this.rideEffect.style.display = 'none'; this.vx_inertia = 0; this.isChargingAttack = false; this.chargeStartTime = 0; this.isDamagedByZone = false; this.isGuarding = false; this.isGuardBroken = false; this.guardEffect.style.display = 'none'; this.guardEffect.classList.remove('guard-break');
            this.runAnimTimer = 0;
        }
        update(deltaTime) {
            if (this.isDestroyed || Game.gameState === 'cleared') return;
            if (this.onGround && this.vx !== 0) {
                this.runAnimTimer = (this.runAnimTimer + deltaTime) % this.runAnimDuration;
            } else {
                this.runAnimTimer = 0;
            }

            if (this.isGuardBroken) { this.vy += Game.GRAVITY; this.y += this.vy; this.handleObstacleCollision(); this.updateAnimation(); return; }
            this.handleGuard();
            if (this.isGuarding) { this.vx = 0; this.vx_inertia = 0; this.vy += Game.GRAVITY; this.y += this.vy; } else if (this.isKnockback) { this.vy += Game.GRAVITY; this.x += this.vx; this.y += this.vy; } else if (this.isRidingOfuda) { this.ofudaRideTimer -= deltaTime; if (!Game.inputState.fly || this.ofudaRideTimer <= 0) { this.isRidingOfuda = false; this.rideEffect.style.display = 'none'; this.vx = 0; this.vx_inertia = 0; } else { this.vx = this.rideSpeed * (this.direction === 'right' ? 1 : -1); this.vy = -this.rideLift; this.x += this.vx; this.y += this.vy; } } else { if (Game.inputState.fly && !this.ofudaRideCooldown) { this.isRidingOfuda = true; this.ofudaRideCooldown = true; this.ofudaRideTimer = this.rideDuration; this.rideEffect.style.display = 'block'; Game.startRideCooldownVisual(); this.vy = 0; this.vx = 0; this.vx_inertia = 0; setTimeout(() => { this.ofudaRideCooldown = false; }, this.rideCooldownTime); } else { let vx_control = 0; if (this.onGround) { this.vx_inertia = 0; if (Game.inputState.left) { vx_control = -this.moveSpeed; this.direction = 'left'; } else if (Game.inputState.right) { vx_control = this.moveSpeed; this.direction = 'right'; } if (Game.inputState.jump) { this.vy = Game.JUMP_POWER; this.onGround = false; this.vx_inertia = vx_control; Game.playSE('jump'); } } else { if (Game.inputState.left) { vx_control = -this.airMoveSpeed; this.direction = 'left'; } else if (Game.inputState.right) { vx_control = this.airMoveSpeed; this.direction = 'right'; } } this.vx = this.vx_inertia + vx_control; this.vx = Math.max(-this.moveSpeed, Math.min(this.vx, this.moveSpeed)); if (Game.inputState.shoot && !this.isChargingAttack && !Game.ofudaCooldown) { this.isChargingAttack = true; this.chargeStartTime = performance.now(); this.element.classList.add('is-charging'); } if (!Game.inputState.shoot && this.isChargingAttack) { const chargeTime = performance.now() - this.chargeStartTime; if (chargeTime < this.chargeThreshold) { Game.add(new SmallOfuda(this.x, this.y, this.direction)); } else { Game.add(new Ofuda(this.x, this.y, this.direction)); } Game.ofudaCooldown = true; setTimeout(() => Game.ofudaCooldown = false, 400); this.isChargingAttack = false; this.element.classList.remove('is-charging'); Game.playSE('shoot'); } if (this.vy < 0 && !Game.inputState.jump) { this.vy += Game.JUMP_CUT_GRAVITY; } this.vy += Game.GRAVITY; this.x += this.vx; this.y += this.vy; } }
            this.handleObstacleCollision(); this.handleAllCollisions();
            this.x = Math.max(0, Math.min(this.x, Game.WORLD_WIDTH - this.width)); if (this.y > Game.HEIGHT) Game.handleGameOver(); this.prevY = this.y;
            this.updateAnimation();
        }
        updateAnimation() { this.element.classList.remove('is-idling', 'is-running', 'is-jumping'); if (this.isRidingOfuda) { this.element.classList.add('is-jumping'); } else if (!this.onGround) { this.element.classList.add('is-jumping'); } else if (this.vx !== 0) { this.element.classList.add('is-running'); } else { this.element.classList.add('is-idling'); } }
        handleGuard() { const canGuard = Game.inputState.guard && !this.isRidingOfuda && !this.isChargingAttack && !this.isGuardBroken && Game.gauge > 0; if (canGuard) { if (!this.isGuarding) { this.isGuarding = true; this.guardEffect.style.display = 'block'; } } else { if (this.isGuarding) { this.isGuarding = false; this.guardEffect.style.display = 'none'; } } }
        triggerGuardBreak() { if (this.isGuardBroken) return; this.isGuardBroken = true; this.isGuarding = false; this.guardEffect.style.display = 'block'; this.guardEffect.classList.add('guard-break'); setTimeout(() => { this.isGuardBroken = false; this.guardEffect.style.display = 'none'; this.guardEffect.classList.remove('guard-break'); }, 800); }
        handleObstacleCollision() { const platforms = Game.gameObjects.filter(obj => obj.isPlatform); let landedOnPlatform = false; platforms.forEach(obs => { if (!Game.checkRectCollision(this, obs)) return; const prevBottom = this.prevY + this.height; if (this.vy >= 0 && prevBottom <= obs.y) { this.y = obs.y - this.height; this.vy = 0; landedOnPlatform = true; } else if (this.vy < 0 && this.prevY >= obs.y + obs.height) { this.y = obs.y + obs.height; this.vy = 0; } else if (this.x + this.width > obs.x && this.prevX + this.width <= obs.x) { this.x = obs.x - this.width; this.vx_inertia = 0; } else if (this.x < obs.x + obs.width && this.prevX >= obs.x + obs.width) { this.x = obs.x + obs.width; this.vx_inertia = 0; } }); this.onGround = landedOnPlatform; this.prevX = this.x; }
        handleAllCollisions() {
            const enemies = Game.gameObjects.filter(o => o.type === 'enemy'); const projectiles = Game.gameObjects.filter(o => o.type === 'bomb' || o.type === 'enemy-bullet'); const ofudas = Game.gameObjects.filter(o => o.type === 'ofuda' || o.type === 'special-ofuda' || o.type === 'small-ofuda'); const items = Game.gameObjects.filter(o => o.type === 'heal-item' || o.type === 'goal'); const damageZones = Game.gameObjects.filter(o => o.type === 'damage-zone');
            [...enemies, ...projectiles].forEach(hazard => { if (Game.checkRectCollision(this, hazard)) { if (this.isGuarding && !this.isInvincible) { const originalDamage = hazard.damage || 15; const damageReductionRate = Game.gauge / 100; const actualDamage = Math.round(originalDamage * (1 - damageReductionRate)); if (actualDamage > 0) { this.takeDamage(actualDamage, 0, { noKnockback: true, isGuarded: true }); } Game.gauge = Math.max(0, Game.gauge - originalDamage); Game.updateGaugeBar(); if (Game.gauge <= 0) { this.triggerGuardBreak(); } if (hazard.type === 'bomb' || hazard.type === 'enemy-bullet') { if (hazard.type === 'bomb') Game.add(new Explosion(hazard.x, hazard.y)); hazard.destroy(); } } else if (!this.isInvincible) { const knockbackDir = hazard.x < this.x ? 1 : -1; this.takeDamage(hazard.damage || 15, knockbackDir, { noKnockback: !!hazard.noKnockback }); if (hazard.type === 'bomb' || hazard.type === 'enemy-bullet') { if (hazard.type === 'bomb') Game.add(new Explosion(hazard.x, hazard.y)); hazard.destroy(); } } } });
            ofudas.forEach(ofuda => { enemies.forEach(enemy => { if (Game.checkRectCollision(ofuda, enemy)) { enemy.takeDamage(ofuda.damage); if (ofuda.type !== 'special-ofuda') { ofuda.destroy(); } } }); });
            items.forEach(item => { if (Game.checkRectCollision(this, item)) { if (item.type === 'heal-item') { this.hp = Math.min(this.maxHp, this.hp + 25); Game.updateHpBar(); item.destroy(); } else if (item.type === 'goal') { Game.handleGameClear(); } } });
            damageZones.forEach(zone => { if(Game.checkRectCollision(this, zone) && !this.isDamagedByZone) { this.isDamagedByZone = true; this.takeDamage(zone.damage, 0, { isContinuous: true }); setTimeout(() => { this.isDamagedByZone = false; }, zone.damageInterval); }});
        }
        takeDamage(amount, knockbackDirection, options = {}) {
            if (this.isInvincible) return; this.hp = Math.max(0, this.hp - amount); Game.updateHpBar(); Game.container.classList.add('screen-shake'); setTimeout(() => Game.container.classList.remove('screen-shake'), 200); Game.playSE('damage');
            if (this.hp <= 0) { Game.handleGameOver(); return; } if (options.isContinuous) return; this.isInvincible = true; this.element.classList.add('invincible'); if (!options.noKnockback) { this.isKnockback = true; this.vy = -8; this.vx = 4 * knockbackDirection; this.vx_inertia = 0; setTimeout(() => { this.isKnockback = false; }, 300); }
            const invincibleTime = options.isGuarded ? 200 : (options.noKnockback ? 500 : 1500); setTimeout(() => { this.isInvincible = false; this.element.classList.remove('invincible'); }, invincibleTime);
        }
        draw(){
            if(this.isDestroyed)return;
            this.element.style.left=`${this.x}px`;
            this.element.style.top=`${this.y}px`;
            const scaleX = this.direction === "left" ? 1 : -1;
            let translateY = 0;
            if (this.onGround && this.vx !== 0) {
                if (this.runAnimTimer > this.runAnimDuration / 2) {
                    translateY = -2;
                }
            }
            
            this.element.style.transform = `scaleX(${scaleX}) translateY(${translateY}px)`;
        }
        destroy() { this.isDestroyed = true; this.element.style.visibility = 'hidden'; }
    }
    class Obstacle extends GameObject { constructor(x, y, width, height) { super("obstacle"); this.type = "obstacle"; this.x = x; this.y = y; this.width = width; this.height = height; this.element.style.width = `${width}px`; this.element.style.height = `${height}px`; this.isPlatform = true; } }
    class SmallOfuda extends GameObject { constructor(playerX, playerY, direction) { super("small-ofuda"); this.type = "small-ofuda"; this.width = 15; this.height = 30; this.damage = 15; const yOffset = playerY + 38; this.x = playerX + (direction === "right" ? 38 : -8); this.y = yOffset; this.speed = 15 * (direction === "right" ? 1 : -1); } update() { this.x += this.speed; (this.x < Game.cameraX - 50 || this.x > Game.cameraX + Game.WIDTH + 50) && this.destroy(); } }
    class Ofuda extends GameObject { constructor(playerX, playerY, direction) { super("ofuda"); this.type = "ofuda"; this.width = 20; this.height = 40; this.damage = 30; const yOffset = playerY + 32; this.x = playerX + (direction === "right" ? 38 : -18); this.y = yOffset; this.speed = 12 * (direction === "right" ? 1 : -1); } update() { this.x += this.speed; (this.x < Game.cameraX - 50 || this.x > Game.cameraX + Game.WIDTH + 50) && this.destroy(); } }
    class SpecialOfuda extends GameObject { constructor(playerX, playerY, direction) { super("special-ofuda"); this.type = "special-ofuda"; this.width = 40; this.height = 80; this.damage = 100; const yOffset = playerY + 32; this.x = playerX + (direction === "right" ? 38 : -38); this.y = yOffset - this.height / 2; this.speed = 15 * (direction === "right" ? 1 : -1); } update() { this.x += this.speed; (this.x < Game.cameraX - 50 || this.x > Game.cameraX + Game.WIDTH + 50) && this.destroy(); } }
    class Enemy extends GameObject { constructor(className, hp) { super(`enemy ${className}`); this.type = "enemy"; this.hp = hp; this.maxHp = hp; const hpBar = document.createElement("div"); hpBar.className = "enemy-hp-bar"; this.hpBarInner = document.createElement("div"); this.hpBarInner.className = "enemy-hp-bar-inner"; hpBar.appendChild(this.hpBarInner); this.element.appendChild(hpBar); } takeDamage(amount) { if (this.isDestroyed) return; this.hp = Math.max(0, this.hp - amount); this.hpBarInner.style.width = `${this.hp / this.maxHp * 100}%`; Game.playSE('hit'); if (this.hp <= 0) this.destroy({ gainGauge: true }); } destroy(options = { gainGauge: false }) { if (this.isDestroyed) return; if (options.gainGauge) { Game.gauge = Math.min(100, Game.gauge + 25); Game.updateGaugeBar(); Game.addScore(this.scoreValue || 0); if (Math.random() < 0.3) { Game.add(new HealItem(this.x, this.y)); } } super.destroy(); } }
    class AirEnemy extends Enemy { constructor(x, speed) { super("enemy-air", 40); this.scoreValue = 10; this.width = 60; this.height = 60; this.x = x; this.y = 200 * Math.random() + 50; this.speed = speed; this.shootCooldown = 150 + 80 * Math.random(); this.shootTimer = this.shootCooldown; } update() { this.x += this.speed; this.shootTimer--; if (this.shootTimer <= 0) { Game.add(new Fireball(this.x + this.width / 2, this.y + this.height / 2, Game.player)); this.shootTimer = this.shootCooldown; } (this.x > Game.cameraX + Game.WIDTH + 100 || this.x < Game.cameraX - 100) && this.destroy(); } }
    class TurretEnemy extends Enemy { constructor(x, y) { super('turret-enemy', 80); this.scoreValue = 20; this.width = 60; this.height = 60; this.x = x; this.y = y; this.shootCooldown = 180; this.shootTimer = Math.random() * 180; this.eye = document.createElement('div'); this.eye.className = 'turret-eye'; this.element.appendChild(this.eye); } update() { if (this.isDestroyed) return; const player = Game.player; const dx = player.x - this.x; const dy = player.y - this.y; const distance = Math.sqrt(dx * dx + dy * dy); if (distance < 500) { const angle = Math.atan2(player.y + player.height/2 - (this.y + 35), player.x + player.width/2 - (this.x + 30)); this.eye.style.transform = `translate(${Math.cos(angle) * 4}px, ${Math.sin(angle) * 4}px)`; this.shootTimer--; if (this.shootTimer <= 0) { Game.add(new EnemyBullet(this.x + 30, this.y + 35, angle)); this.shootTimer = this.shootCooldown; } } } }
    class OnibiEnemy extends Enemy { constructor(x, y) { super('onibi-enemy', 50); this.scoreValue = 15; this.width = 40; this.height = 40; this.x = x; this.y = y - this.height; this.vx = (Math.random() < 0.5 ? 1 : -1) * 1.5; this.vy = 0; this.prevX = this.x; this.prevY = this.y; this.damage = 12; } update(deltaTime) { if (this.isDestroyed) return; this.vy += Game.GRAVITY; this.x += this.vx; this.y += this.vy; const platforms = Game.gameObjects.filter(obj => obj.isPlatform); let onGround = false; let reversedByWall = false; platforms.forEach(p => { if (!Game.checkRectCollision(this, p)) return; const prevBottom = this.prevY + this.height; if (this.vy >= 0 && prevBottom <= p.y) { this.y = p.y - this.height; this.vy = 0; onGround = true; } else if (this.y + this.height > p.y && this.prevY < p.y + p.height) { if (this.vx > 0 && this.prevX + this.width <= p.x) { this.x = p.x - this.width; this.vx *= -1; reversedByWall = true; } else if (this.vx < 0 && this.prevX >= p.x + p.width) { this.x = p.x + p.width; this.vx *= -1; reversedByWall = true; } } }); if (onGround && !reversedByWall) { const edgeCheckX = this.vx > 0 ? this.x + this.width : this.x; const groundCheckPos = { x: edgeCheckX, y: this.y + this.height + 1, width: 1, height: 1 }; const isGroundAhead = platforms.some(p => Game.checkRectCollision(groundCheckPos, p)); if (!isGroundAhead) { this.x -= this.vx; this.vx *= -1; } } this.prevX = this.x; this.prevY = this.y; } }
    class EnemyBullet extends GameObject { constructor(x, y, angle) { super('enemy-bullet'); this.type = 'enemy-bullet'; this.width = 20; this.height = 20; this.x = x - this.width / 2; this.y = y - this.height / 2; this.speed = 6; this.vx = Math.cos(angle) * this.speed; this.vy = Math.sin(angle) * this.speed; this.damage = 10; } update() { this.x += this.vx; this.y += this.vy; if (this.x < Game.cameraX - 50 || this.x > Game.cameraX + Game.WIDTH + 50 || this.y < -50 || this.y > Game.HEIGHT + 50) this.destroy(); } }
    class Fireball extends GameObject { constructor(x, y, targetPlayer) { super('fireball'); this.type = 'enemy-bullet'; this.width = 25; this.height = 25; this.x = x - this.width / 2; this.y = y - this.height / 2; this.speed = 4.5; this.damage = 8; this.noKnockback = true; const dx = (targetPlayer.x + targetPlayer.width / 2) - this.x; const dy = (targetPlayer.y + targetPlayer.height / 2) - this.y; const angle = Math.atan2(dy, dx); this.vx = Math.cos(angle) * this.speed; this.vy = Math.sin(angle) * this.speed; } update() { this.x += this.vx; this.y += this.vy; const obstacles = Game.gameObjects.filter(obj => obj.isPlatform); for (const obs of obstacles) { if (Game.checkRectCollision(this, obs)) { this.destroy(); return; } } if (this.x < Game.cameraX - 50 || this.x > Game.cameraX + Game.WIDTH + 50 || this.y < -50 || this.y > Game.HEIGHT + 50) this.destroy(); } }
    class Explosion extends GameObject { constructor(x, y) { super("explosion"); this.type = "effect"; this.width = 100; this.height = 100; this.x = x - 50; this.y = y - 50; Game.playSE('explosion'); setTimeout(() => this.destroy(), 300); } }
    class Bomb extends GameObject { constructor(x, y) { super("bomb"); this.type = "bomb"; this.width = 20; this.height = 20; this.x = x + 25; this.y = y; this.vy = 0; this.damage = 18;} update() { this.vy += Game.GRAVITY; this.y += this.vy; const obstacles = Game.gameObjects.filter(obj => obj.type === 'obstacle'); for (const obs of obstacles) { if (Game.checkRectCollision(this, obs)) { Game.add(new Explosion(this.x, obs.y - this.height/2)); this.destroy(); return; } } if (this.y > Game.HEIGHT) this.destroy(); } }
    class HealItem extends GameObject { constructor(x, y) { super('heal-item'); this.type = 'heal-item'; this.width = 35; this.height = 35; this.x = x; this.y = y; this.vy = -5; this.lifeSpan = 8000; } update(deltaTime) { this.vy += Game.GRAVITY * 0.7; this.y += this.vy; const obstacles = Game.gameObjects.filter(obj => obj.isPlatform); for (const obs of obstacles) { if (this.vy >= 0 && Game.checkRectCollision(this, obs) && this.y + this.height < obs.y + 20) { this.y = obs.y - this.height; this.vy = 0; break; } } this.lifeSpan -= deltaTime; if (this.lifeSpan <= 0) this.destroy(); } }
    class Goal extends GameObject { constructor(x, y, width, height) { super('goal'); this.type = 'goal'; this.x = x; this.y = y; this.width = width; this.height = height; this.element.style.width = `${width}px`; this.element.style.height = `${height}px`; } }
    class DamageZone extends GameObject { constructor(x, y, width, height) { super('damage-zone'); this.type = 'damage-zone'; this.x = x; this.y = y; this.width = width; this.height = height; this.damage = 4; this.damageInterval = 500; this.element.style.width = `${width}px`; this.element.style.height = `${height}px`; } }

    Game.init();
});