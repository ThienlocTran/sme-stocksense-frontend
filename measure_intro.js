const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

async function run() {
  console.log('Starting Vite dev server...');
  const devServer = spawn('npm', ['run', 'dev'], {
    cwd: __dirname,
    shell: true
  });

  let serverReady = false;
  devServer.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('[Vite stdout]', output.trim());
    if (output.includes('Local:') || output.includes('http://')) {
      serverReady = true;
    }
  });

  devServer.stderr.on('data', (data) => {
    console.error('[Vite stderr]', data.toString().trim());
  });

  // Wait for the dev server to start
  for (let i = 0; i < 20; i++) {
    if (serverReady) break;
    await new Promise(r => setTimeout(r, 500));
  }

  if (!serverReady) {
    console.error('Failed to start Vite dev server.');
    devServer.kill();
    process.exit(1);
  }

  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('Navigating to app...');
  const startTime = Date.now();
  await page.goto('http://localhost:5173');

  // Wait for preloader to load
  await page.waitForSelector('#brand-intro-preloader');
  const overlayBounds = await page.locator('#brand-intro-preloader').boundingBox();
  console.log('1. Overlay Rect Bounds:', overlayBounds);

  // Wait a small delay for page load
  await new Promise(r => setTimeout(r, 200));

  const sPathLoc = page.locator('#preloader-s-path');
  const sPathBounds = await sPathLoc.boundingBox();
  console.log('2. Standalone S Bounds:', sPathBounds);

  if (sPathBounds) {
    const sCenterX = sPathBounds.x + sPathBounds.width / 2;
    const sCenterY = sPathBounds.y + sPathBounds.height / 2;
    const viewCenterX = 1440 / 2;
    const viewCenterY = 900 / 2;
    const deltaX = sCenterX - viewCenterX;
    const deltaY = sCenterY - viewCenterY;
    const delta = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    console.log(`- Visual S Center: (${sCenterX.toFixed(2)}, ${sCenterY.toFixed(2)})`);
    console.log(`- Viewport Center: (${viewCenterX}, ${viewCenterY})`);
    console.log(`- Standalone S Center Delta: ${delta.toFixed(2)}px`);
  }

  // Particle target center coordinate check
  const particlesLoc = page.locator('#preloader-particles');
  const particlesBounds = await particlesLoc.boundingBox();
  console.log('3. Particles Container Bounds:', particlesBounds);

  // Wait for the full logo to become visible and measure it
  console.log('Waiting for full logo transition...');
  const fullLogoLoc = page.locator('.full-logo-wrapper');
  await page.waitForFunction(() => {
    const el = document.querySelector('.full-logo-wrapper');
    return el && parseFloat(window.getComputedStyle(el).opacity) > 0.5;
  }, { timeout: 10000 });

  const fullLogoBounds = await fullLogoLoc.boundingBox();
  console.log('4. Full Logo Bounds:', fullLogoBounds);

  // Wait for preloader to fade out and unmount
  console.log('Waiting for intro completion and unmount...');
  await page.waitForSelector('#brand-intro-preloader', { state: 'detached', timeout: 15000 });
  const totalDuration = (Date.now() - startTime) / 1000;
  console.log(`5. Final Intro Total Duration: ${totalDuration.toFixed(2)}s`);

  // Verify sessionStorage skip behavior
  console.log('Refreshing page to check sessionStorage skip...');
  await page.reload();
  const preloaderCount = await page.locator('#brand-intro-preloader').count();
  console.log(`6. Preloader present on reload: ${preloaderCount === 1 ? 'YES' : 'NO (Successfully Skipped)'}`);

  // Cleanup
  await browser.close();
  devServer.kill();
  console.log('Test completed successfully.');
  process.exit(0);
}

run().catch(err => {
  console.error('Error running measurements:', err);
  process.exit(1);
});
