import Phaser from 'phaser';
import { sound } from './audio/sound';
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

// Browsers (iOS Safari especially) only start audio from a user gesture. Resume on every
// tap/key — also recovers audio that iOS suspends when the tab is backgrounded.
for (const type of ['pointerdown', 'touchend', 'keydown'] as const) {
  window.addEventListener(type, () => sound.unlock(), { passive: true });
}

void loadFonts().then(() => {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'app',
    width: VIEW.width,
    height: VIEW.height,
    backgroundColor: '#070a12',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 3 },
    scene: [BootScene, MenuScene, GameScene, GameOverScene],
  });
  // The game is up: swap the HTML loading screen for the canvas.
  game.events.once(Phaser.Core.Events.READY, () => {
    const boot = document.getElementById('boot');
    if (boot) boot.hidden = true;
  });
});
