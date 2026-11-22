import Phaser from 'phaser';
import { VIEW } from './config/tuning';
import { GameScene } from './scenes/GameScene';
import { BootScene, GameOverScene, MenuScene } from './scenes/MenuScenes';

/** Canvas text can't use a web font until it has loaded, so wait for it (but never block the game on it). */
async function loadFonts(): Promise<void> {
  try {
    await Promise.race([
      document.fonts.load('48px "Permanent Marker"'),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  } catch {
    /* fall back to system fonts */
  }
}

void loadFonts().then(
  () =>
    new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'app',
      width: VIEW.width,
      height: VIEW.height,
      backgroundColor: '#070a12',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [BootScene, MenuScene, GameScene, GameOverScene],
    }),
);
