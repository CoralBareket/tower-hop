import Phaser from 'phaser';
import { TUNING, VIEW } from '../config/tuning';
import { rngFor } from '../core/tower';

export const GRAFFITI_FONT = '"Permanent Marker", "Marker Felt", "Comic Sans MS", cursive';

const WORDS = [
  'SUMMIT HOP',
  'KEEP CLIMBING',
  'NO WAY BUT UP',
  'HOP!',
  'HIGHER!',
  'SKY OR BUST',
  "DON'T LOOK DOWN",
];
const COLORS = [0xff4d6d, 0x4cc9f0, 0xffd166, 0x80ed99, 0xc77dff, 0xff9f1c];
const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

/** Floors that get a tag painted just above them. */
const TAG_EVERY = 9;
const TAG_OFFSET = 4;

export interface TagOptions {
  size: number;
  color: number;
  angle: number;
  alpha: number;
  rng: () => number;
}

/**
 * A spray-paint tag: marker-font text with a dark outline, a soft glow (overspray)
 * and a few paint drips running down from the letters.
 */
export function makeTag(scene: Phaser.Scene, x: number, y: number, word: string, o: TagOptions) {
  const text = scene.add
    .text(0, 0, word, {
      fontFamily: GRAFFITI_FONT,
      fontSize: `${o.size}px`,
      color: hex(o.color),
      stroke: '#0b1320',
      strokeThickness: Math.max(4, o.size / 8),
    })
    .setOrigin(0.5)
    .setShadow(0, 0, hex(o.color), o.size / 3, true, true);

  const drips = scene.add.graphics();
  drips.fillStyle(o.color);
  const count = 3 + Math.floor(o.rng() * 4);
  const baseY = text.height * 0.28;
  for (let i = 0; i < count; i++) {
    const dx = (o.rng() - 0.5) * text.width * 0.85;
    const len = 6 + o.rng() * o.size * 0.7;
    const w = 2 + o.rng() * 2;
    drips.fillRect(dx - w / 2, baseY, w, len);
    drips.fillCircle(dx, baseY + len, w * 0.9);
  }

  return scene.add.container(x, y, [drips, text]).setAngle(o.angle).setAlpha(o.alpha).setDepth(-1);
}

/** Streams tags in/out of the tower as the camera moves, like the floor labels. */
export class GraffitiLayer {
  private tags = new Map<number, Phaser.GameObjects.Container>();

  constructor(
    private scene: Phaser.Scene,
    private seed: number,
  ) {}

  update(bottomFloor: number, topFloor: number): void {
    for (let f = Math.max(0, bottomFloor - 1); f <= topFloor + 1; f++) {
      if (f % TAG_EVERY === TAG_OFFSET && !this.tags.has(f)) this.tags.set(f, this.create(f));
    }
    for (const [f, tag] of this.tags) {
      if (f < bottomFloor - 4) {
        tag.destroy();
        this.tags.delete(f);
      }
    }
  }

  private create(floor: number) {
    const rng = rngFor(this.seed ^ 0x5eed, floor);
    const first = floor === TAG_OFFSET;
    const word = first ? 'SUMMIT HOP' : WORDS[Math.floor(rng() * WORDS.length)];
    const inner = TUNING.wallRight - TUNING.wallLeft;
    const x = VIEW.width / 2 + (rng() - 0.5) * inner * 0.3;
    const y = -floor * TUNING.floorSpacing - TUNING.floorSpacing * 0.9;
    const size = first ? 54 : 30 + Math.floor(rng() * 18);
    return makeTag(this.scene, x, y, word, {
      size,
      color: COLORS[Math.floor(rng() * COLORS.length)],
      angle: (rng() - 0.5) * 16,
      alpha: 0.38,
      rng,
    });
  }
}
