import Phaser from 'phaser';
import { TUNING, VIEW } from '../config/tuning';
import { api, ApiRequestError } from '../api/client';
import { session } from '../api/session';
import { sound } from '../audio/sound';
import { GAME_TAG, makeTag } from '../render/graffiti';
import { FONT, textStyle } from '../render/hud';
import { makeTextures, TEX } from '../render/textures';
import { THEMES } from '../render/themes';
import { openAuthPanel } from '../ui/authPanel';
import { drawPlatform, drawWalls } from '../render/world';
import { loadBest, saveBest } from '../storage';

/** Generates procedural textures once, checks for an existing login, then hands off to the menu. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }
  create(): void {
    makeTextures(this);
    void session.refresh().finally(() => this.scene.start('menu'));
  }
}

function backdrop(scene: Phaser.Scene): void {
  const theme = THEMES[0];
  scene.cameras.main.setBackgroundColor(theme.bg);
  const g = scene.add.graphics();
  drawWalls(g, 0, theme);
  drawPlatform(
    g,
    { floor: 0, y: VIEW.height - 40, x1: TUNING.wallLeft, x2: TUNING.wallRight },
    theme,
  );
}

/** Wait a beat before accepting input, so a held key from the previous run doesn't skip the screen. */
function onFreshPress(scene: Phaser.Scene, key: string, fn: () => void): void {
  scene.time.delayedCall(350, () => scene.input.keyboard?.once(`keydown-${key}`, fn));
}

/** A big, thumb-friendly tappable button (also works with a mouse). */
function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onTap: () => void,
  { primary = false, size = 22 } = {},
): Phaser.GameObjects.Text {
  const b = scene.add
    .text(x, y, label, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      fontStyle: 'bold',
      color: primary ? '#0b1320' : '#f1faee',
      backgroundColor: primary ? '#ffd166' : '#2b4237',
      padding: { x: 22, y: 10 },
    })
    .setOrigin(0.5)
    .setDepth(5)
    .setInteractive({ useHandCursor: true });
  b.on('pointerdown', () => b.setScale(0.95));
  b.on('pointerout', () => b.setScale(1));
  b.on('pointerup', () => {
    b.setScale(1);
    onTap();
  });
  return b;
}

function muteButton(scene: Phaser.Scene): void {
  const icon = () => (sound.isMuted ? '🔇' : '🔊');
  const b = scene.add
    .text(VIEW.width - 52, 26, icon(), { fontSize: '26px' })
    .setOrigin(0.5)
    .setDepth(5)
    .setInteractive({ useHandCursor: true });
  const toggle = () => {
    sound.toggleMute();
    b.setText(icon());
  };
  b.on('pointerup', toggle);
  scene.input.keyboard?.on('keydown-M', toggle);
}

const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

/** Offer sign-in automatically once per page load; afterwards it's one tap away. */
let offeredLogin = false;

export class MenuScene extends Phaser.Scene {
  private account!: Phaser.GameObjects.Text;
  private accountButton!: Phaser.GameObjects.Text;
  private board!: Phaser.GameObjects.Text;

  constructor() {
    super('menu');
  }

  create(): void {
    backdrop(this);
    const cx = VIEW.width / 2;
    const touch = this.sys.game.device.input.touch;
    let seed = 7;
    const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    makeTag(this, cx - 20, 500, GAME_TAG, {
      size: 58,
      color: 0xff4d6d,
      angle: -7,
      alpha: 0.25,
      rng,
    });
    makeTag(this, cx + 80, 565, 'no way but up', {
      size: 24,
      color: 0x4cc9f0,
      angle: 4,
      alpha: 0.3,
      rng,
    });

    this.add.text(cx, 56, 'TowerHop', textStyle(48, '#ffd166')).setOrigin(0.5);
    this.add.text(cx, 92, 'ENDLESS TOWER-JUMPING', textStyle(13, '#4cc9f0')).setOrigin(0.5);
    this.add
      .text(
        cx,
        120,
        touch ? '◀ ▶ buttons run    ▲ jumps' : '← → run    SPACE / ↑ jump    M mute',
        textStyle(16),
      )
      .setOrigin(0.5);
    this.add
      .text(
        cx,
        156,
        'Run fast before jumping to leap higher.\nBounce off walls · skip 2+ floors for combos.',
        { ...textStyle(14, '#cfe3ff'), align: 'center', lineSpacing: 4 },
      )
      .setOrigin(0.5);

    this.account = this.add.text(cx, 202, '', textStyle(16, '#80ed99')).setOrigin(0.5);
    const play = button(this, cx, 252, touch ? '▶  PLAY' : '▶  PLAY  (SPACE)', () => this.start(), {
      primary: true,
      size: 26,
    });
    this.tweens.add({ targets: play, scale: 1.05, yoyo: true, repeat: -1, duration: 700 });
    this.accountButton = button(this, cx, 310, '', () => this.toggleLogin(), { size: 18 });

    this.add.text(cx, 360, 'TOP CLIMBERS', textStyle(18, '#ffd166')).setOrigin(0.5);
    this.board = this.add
      .text(cx, 382, 'loading…', { ...textStyle(14, '#f1faee'), fontFamily: MONO, lineSpacing: 2 })
      .setOrigin(0.5, 0);

    const hopper = this.add.image(TUNING.wallLeft + 40, VIEW.height - 60, TEX.hopper);
    this.tweens.add({
      targets: hopper,
      y: hopper.y - 60,
      yoyo: true,
      repeat: -1,
      duration: 420,
      ease: 'Quad.easeOut',
    });
    muteButton(this);

    this.renderAccount();
    this.loadLeaderboard();

    onFreshPress(this, 'SPACE', () => this.start());
    this.input.keyboard?.on('keydown-L', () => this.toggleLogin());

    if (!session.user && !offeredLogin) {
      offeredLogin = true;
      this.time.delayedCall(250, () => this.openLogin());
    }
  }

  private start(): void {
    sound.unlock(); // a tap/key press = user gesture, which browsers require before playing audio
    this.scene.start('game');
  }

  private renderAccount(): void {
    if (!this.account.active) return; // scene already left while a request was in flight
    if (session.user) {
      this.account.setText(`Hi ${session.user.username} · best ${session.best}`);
      this.accountButton.setText('LOG OUT');
    } else {
      this.account.setText(`Playing as guest · best ${loadBest()}`);
      this.accountButton.setText('LOG IN / SIGN UP');
    }
  }

  private loadLeaderboard(): void {
    api
      .leaderboard()
      .then(({ entries }) => {
        if (!this.board.active) return;
        this.board.setText(
          entries.length
            ? entries
                .map(
                  (e, i) =>
                    `${String(i + 1).padStart(2)}. ${e.username.padEnd(20)}${String(e.best).padStart(7)}`,
                )
                .join('\n')
            : 'No scores yet — be the first!',
        );
      })
      .catch((e: unknown) => {
        if (!this.board.active) return;
        this.board.setText(
          e instanceof ApiRequestError && e.status === 0
            ? 'Leaderboard offline'
            : 'Could not load leaderboard',
        );
      });
  }

  private openLogin(): void {
    openAuthPanel(this, () => {
      this.renderAccount();
      this.loadLeaderboard();
    });
  }

  private toggleLogin(): void {
    if (!session.user) return this.openLogin();
    void api
      .logout()
      .catch(() => {})
      .finally(() => {
        session.clear();
        this.renderAccount();
      });
  }
}

export interface GameOverData {
  score: number;
  floor: number;
  bestCombo: number;
  durationMs: number;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('gameover');
  }
  create(data: GameOverData): void {
    backdrop(this);
    const localBest = saveBest(data.score); // always keep the on-device record too
    const cx = VIEW.width / 2;
    this.add.text(cx, 120, 'YOU FELL!', textStyle(44, '#ff6b6b')).setOrigin(0.5);
    this.add
      .text(
        cx,
        220,
        `SCORE ${data.score}\nFLOOR ${data.floor}\nBEST COMBO ${data.bestCombo} floors`,
        {
          ...textStyle(22),
          align: 'center',
          lineSpacing: 8,
        },
      )
      .setOrigin(0.5);
    const status = this.add.text(cx, 310, '', textStyle(22, '#ffd166')).setOrigin(0.5);
    const hint = this.add.text(cx, 342, '', textStyle(14, '#cfe3ff')).setOrigin(0.5);

    const retry = () => {
      sound.unlock();
      this.scene.start('game');
    };
    const menu = () => this.scene.start('menu');
    // Delay the buttons a moment so a frantic last tap doesn't instantly hit RETRY.
    this.time.delayedCall(400, () => {
      button(this, cx, 410, '↻  RETRY', retry, { primary: true, size: 26 });
      button(this, cx, 476, 'MENU', menu, { size: 20 });
    });

    if (session.user) {
      status.setText('Saving score…');
      const previousBest = session.best;
      api
        .submitScore(data)
        .then(({ best, rank }) => {
          session.best = best;
          if (!status.active) return;
          status.setText(
            best > previousBest ? `NEW BEST!  RANK #${rank}` : `BEST ${best} · RANK #${rank}`,
          );
        })
        .catch((e: unknown) => {
          if (!status.active) return;
          if (e instanceof ApiRequestError && e.status === 401) {
            session.clear();
            status.setText('Session expired');
            hint.setText('Log in again from the menu');
          } else {
            status.setText('Score not saved');
            hint.setText(e instanceof Error ? e.message : '');
          }
        });
    } else {
      status.setText(localBest ? 'NEW BEST!' : `BEST ${loadBest()}`);
      hint.setText('Log in from the menu to join the leaderboard');
    }

    onFreshPress(this, 'SPACE', retry);
    onFreshPress(this, 'ESC', menu);
  }
}
