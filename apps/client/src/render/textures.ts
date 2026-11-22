import Phaser from 'phaser';

export const TEX = { hopper: 'hopper' } as const;

/**
 * Original procedural character (32×40, facing right): a mountaineer in a pointed hood with a
 * fur trim, ski goggles, a backpack and climbing boots.
 */
export function makeTextures(scene: Phaser.Scene): void {
  const g = scene.add.graphics();

  g.fillStyle(0x6d4c41); // backpack (behind, on the left since we face right)
  g.fillRoundedRect(2, 18, 9, 14, 3);

  g.fillStyle(0x3a3f58); // boots
  g.fillRoundedRect(8, 34, 8, 6, 2);
  g.fillRoundedRect(17, 34, 8, 6, 2);

  g.fillStyle(0x3a86ff); // parka body
  g.fillRoundedRect(6, 18, 21, 17, 6);
  g.fillStyle(0x2f6fd6); // zip line
  g.fillRect(18, 20, 2, 14);

  g.fillStyle(0x3a86ff); // pointed hood
  g.fillTriangle(5, 14, 27, 14, 13, 0);
  g.fillCircle(16, 13, 10);

  g.fillStyle(0xf1faee); // fur trim around the face opening
  g.fillCircle(18, 13, 8);
  g.fillStyle(0xe9c9a8); // face
  g.fillCircle(19, 13, 6);

  g.fillStyle(0x22223b); // goggle strap + lens frame
  g.fillRect(12, 9, 14, 3);
  g.fillRoundedRect(16, 8, 10, 6, 2);
  g.fillStyle(0xffbe0b); // amber goggle lens
  g.fillRoundedRect(17, 9, 8, 4, 2);

  g.fillStyle(0x8338ec); // mittens
  g.fillCircle(8, 29, 3);
  g.fillCircle(26, 28, 3);

  g.generateTexture(TEX.hopper, 32, 40);
  g.destroy();
}
