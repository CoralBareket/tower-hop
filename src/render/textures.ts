import Phaser from 'phaser';

export const TEX = { hopper: 'hopper' } as const;

/** Original procedural character: a little climber in a beanie and scarf (32×40, facing right). */
export function makeTextures(scene: Phaser.Scene): void {
  const g = scene.add.graphics();

  g.fillStyle(0x2b2d42); // boots
  g.fillRoundedRect(8, 34, 7, 6, 2);
  g.fillRoundedRect(17, 34, 7, 6, 2);

  g.fillStyle(0xf4a261); // parka
  g.fillRoundedRect(5, 20, 22, 15, 6);

  g.fillStyle(0xffe8d6); // face
  g.fillCircle(16, 14, 9);

  g.fillStyle(0x1b1b1b); // eyes
  g.fillCircle(18, 14, 1.6);
  g.fillCircle(22, 14, 1.6);

  g.fillStyle(0x2a9d8f); // beanie + pompom
  g.fillRoundedRect(7, 4, 18, 7, { tl: 7, tr: 7, bl: 0, br: 0 });
  g.fillCircle(16, 4, 3);

  g.fillStyle(0xe63946); // scarf + trailing tail
  g.fillRect(6, 20, 20, 4);
  g.fillRect(4, 20, 4, 9);

  g.generateTexture(TEX.hopper, 32, 40);
  g.destroy();
}
