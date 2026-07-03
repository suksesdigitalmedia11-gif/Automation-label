const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');

async function main() {
  const canvas = createCanvas(800, 200);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#FFFF00';
  ctx.fillRect(0, 0, 800, 200);

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 60px Arial';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText('Test Resi Number', 400, 100);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('test-canvas.png', buffer);
  console.log('Saved test-canvas.png');
}

main().catch(console.error);
