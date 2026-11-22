import Phaser from 'phaser';
import { VIEW, TUNING } from '../config/tuning';
import type { ComboResult } from '../core/combo';

export const FONT = '"Trebuchet MS", system-ui, sans-serif';

export const textStyle = (size: number, color = '#ffffff'): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  fontStyle: 'bold',
  color,
  stroke: '#0b1320',
  strokeThickness: 4,
});

export interface HudState {
  score: number;
  floor: number;
  comboJumps: number;
  comboFloors: number;
  /** 0..1 time left in the current combo. */
  comboTimeLeft: number;
  /** 0..1 progress to next speed-up. */
  clock: number;
  level: number;
}

/** Screen-space overlay (scrollFactor 0): score, floor, speed-up clock, combo meter. */
export class Hud {
  private score: Phaser.GameObjects.Text;
  private floor: Phaser.GameObjects.Text;
  private combo: Phaser.GameObjects.Text;
  private gfx: Phaser.GameObjects.Graphics;

  constructor(private scene: Phaser.Scene) {
    const fix = <T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(o: T) =>
      o.setScrollFactor(0).setDepth(10);
    this.gfx = fix(scene.add.graphics());
    this.score = fix(scene.add.text(44, 12, '', textStyle(20)));
    this.floor = fix(scene.add.text(VIEW.width - 44, 12, '', textStyle(20)).setOrigin(1, 0));
    this.combo = fix(scene.add.text(VIEW.width / 2, 92, '', textStyle(22, '#ffd166')).setOrigin(0.5));
  }

  update(s: HudState): void {
    this.score.setText(`SCORE ${s.score}`);
    this.floor.setText(`FLOOR ${s.floor}`);
    this.combo.setText(s.comboJumps > 0 ? `COMBO ×${s.comboJumps} · ${s.comboFloors} floors` : '');

    const g = this.gfx;
    g.clear();

    // Speed-up clock
    const cx = 64, cy = 66, r = 18;
    g.fillStyle(0x0b1320, 0.8).fillCircle(cx, cy, r + 3);
    g.fillStyle(0xf1faee).fillCircle(cx, cy, r);
    if (s.clock > 0) {
      g.fillStyle(0xe63946, 0.35).beginPath();
      g.slice(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + s.clock * Math.PI * 2).fillPath();
    }
    const a = -Math.PI / 2 + s.clock * Math.PI * 2;
    g.lineStyle(3, 0x0b1320).lineBetween(cx, cy, cx + Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3));
    if (s.level > 0) {
      g.fillStyle(0xffd166);
      for (let i = 0; i < s.level; i++) g.fillCircle(cx + r + 10 + i * 9, cy, 3);
    }

    // Combo timer bar
    if (s.comboJumps > 0) {
      const w = 180, x = VIEW.width / 2 - w / 2, y = 110;
      g.fillStyle(0x0b1320, 0.8).fillRect(x - 2, y - 2, w + 4, 10);
      g.fillStyle(0xffd166).fillRect(x, y, w * Math.max(0, s.comboTimeLeft), 6);
    }
  }

  flashHurry(): void {
    this.popup('HURRY UP!', '#ff6b6b', VIEW.height * 0.4, 34);
  }

  popCombo(r: ComboResult): void {
    const label = r.floors >= 40 ? 'LEGENDARY!' : r.floors >= 20 ? 'AMAZING!' : r.floors >= 10 ? 'GREAT!' : 'NICE!';
    this.popup(`${label}  +${r.bonus}`, '#ffd166', VIEW.height * 0.3, 28);
  }

  private popup(text: string, color: string, y: number, size: number): void {
    const t = this.scene.add
      .text(VIEW.width / 2, y, text, textStyle(size, color))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(11);
    this.scene.tweens.add({
      targets: t,
      y: y - 50,
      alpha: { from: 1, to: 0 },
      scale: { from: 1.2, to: 1 },
      duration: 1100,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }
}

export const comboTimeFraction = (timer: number) => timer / TUNING.comboTimeout;
