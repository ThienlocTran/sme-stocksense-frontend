<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { gsap } from 'gsap'

const emit = defineEmits(['complete'])
const svgRef = ref(null)
const overlayRef = ref(null)
let timeline = null

// Play/Replay intro sequence
function playIntro() {
  if (timeline) {
    timeline.kill()
  }

  // Ensure scroll is locked during the intro
  if (typeof document !== 'undefined') {
    document.body.style.overflow = 'hidden'
  }

  // Kill existing animations on target elements to prevent race conditions on manual replay
  const elements = [
    svgRef.value,
    '.left-panel',
    '.right-panel',
    '#s-body',
    '#swoosh-path',
    '#swoosh-highlight',
    '#box-1',
    '#box-2',
    '#box-3',
    '#pixel-1',
    '#pixel-2',
    '#pixel-3',
    '#pixel-4',
    '#wordmark-left',
    '#wordmark-ense',
    '#sense-mark'
  ]
  gsap.killTweensOf(elements)

  // 1. Check for reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (prefersReducedMotion) {
    // Accessibility: Fast simple fade transition
    gsap.set(svgRef.value, { opacity: 1, scale: 1, filter: 'none' })
    gsap.set('#wordmark-left', { opacity: 1, x: 0, y: 0 })
    gsap.set('#s-body', { opacity: 1, scale: 1 })
    gsap.set('#swoosh-path', { strokeDashoffset: 0 })
    gsap.set('#swoosh-highlight', { strokeDashoffset: 0 })
    gsap.set(['#box-1', '#box-2', '#box-3'], { scale: 1, opacity: 1 })
    gsap.set(['#pixel-1', '#pixel-2', '#pixel-3', '#pixel-4'], { scale: 1, opacity: 1 })
    gsap.set('#wordmark-ense', { opacity: 1, x: 0 })

    gsap.to(overlayRef.value, {
      duration: 0.6,
      opacity: 0,
      ease: 'power2.inOut',
      onComplete: () => {
        if (typeof document !== 'undefined') {
          document.body.style.overflow = ''
        }
        emit('complete')
      }
    })
    return
  }

  // 2. Set initial positions/states
  // Parent SVG: invisible, slightly scaled down, blurred
  gsap.set(svgRef.value, { opacity: 0, scale: 0.96, filter: 'blur(8px)' })
  
  // Left and Right panels meeting in the middle
  gsap.set('.left-panel', { xPercent: 0 })
  gsap.set('.right-panel', { xPercent: 0 })
  
  // S-body: hidden, scaled down
  gsap.set('#s-body', { opacity: 0, scale: 0.82, transformOrigin: 'center center' })
  
  // Swoosh paths: dashoffset 100 for SVG drawing sweep (based on pathLength="100")
  gsap.set('#swoosh-path', { strokeDasharray: 100, strokeDashoffset: 100 })
  gsap.set('#swoosh-highlight', { strokeDasharray: 100, strokeDashoffset: 100 })
  
  // Inventory boxes: hidden, translated down, scaled down
  gsap.set(['#box-1', '#box-2', '#box-3'], { opacity: 0, scale: 0.6, y: 24 })
  
  // Pixels: hidden, scaled down, offset bottom-left for up-right growth transition
  gsap.set(['#pixel-1', '#pixel-2', '#pixel-3', '#pixel-4'], { opacity: 0, scale: 0, x: -12, y: 12 })
  
  // Wordmarks: hidden, offset left and right respectively
  gsap.set('#wordmark-left', { opacity: 0, x: -45 })
  gsap.set('#wordmark-ense', { opacity: 0, x: 45 })

  // 3. Initialize GSAP timeline with exact requested timing sequence
  timeline = gsap.timeline()

  // 0.00s: Intro background is visible, everything else is hidden.
  // 0.05s: Fade and scale in the main SVG parent to start the logo presentation
  timeline.to(svgRef.value, {
    duration: 0.8,
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    ease: 'power3.out'
  }, 0.05)

  // 0.10s–0.45s: #s-body appears (opacity 0 -> 1, scale 0.82 -> 1)
  timeline.fromTo('#s-body', 
    { opacity: 0, scale: 0.82 },
    { duration: 0.35, opacity: 1, scale: 1, ease: 'power3.out' },
    0.10
  )

  // 0.35s–0.80s: #swoosh-path draws itself from lower-left toward upper-right
  timeline.fromTo('#swoosh-path',
    { strokeDashoffset: 100 },
    { duration: 0.45, strokeDashoffset: 0, ease: 'power2.inOut' },
    0.35
  )
  
  // Swoosh highlight follows slightly behind
  timeline.fromTo('#swoosh-highlight',
    { strokeDashoffset: 100 },
    { duration: 0.45, strokeDashoffset: 0, ease: 'power2.inOut' },
    0.42
  )

  // 0.65s–1.00s: Animate inventory cubes box-1, box-2, box-3
  // Stagger: 0.07. Individual centroid coordinate origins for perfect scaling
  timeline.fromTo(['#box-1', '#box-2', '#box-3'],
    { opacity: 0, scale: 0.6, y: 24 },
    { 
      duration: 0.35, 
      opacity: 1, 
      scale: 1, 
      y: 0, 
      transformOrigin: '32px 36px', 
      ease: 'back.out(1.2)', 
      stagger: 0.07 
    },
    0.65
  )

  // 0.90s–1.20s: Animate pixels 1 to 4 sequentially upward/rightward (1 -> 3 -> 2 -> 4)
  timeline.fromTo(['#pixel-1', '#pixel-3', '#pixel-2', '#pixel-4'],
    { opacity: 0, scale: 0, x: -12, y: 12 },
    {
      duration: 0.30,
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0,
      transformOrigin: 'center center',
      ease: 'back.out(1.2)',
      stagger: 0.08
    },
    0.90
  )

  // 1.05s–1.50s: Reveal wordmarks
  // SMEStock slides/reveals from left, ense reveals/slides from right
  timeline.fromTo('#wordmark-left',
    { opacity: 0, x: -45 },
    { duration: 0.45, opacity: 1, x: 0, ease: 'power3.out' },
    1.05
  )
  
  timeline.fromTo('#wordmark-ense',
    { opacity: 0, x: 45 },
    { duration: 0.45, opacity: 1, x: 0, ease: 'power3.out' },
    1.05
  )

  // 1.50s–1.75s: Full logo now complete. Apply a tiny settling motion
  timeline.fromTo(svgRef.value,
    { scale: 1.02 },
    { duration: 0.25, scale: 1, ease: 'power2.out' },
    1.50
  )

  // 1.75s–2.00s: Hold the completed logo briefly.
  // 2.00s-2.35s: Fade out the logo in preparation for the split reveal
  timeline.to(svgRef.value, {
    duration: 0.35,
    opacity: 0,
    scale: 0.98,
    ease: 'power2.inOut'
  }, 2.00)

  // 2.10s-2.75s: SPLIT REVEAL. Left panel slides left, right panel slides right.
  timeline.to('.left-panel', {
    duration: 0.65,
    xPercent: -100,
    ease: 'power4.inOut'
  }, 2.10)

  timeline.to('.right-panel', {
    duration: 0.65,
    xPercent: 100,
    ease: 'power4.inOut'
  }, 2.10)

  // Complete sequence: release scroll locking, unmount intro
  timeline.add(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = ''
    }
    emit('complete')
  })
}

onMounted(() => {
  playIntro()
})

onUnmounted(() => {
  if (timeline) {
    timeline.kill()
  }
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})

// Expose play function for development replay
defineExpose({
  play: playIntro
})
</script>

<template>
  <div ref="overlayRef" class="brand-intro-overlay">
    <!-- Split Reveal Panels -->
    <div class="intro-panel left-panel"></div>
    <div class="intro-panel right-panel"></div>
    
    <!-- Large Centered Animated Branding Content -->
    <div class="intro-content">
      <svg 
        ref="svgRef"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 2200 460"
        class="logo-svg"
        role="img"
        aria-labelledby="intro-title intro-desc"
      >
        <title id="intro-title">SME StockSense full wordmark</title>
        <desc id="intro-desc">Full vector SME StockSense logo with grouped SVG layers for web and GSAP use.</desc>

        <defs>
          <linearGradient id="gradTop" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#047857"/>
            <stop offset="55%" stop-color="#10B981"/>
            <stop offset="100%" stop-color="#84CC16"/>
          </linearGradient>
          <linearGradient id="gradBottom" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stop-color="#065F46"/>
            <stop offset="55%" stop-color="#059669"/>
            <stop offset="100%" stop-color="#22C55E"/>
          </linearGradient>
          <linearGradient id="gradSwoosh" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stop-color="#0F766E"/>
            <stop offset="60%" stop-color="#10B981"/>
            <stop offset="100%" stop-color="#A3E635"/>
          </linearGradient>
        </defs>

        <g id="wordmark-left" fill="#0F2347">
          <path d="M 132.37 317.70 C 175.50 317.70 C 201.12 297.82 C 201.12 264.11 C 201.12 238.31 C 185.06 223.57 C 148.01 216.17 L 133.27 213.26 C 114.19 209.31 C 106.21 204.28 C 106.21 195.18 C 106.21 184.73 C 116.88 177.43 C 132.16 177.43 C 148.11 177.43 C 158.79 185.95 C 159.90 199.78 L 197.28 199.78 C 196.27 165.54 C 171.69 144.98 C 131.58 144.98 C 92.30 144.98 C 65.78 165.97 C 65.78 197.09 C 65.78 221.45 C 82.53 237.63 C 115.20 244.35 L 132.37 247.83 C 152.50 252.00 C 161.12 257.50 C 161.12 267.06 C 161.12 278.06 C 149.80 285.24 C 132.73 285.24 C 113.40 285.24 C 101.61 275.79 C 101.04 259.73 L 62.51 259.73 C 62.51 296.71 C 87.81 317.70 C 132.37 317.70 Z M 219.41 315.00 L 259.05 315.00 L 259.05 242.55 C 259.05 231.55 C 258.26 211.46 C 257.83 192.24 C 263.33 211.79 C 268.94 231.77 C 272.42 242.55 L 296.90 315.00 L 329.60 315.00 L 353.60 242.55 C 357.20 231.34 C 362.95 210.31 C 368.55 190.01 C 368.12 209.88 C 367.22 231.12 C 367.22 242.55 L 367.22 315.00 L 406.86 315.00 L 406.86 147.68 L 346.99 147.68 L 325.65 213.37 C 322.52 224.04 C 317.45 242.44 C 313.32 258.29 C 309.15 242.44 C 303.98 224.04 C 300.74 213.37 L 279.18 147.68 L 219.41 147.68 L 219.41 315.00 Z M 428.41 315.00 L 553.08 315.00 L 553.08 280.64 L 468.84 280.64 L 468.84 247.62 L 546.68 247.62 L 546.68 214.27 L 468.84 214.27 L 468.84 182.03 L 553.08 182.03 L 553.08 147.68 L 428.41 147.68 L 428.41 315.00 Z M 637.41 317.70 C 680.53 317.70 C 706.16 297.82 C 706.16 264.11 C 706.16 238.31 C 690.09 223.57 C 653.04 216.17 L 638.31 213.26 C 619.22 209.31 C 611.25 204.28 C 611.25 195.18 C 611.25 184.73 C 621.92 177.43 C 637.19 177.43 C 653.15 177.43 C 663.82 185.95 C 664.94 199.78 L 702.31 199.78 C 701.30 165.54 C 676.72 144.98 C 636.62 144.98 C 597.34 144.98 C 570.82 165.97 C 570.82 197.09 C 570.82 221.45 C 587.56 237.63 C 620.23 244.35 L 637.41 247.83 C 657.53 252.00 C 666.16 257.50 C 666.16 267.06 C 666.16 278.06 C 654.84 285.24 C 637.77 285.24 C 618.43 285.24 C 606.65 275.79 C 606.07 259.73 L 567.55 259.73 C 567.55 296.71 C 592.85 317.70 C 637.41 317.70 Z M 799.13 196.41 L 774.76 196.41 L 774.76 164.06 L 736.02 164.06 L 736.02 196.41 L 715.79 196.41 L 715.79 226.27 L 736.02 226.27 L 736.02 281.65 C 736.02 304.65 C 748.81 315.00 C 777.24 315.00 L 799.13 315.00 L 799.13 285.14 L 785.76 285.14 C 777.13 285.14 C 774.76 282.76 C 774.76 275.15 L 774.76 226.27 L 799.13 226.27 L 799.13 196.41 Z M 872.13 317.70 C 909.29 317.70 C 934.44 293.33 C 934.44 255.70 C 934.44 218.29 C 909.29 193.71 C 872.13 193.71 C 834.97 193.71 C 809.71 218.29 C 809.71 255.70 C 809.71 293.33 C 834.97 317.70 C 872.13 317.70 Z M 872.13 286.93 C 858.54 286.93 C 848.88 275.79 C 848.88 255.70 C 848.88 235.72 C 858.65 224.47 C 872.13 224.47 C 885.61 224.47 C 895.38 235.72 C 895.38 255.70 C 895.38 275.79 C 885.61 286.93 C 872.13 286.93 Z M 1007.47 317.70 C 1041.03 317.70 C 1064.86 297.03 C 1065.65 268.07 L 1028.24 268.07 C 1026.76 279.64 C 1019.68 287.04 C 1008.26 287.04 C 993.88 287.04 C 985.33 275.15 C 985.33 255.70 C 985.33 236.26 C 993.77 224.37 C 1008.26 224.37 C 1019.68 224.37 C 1027.12 231.66 C 1028.34 243.02 L 1065.65 243.02 C 1063.96 213.91 C 1040.49 193.71 C 1007.47 193.71 C 970.74 193.71 C 946.16 218.87 C 946.16 255.70 C 946.16 292.65 C 970.74 317.70 C 1007.47 317.70 Z M 1081.80 315.00 L 1120.43 315.00 L 1120.43 279.75 L 1128.63 270.19 L 1158.85 315.00 L 1203.41 315.00 L 1157.38 248.19 L 1201.51 196.41 L 1156.95 196.41 L 1120.90 238.53 L 1120.43 238.53 L 1120.43 147.68 L 1081.80 147.68 L 1081.80 315.00 Z"/>
        </g>
        
        <g id="sense-mark" transform="translate(1238.41 78.00) scale(0.59)">
          <g id="s-body">
            <path id="s-body-top"
              d="M118 96 C152 62 197 48 252 48 H365 C382 48 394 63 389 78 L376 113 C372 125 361 133 348 133 H241 C211 133 189 142 173 158 C158 173 154 192 163 205 C174 222 199 226 226 214 L262 198 L300 236 L245 261 C188 287 129 274 97 231 C63 185 76 130 118 96 Z"
              fill="url(#gradTop)"
            />

            <path id="s-body-bottom"
              d="M214 279 L254 258 L293 294 L267 307 C250 316 241 329 245 342 C250 359 271 368 301 368 H354 C380 368 395 358 400 340 C405 322 394 307 374 296 L338 277 L367 238 L414 264 C461 290 479 334 466 379 C452 427 410 454 350 454 H185 C170 454 160 438 168 425 L194 384 C199 376 208 372 218 372 H301 C319 372 331 366 334 356 C338 344 330 334 314 327 L278 311 L240 330 L214 279 Z"
              fill="url(#gradBottom)"
            />
          </g>

          <g id="swoosh">
            <path id="swoosh-path"
              d="M83 405 C145 340 212 292 278 255 C345 217 395 178 424 134"
              fill="none"
              stroke="url(#gradSwoosh)"
              stroke-width="22"
              stroke-linecap="round"
              stroke-linejoin="round"
              pathLength="100"
            />
            <path id="swoosh-highlight"
              d="M91 396 C154 334 219 288 283 252 C346 216 390 182 416 145"
              fill="none"
              stroke="#D9F99D"
              stroke-width="4"
              stroke-linecap="round"
              opacity="0.42"
              pathLength="100"
            />
          </g>

          <g id="inventory">
            <g id="box-1" transform="translate(225 315)">
              <polygon points="32,0 64,18 32,36 0,18" fill="#22C55E"/>
              <polygon points="0,18 32,36 32,72 0,54" fill="#047857"/>
              <polygon points="64,18 32,36 32,72 64,54" fill="#059669"/>
              <polyline points="32,0 64,18 32,36 0,18 32,0 32,36 32,72" fill="none" stroke="#FFFFFF" stroke-width="3"/>
              <polyline points="0,18 0,54 32,72 64,54 64,18" fill="none" stroke="#FFFFFF" stroke-width="3"/>
            </g>
            <g id="box-2" transform="translate(180 350)">
              <polygon points="32,0 64,18 32,36 0,18" fill="#16A34A"/>
              <polygon points="0,18 32,36 32,72 0,54" fill="#047857"/>
              <polygon points="64,18 32,36 32,72 64,54" fill="#059669"/>
              <polyline points="32,0 64,18 32,36 0,18 32,0 32,36 32,72" fill="none" stroke="#FFFFFF" stroke-width="3"/>
              <polyline points="0,18 0,54 32,72 64,54 64,18" fill="none" stroke="#FFFFFF" stroke-width="3"/>
            </g>
            <g id="box-3" transform="translate(270 350)">
              <polygon points="32,0 64,18 32,36 0,18" fill="#22C55E"/>
              <polygon points="0,18 32,36 32,72 0,54" fill="#059669"/>
              <polygon points="64,18 32,36 32,72 64,54" fill="#16A34A"/>
              <polyline points="32,0 64,18 32,36 0,18 32,0 32,36 32,72" fill="none" stroke="#FFFFFF" stroke-width="3"/>
              <polyline points="0,18 0,54 32,72 64,54 64,18" fill="none" stroke="#FFFFFF" stroke-width="3"/>
            </g>
          </g>

          <g id="pixels" fill="url(#gradTop)">
            <rect id="pixel-1" x="391" y="92" width="22" height="22" rx="4"/>
            <rect id="pixel-2" x="421" y="73" width="20" height="20" rx="4"/>
            <rect id="pixel-3" x="424" y="103" width="20" height="20" rx="4"/>
            <rect id="pixel-4" x="449" y="49" width="26" height="26" rx="5"/>
          </g>
        </g>

        <g id="wordmark-ense" fill="#16A34A">
          <path d="M 1597.45 317.70 C 1627.42 317.70 C 1651.35 300.95 C 1655.70 277.05 L 1621.02 277.05 C 1618.22 284.88 C 1610.13 289.84 C 1598.78 289.84 C 1583.50 289.84 C 1574.52 280.28 C 1574.09 265.26 L 1656.60 265.26 L 1656.60 254.80 C 1656.60 218.87 C 1632.02 193.71 C 1596.40 193.71 C 1561.26 193.71 C 1536.35 219.55 C 1536.35 255.70 C 1536.35 291.86 C 1561.04 317.70 C 1597.45 317.70 Z M 1574.30 242.12 C 1575.99 229.65 C 1584.40 222.25 C 1597.45 222.25 C 1610.35 222.25 C 1618.86 229.65 C 1620.55 242.12 L 1574.30 242.12 Z M 1711.42 250.53 C 1711.42 234.36 C 1719.29 226.85 C 1731.51 226.85 C 1743.76 226.85 C 1750.84 234.46 C 1750.84 248.52 L 1750.84 315.00 L 1789.47 315.00 L 1789.47 240.43 C 1789.47 211.21 C 1774.42 193.82 C 1748.72 193.82 C 1730.86 193.82 C 1718.82 202.01 C 1710.99 215.60 L 1710.99 196.41 L 1672.78 196.41 L 1672.78 315.00 L 1711.42 315.00 L 1711.42 250.53 Z M 1863.36 317.91 C 1896.60 317.91 C 1919.06 301.52 C 1919.06 277.16 C 1919.06 259.51 C 1907.63 249.31 C 1883.23 244.81 L 1859.44 240.43 C 1851.25 238.85 C 1846.65 235.61 C 1846.65 230.65 C 1846.65 224.83 C 1852.47 220.45 C 1862.57 220.45 C 1872.81 220.45 C 1880.21 226.63 C 1880.43 234.93 L 1916.04 234.93 C 1915.36 209.67 C 1894.37 193.93 C 1861.24 193.93 C 1828.21 193.93 C 1808.12 208.98 C 1808.12 232.45 C 1808.12 251.21 C 1820.59 263.21 C 1843.95 267.38 L 1865.40 271.19 C 1874.82 272.88 C 1879.78 276.04 C 1879.78 281.18 C 1879.78 287.15 C 1873.49 291.32 C 1862.82 291.32 C 1851.46 291.32 C 1844.60 285.78 C 1843.48 277.05 L 1805.43 277.05 C 1807.55 302.31 C 1830.58 317.91 C 1863.36 317.91 Z M 1991.07 317.70 C 2021.05 317.70 C 2044.98 300.95 C 2049.33 277.05 L 2014.65 277.05 C 2011.85 284.88 C 2003.76 289.84 C 1992.40 289.84 C 1977.13 289.84 C 1968.15 280.28 C 1967.71 265.26 L 2050.23 265.26 L 2050.23 254.80 C 2050.23 218.87 C 2025.65 193.71 C 1990.03 193.71 C 1954.88 193.71 C 1929.98 219.55 C 1929.98 255.70 C 1929.98 291.86 C 1954.67 317.70 C 1991.07 317.70 Z M 1967.93 242.12 C 1969.62 229.65 C 1978.03 222.25 C 1991.07 222.25 C 2003.98 222.25 C 2012.49 229.65 C 2014.18 242.12 L 1967.93 242.12 Z"/>
        </g>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.brand-intro-overlay {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  overflow: hidden;
  pointer-events: auto;
}

.intro-panel {
  position: absolute;
  top: 0;
  width: 50vw;
  height: 100vh;
  background: #F8FAFC;
  z-index: 1;
}

.left-panel {
  left: 0;
  border-right: 1px solid rgba(0, 0, 0, 0.02);
}

.right-panel {
  right: 0;
  border-left: 1px solid rgba(0, 0, 0, 0.02);
}

.intro-content {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2;
  pointer-events: none;
  padding: 24px;
}

.logo-svg {
  /* Sizing constraints per spec: width min(70vw, 850px) on desktop, 82vw on mobile */
  width: 82vw;
  height: auto;
  max-width: 850px;
  overflow: visible;
  display: block;
  /* Performance optimizations */
  will-change: transform, opacity, filter;
  transform-style: preserve-3d;
  backface-visibility: hidden;
}

@media (min-width: 768px) {
  .logo-svg {
    width: min(70vw, 850px);
  }
}

/* Ensure smooth curves rendering */
svg path, svg polygon, svg polyline, svg rect {
  vector-effect: non-scaling-stroke;
}
</style>
