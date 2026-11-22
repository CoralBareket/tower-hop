import Phaser from 'phaser';
import { TUNING, VIEW } from '../config/tuning';
import type { Platform } from '../core/physics';
import type { Theme } from './themes';

const BRICK = 32;

/** Brick side walls, drawn only for the rows currently on screen. */
export function drawWalls(g: Phaser.GameObjects.Graphics, cameraTop: number, theme: Theme): void {
  const first = Math.floor(cameraTop / BRICK) - 1;
  const last = first + Math.ceil(VIEW.height / BRICK) + 2;
  const right = TUNING.wallRight;
  const w = TUNING.wallLeft;

  g.fillStyle(theme.wall);
  g.fillRect(0, first * BRICK, w, (last - first) * BRICK);
  g.fillRect(right, first * BRICK, VIEW.width - right, (last - first) * BRICK);

  g.fillStyle(theme.wallJoint);
  for (let r = first; r <= last; r++) {
    const y = r * BRICK;
    g.fillRect(0, y, w, 2);
    g.fillRect(right, y, VIEW.width - right, 2);
    const jx = ((r % 2) + 2) % 2 === 0 ? BRICK / 2 : 0;
    g.fillRect(jx, y, 2, BRICK);
    g.fillRect(right + jx, y, 2, BRICK);
  }

  // Inner shadow where the shaft meets the walls
  g.fillStyle(0x000000, 0.25);
  g.fillRect(w, first * BRICK, 4, (last - first) * BRICK);
  g.fillRect(right - 4, first * BRICK, 4, (last - first) * BRICK);
}

export function drawPlatform(g: Phaser.GameObjects.Graphics, p: Platform, theme: Theme): void {
  const w = p.x2 - p.x1;
  const h = TUNING.platformThickness;
  g.fillStyle(theme.plat);
  g.fillRect(p.x1, p.y, w, h);
  g.fillStyle(theme.platTop);
  g.fillRect(p.x1, p.y, w, 4);
  g.fillStyle(0x000000, 0.25);
  g.fillRect(p.x1, p.y + h - 3, w, 3);
}
