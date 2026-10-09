const path = require('path');
const Jimp = require('jimp-compact');

async function makeAssets() {
  const assetsDir = path.join(__dirname, '../assets');

  // Deep Navy background
  const icon = new Jimp(1024, 1024, 0x102A43FF);
  await icon.writeAsync(path.join(assetsDir, 'icon.png'));
  await icon.writeAsync(path.join(assetsDir, 'adaptive-icon.png'));

  const splash = new Jimp(1242, 2436, 0x102A43FF);
  await splash.writeAsync(path.join(assetsDir, 'splash.png'));

  const favicon = new Jimp(48, 48, 0x102A43FF);
  await favicon.writeAsync(path.join(assetsDir, 'favicon.png'));

  console.log('✅ Generated 100% valid Jimp PNG assets for Expo!');
}

makeAssets().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
