import Phaser from 'phaser';
import { SCENES } from '../config/constants.js';
import Player from '../entities/Player.js';
import Goomba from '../entities/Goomba.js';
import FlyingEnemy from '../entities/FlyingEnemy.js';
import PowerUp from '../entities/PowerUp.js';
import LevelManager from '../utils/LevelManager.js';
import HUD from '../utils/HUD.js';

export default class Level1Scene extends Phaser.Scene {
  constructor() {
    super(SCENES.LEVEL1);
  }

  create() {
    // Load level from JSON
    const level = LevelManager.loadLevel(this, 'level1');

    if (!level) {
      console.error('Failed to load level!');
      return;
    }

    this.platforms = level.platforms;
    this.levelData = level.levelData;

    // Create player at starting position
    this.player = new Player(this, level.playerStart.x, level.playerStart.y);

    // Create enemies
    this.enemies = this.physics.add.group();
    this.createEnemies(this.levelData.enemies);

    // Create power-ups
    this.powerups = this.physics.add.group();
    this.createPowerUps(this.levelData.powerups);

    // Collisions
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);

    // Player-Enemy overlap
    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerEnemyCollision, null, this);

    // Player-PowerUp overlap
    this.physics.add.overlap(this.player, this.powerups, this.handlePlayerPowerUpCollision, null, this);

    // Camera follow player
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Create goal marker
    this.createGoal(level.goal);

    // Create HUD
    this.hud = new HUD(this);

    // ESC key to return to menu
    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.start(SCENES.MENU);
    });
  }

  update(time, delta) {
    if (this.player) {
      this.player.update(time, delta);

      // Update HUD
      if (this.hud) {
        this.hud.update(this.player);
      }
    }

    // Update enemies
    this.enemies.children.entries.forEach(enemy => {
      if (enemy && enemy.update) {
        enemy.update();
      }
    });
  }

  createEnemies(enemiesData) {
    enemiesData.forEach(enemyData => {
      let enemy;

      if (enemyData.type === 'slime') {
        enemy = new Goomba(this, enemyData.x, enemyData.y);
      } else if (enemyData.type === 'flying') {
        enemy = new FlyingEnemy(this, enemyData.x, enemyData.y);
      }

      if (enemy) {
        this.enemies.add(enemy);
      }
    });
  }

  createPowerUps(powerupsData) {
    powerupsData.forEach(powerupData => {
      const powerup = new PowerUp(this, powerupData.x, powerupData.y, powerupData.type);
      this.powerups.add(powerup);
    });
  }

  handlePlayerPowerUpCollision(player, powerup) {
    powerup.collect(player);
  }

  handlePlayerEnemyCollision(player, enemy) {
    // Check if player is jumping on enemy from above
    if (player.body.velocity.y > 0 && player.y < enemy.y - 10) {
      // Player defeats enemy
      enemy.takeDamage();
      player.setVelocityY(-300); // Bounce player up

      // Add score
      const currentScore = this.registry.get('score') || 0;
      this.registry.set('score', currentScore + 100);
    } else {
      // Enemy damages player
      if (!player.isInvincible) {
        player.takeDamage();

        // Knockback effect
        const knockbackDirection = player.x < enemy.x ? -1 : 1;
        player.setVelocityX(knockbackDirection * 200);
        player.setVelocityY(-200);
      }
    }
  }

  createGoal(goalData) {
    // Create a simple goal marker (star)
    this.goal = this.add.text(goalData.x, goalData.y, '⭐', {
      fontSize: '64px'
    });
    this.goal.setOrigin(0.5);

    // Make it float
    this.tweens.add({
      targets: this.goal,
      y: goalData.y - 20,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Add physics for collision detection
    this.physics.add.existing(this.goal);
    this.levelCompleting = false; // Flag to prevent multiple calls
    this.physics.add.overlap(this.player, this.goal, () => {
      if (!this.levelCompleting) {
        this.levelComplete();
      }
    });
  }

  levelComplete() {
    this.levelCompleting = true; // Prevent multiple calls
    this.registry.set('currentLevel', 2);
    this.scene.start(SCENES.LEVEL2);
  }
}
