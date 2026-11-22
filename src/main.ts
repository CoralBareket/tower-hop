import Phaser from 'phaser';
import { VIEW } from './config/tuning';
import { GameScene } from './scenes/GameScene';
import { BootScene, GameOverScene, MenuScene } from './scenes/MenuScenes';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: VIEW.width,
  height: VIEW.height,
  backgroundColor: '#070a12',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, MenuScene, GameScene, GameOverScene],
});
