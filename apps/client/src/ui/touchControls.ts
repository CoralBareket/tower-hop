import Phaser from 'phaser';
import { VIEW } from '../config/tuning';
import type { PlayerInput } from '../core/physics';

type ButtonId = 'left' | 'right' | 'jump';
interface Button {
  id: ButtonId;
  x: number;
  y: number;
  r: number;
}

/**
 * On-screen ◀ ▶ and jump buttons for phones/tablets. Multi-touch: hold ▶ with one thumb and
 * tap jump with the other. Hit areas are 30% larger than the drawn circles, so imprecise
 * thumbs still register.
 */
export class TouchControls {
  private readonly buttons: Button[];
  private readonly gfx: Phaser.GameObjects.Graphics;
  /**
   * Jump buffer: a tap that starts AND ends between two frames would never be seen as "held",
   * so a jump-button press is remembered briefly (also forgives tapping just before landing).
   */
  private jumpBufferedUntil = 0;
  private static readonly JUMP_BUFFER_MS = 120;

  constructor(private readonly scene: Phaser.Scene) {
    scene.input.addPointer(2); // up to 3 simultaneous touches
    const y = VIEW.height - 64;
    this.buttons = [
      { id: 'left', x: 72, y, r: 44 },
      { id: 'right', x: 176, y, r: 44 },
      { id: 'jump', x: VIEW.width - 80, y, r: 54 },
    ];
    this.gfx = scene.add.graphics().setScrollFactor(0).setDepth(20);
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      if (this.hit(p, this.buttons[2])) {
        this.jumpBufferedUntil = scene.time.now + TouchControls.JUMP_BUFFER_MS;
      }
    });
    const glyph: Record<ButtonId, string> = { left: '◀', right: '▶', jump: '▲' };
    for (const b of this.buttons)
      scene.add
        .text(b.x, b.y, glyph[b.id], {
          fontFamily: 'system-ui, sans-serif',
          fontSize: `${Math.round(b.r * 0.8)}px`,
          color: '#ffffff',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(21)
        .setAlpha(0.8);
  }

  read(): PlayerInput {
    const pressed: Record<ButtonId, boolean> = { left: false, right: false, jump: false };
    for (const p of this.scene.input.manager.pointers) {
      if (!p.isDown) continue;
      for (const b of this.buttons) if (this.hit(p, b)) pressed[b.id] = true;
    }
    if (this.scene.time.now < this.jumpBufferedUntil) pressed.jump = true;
    this.draw(pressed);
    return pressed;
  }

  private hit(p: Phaser.Input.Pointer, b: Button): boolean {
    return Phaser.Math.Distance.Between(p.x, p.y, b.x, b.y) <= b.r * 1.3;
  }

  private draw(pressed: Record<ButtonId, boolean>): void {
    const g = this.gfx;
    g.clear();
    for (const b of this.buttons) {
      g.fillStyle(0x0b1320, pressed[b.id] ? 0.6 : 0.35).fillCircle(b.x, b.y, b.r);
      g.lineStyle(3, 0xffffff, pressed[b.id] ? 0.9 : 0.4).strokeCircle(b.x, b.y, b.r);
    }
  }
}
