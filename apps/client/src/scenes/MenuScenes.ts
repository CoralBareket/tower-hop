import Phaser from 'phaser';
import { TUNING, VIEW } from '../config/tuning';
import { api, ApiRequestError } from '../api/client';
import { session } from '../api/session';
import { sound } from '../audio/sound';
import { makeTag } from '../render/graffiti';
import { textStyle } from '../render/hud';
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
  const w = TUNING.wallRight - TUNING.wallLeft;
  const ledge = (floor: number, y: number, from: number, to: number) =>
    drawPlatform(
      g,
      { floor, y, x1: TUNING.wallLeft + w * from, x2: TUNING.wallLeft + w * to },
      theme,
    );
  ledge(0, VIEW.height - 40, 0, 1);
}

/** Wait a beat before accepting input, so a held key from the previous run doesn't skip the screen. */
function onFreshPress(scene: Phaser.Scene, key: string, fn: () => void): void {
  scene.time.delayedCall(350, () => scene.input.keyboard!.once(`keydown-${key}`, fn));
}

const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

export class MenuScene extends Phaser.Scene {
  private account!: Phaser.GameObjects.Text;
  private board!: Phaser.GameObjects.Text;

  constructor() {
    super('menu');
  }

  create(): void {
    backdrop(this);
    const cx = VIEW.width / 2;
    let seed = 7;
    const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    makeTag(this, cx - 20, 480, 'SUMMIT HOP', {
      size: 58,
      color: 0xff4d6d,
      angle: -7,
      alpha: 0.3,
      rng,
    });
    makeTag(this, cx + 80, 555, 'no way but up', {
      size: 24,
      color: 0x4cc9f0,
      angle: 4,
      alpha: 0.35,
      rng,
    });

    this.add.text(cx, 70, 'SUMMIT HOP', textStyle(46, '#ffd166')).setOrigin(0.5);
    this.add.text(cx, 118, '← → run    SPACE / ↑ jump    M mute', textStyle(16)).setOrigin(0.5);
    this.add
      .text(
        cx,
        166,
        'Run fast before jumping to leap higher.\nBounce off walls to keep your speed.\nSkip 2+ floors per jump to chain combos.',
        { ...textStyle(14, '#cfe3ff'), align: 'center', lineSpacing: 4 },
      )
      .setOrigin(0.5);

    this.account = this.add.text(cx, 226, '', textStyle(16, '#80ed99')).setOrigin(0.5);
    const prompt = this.add.text(cx, 266, 'PRESS SPACE', textStyle(24)).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.2, yoyo: true, repeat: -1, duration: 600 });

    this.add.text(cx, 312, 'TOP CLIMBERS', textStyle(18, '#ffd166')).setOrigin(0.5);
    this.board = this.add
      .text(cx, 334, 'loading…', { ...textStyle(14, '#f1faee'), fontFamily: MONO, lineSpacing: 3 })
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

    this.renderAccount();
    this.loadLeaderboard();

    onFreshPress(this, 'SPACE', () => {
      sound.unlock(); // key press = user gesture, which browsers require before playing audio
      this.scene.start('game');
    });
    this.input.keyboard!.on('keydown-L', () => this.toggleLogin());
  }

  private renderAccount(): void {
    if (!this.account.active) return; // scene already left while a request was in flight
    this.account.setText(
      session.user
        ? `Hi ${session.user.username} · best ${session.best}    [L] log out`
        : `Guest · best ${loadBest()}    [L] log in / sign up`,
    );
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

  private toggleLogin(): void {
    if (session.user) {
      void api
        .logout()
        .catch(() => {})
        .finally(() => {
          session.clear();
          this.renderAccount();
        });
    } else {
      openAuthPanel(this, () => {
        this.renderAccount();
        this.loadLeaderboard();
      });
    }
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
    this.add.text(cx, 130, 'YOU FELL!', textStyle(44, '#ff6b6b')).setOrigin(0.5);
    this.add
      .text(
        cx,
        230,
        `SCORE ${data.score}\nFLOOR ${data.floor}\nBEST COMBO ${data.bestCombo} floors`,
        { ...textStyle(22), align: 'center', lineSpacing: 8 },
      )
      .setOrigin(0.5);
    const status = this.add.text(cx, 320, '', textStyle(22, '#ffd166')).setOrigin(0.5);
    const hint = this.add.text(cx, 352, '', textStyle(14, '#cfe3ff')).setOrigin(0.5);
    this.add.text(cx, 420, 'SPACE retry    ESC menu', textStyle(18)).setOrigin(0.5);

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
            hint.setText('Log in again from the menu (ESC)');
          } else {
            status.setText('Score not saved');
            hint.setText(e instanceof Error ? e.message : '');
          }
        });
    } else {
      status.setText(localBest ? 'NEW BEST!' : `BEST ${loadBest()}`);
      hint.setText('Log in on the menu to join the leaderboard');
    }

    onFreshPress(this, 'SPACE', () => {
      sound.unlock();
      this.scene.start('game');
    });
    onFreshPress(this, 'ESC', () => this.scene.start('menu'));
  }
}
