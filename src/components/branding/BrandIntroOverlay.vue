<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { gsap } from 'gsap'
import StockSenseLogo from './StockSenseLogo.vue'

const emit = defineEmits(['complete'])
const containerRef = ref(null)
const isDev = import.meta.env.DEV
let ctx = null

const staticTestMode = ref('none') // 'none', 's-mark', 'wordmark'
const showDebugMode = ref(false)

// Parse static testing and debug options from URL query parameters synchronously
if (typeof window !== 'undefined') {
  const urlParams = new URLSearchParams(window.location.search)
  const testMode = urlParams.get('test_intro_static')
  if (testMode === 's-mark' || testMode === 'wordmark') {
    staticTestMode.value = testMode
  }
  showDebugMode.value = isDev && (urlParams.get('introDebug') === '1' || testMode !== null)
}

// Helper to dynamically calculate SVG element center with hardcoded fallbacks
function getElementCenter(el, fallbackX, fallbackY) {
  if (el && typeof el.getBBox === 'function') {
    const box = el.getBBox()
    if (box.width > 0 && box.height > 0) {
      return {
        x: box.x + box.width / 2,
        y: box.y + box.height / 2
      }
    }
  }
  return { x: fallbackX, y: fallbackY }
}

// Calculate responsive logo dimensions based on viewport width
function getLogoDimensions(mode) {
  const width = typeof window !== 'undefined' ? window.innerWidth : 1440
  let w = '90vw'
  let mw = '1050px'

  if (mode === 's-mark') {
    if (width < 768) {
      // Mobile: approximately 220–260px artwork target -> 320px container
      w = '82vw'
      mw = '320px'
    } else if (width < 1024) {
      // Tablet: approximately 320–380px artwork target -> 480px container
      w = '62vw'
      mw = '480px'
    } else {
      // Desktop 1440x900: approximately 380–460px artwork target -> 550px container
      w = '38vw'
      mw = '550px'
    }
  } else {
    // wordmark (full logo)
    if (width < 768) {
      // Mobile: 90–92vw
      w = '92vw'
      mw = '360px'
    } else if (width < 1024) {
      // Tablet: 84–88vw
      w = '86vw'
      mw = '800px'
    } else {
      // Desktop 1440x900: 900–1050px (capped at 1050px)
      w = '82vw'
      mw = '1050px'
    }
  }
  return { width: w, maxWidth: mw }
}

// Set layout to static state for geometry testing/verification
function applyStaticState(mode) {
  const q = gsap.utils.selector(containerRef.value)
  const svgEl = q('.logo-svg')[0]
  if (!svgEl) return

  // Lock scroll during static debug display
  if (typeof document !== 'undefined') {
    document.body.style.overflow = 'hidden'
  }

  const dims = getLogoDimensions(mode)
  gsap.set(svgEl, {
    width: dims.width,
    maxWidth: dims.maxWidth,
    opacity: 1,
    scale: 1,
    filter: 'none'
  })

  // Make all inner branding components fully visible statically
  gsap.set(q('#s-body'), { opacity: 1, scale: 1, x: 0, y: 0 })
  gsap.set(q('#swoosh-path'), { strokeDashoffset: 0, opacity: 1 })
  gsap.set(q('#swoosh-highlight'), { strokeDashoffset: 0, opacity: 0.42 })
  gsap.set(q(['#box-1-wrapper', '#box-2-wrapper', '#box-3-wrapper']), { scale: 1, opacity: 1, y: 0 })
  gsap.set(q(['#pixel-1', '#pixel-2', '#pixel-3', '#pixel-4']), { scale: 1, opacity: 1, x: 0, y: 0 })

  // Reveal the clip paths fully for static viewing
  gsap.set(q('#clip-rect-top'), { attr: { width: 300 } })
  gsap.set(q('#clip-rect-bottom'), { attr: { x: 168, width: 312 } })

  if (mode === 's-mark') {
    // Focus viewBox and translate sense-mark for standalone S target
    svgEl.setAttribute('viewBox', '870 0 460 460')
    // Center the standalone S artwork mathematically in viewport (X delta <= 5px, Y delta <= 5px)
    gsap.set(q('#sense-mark'), { attr: { transform: 'translate(862.85 16.23) scale(0.85)' } })
    gsap.set(q('#wordmark-left'), { opacity: 0 })
    gsap.set(q('#wordmark-ense'), { opacity: 0 })
  } else if (mode === 'wordmark') {
    // Zoom out viewBox to show full logo wordmark
    svgEl.setAttribute('viewBox', '0 0 2200 460')
    gsap.set(q('#sense-mark'), { attr: { transform: 'translate(1238.41 78.00) scale(0.59)' } })
    gsap.set(q('#wordmark-left'), { opacity: 1, x: 0 })
    gsap.set(q('#wordmark-ense'), { opacity: 1, x: 0 })
  }
}

// Play/Replay intro sequence
function playIntro() {
  if (ctx) {
    ctx.revert()
  }

  // Ensure scroll is locked during the active intro
  if (typeof document !== 'undefined') {
    document.body.style.overflow = 'hidden'
  }

  // Initialize GSAP context for scoped selectors and easy cleanup
  ctx = gsap.context((self) => {
    const q = gsap.utils.selector(containerRef.value)
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      // Accessibility: Simple fast fade transition
      const svgEl = q('.logo-svg')[0]
      if (svgEl) {
        svgEl.setAttribute('viewBox', '0 0 2200 460')
        const wordmarkDims = getLogoDimensions('wordmark')
        gsap.set(svgEl, {
          width: wordmarkDims.width,
          maxWidth: wordmarkDims.maxWidth,
          opacity: 1,
          scale: 1,
          filter: 'none'
        })
      }
      gsap.set(q('#wordmark-left'), { opacity: 1, x: 0 })
      gsap.set(q('#sense-mark'), { attr: { transform: 'translate(1238.41 78.00) scale(0.59)' } })
      gsap.set(q('#s-body'), { opacity: 1, scale: 1, x: 0, y: 0 })
      gsap.set(q('#swoosh-path'), { strokeDashoffset: 0, opacity: 1 })
      gsap.set(q('#swoosh-highlight'), { strokeDashoffset: 0, opacity: 0.42 })
      gsap.set(q(['#box-1-wrapper', '#box-2-wrapper', '#box-3-wrapper']), { scale: 1, opacity: 1, y: 0 })
      gsap.set(q(['#pixel-1', '#pixel-2', '#pixel-3', '#pixel-4']), { scale: 1, opacity: 1, x: 0, y: 0 })
      gsap.set(q('#wordmark-ense'), { opacity: 1, x: 0 })

      // Reveal clip-paths
      gsap.set(q('#clip-rect-top'), { attr: { width: 300 } })
      gsap.set(q('#clip-rect-bottom'), { attr: { x: 168, width: 312 } })

      gsap.to(containerRef.value, {
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

    // 1. Set initial states of S-Mark elements and viewport
    const svgEl = q('.logo-svg')[0]
    if (svgEl) {
      svgEl.setAttribute('viewBox', '870 0 460 460')
    }

    const sMarkDims = getLogoDimensions('s-mark')
    const wordmarkDims = getLogoDimensions('wordmark')

    gsap.set(svgEl, {
      width: sMarkDims.width,
      maxWidth: sMarkDims.maxWidth,
      opacity: 1,
      scale: 1,
      filter: 'none'
    })

    // Dynamically calculate and register origin anchor points on child SVG components
    const senseMarkCenter = getElementCenter(q('#sense-mark')[0], 1100, 230)
    gsap.set(q('#sense-mark'), { svgOrigin: `${senseMarkCenter.x} ${senseMarkCenter.y}` })
    
    const sBodyCenter = getElementCenter(q('#s-body')[0], 288, 251)
    gsap.set(q('#s-body'), { svgOrigin: `${sBodyCenter.x} ${sBodyCenter.y}` })

    const box1Center = getElementCenter(q('#box-1-wrapper')[0], 257, 351)
    gsap.set(q('#box-1-wrapper'), { svgOrigin: `${box1Center.x} ${box1Center.y}` })

    const box2Center = getElementCenter(q('#box-2-wrapper')[0], 212, 386)
    gsap.set(q('#box-2-wrapper'), { svgOrigin: `${box2Center.x} ${box2Center.y}` })

    const box3Center = getElementCenter(q('#box-3-wrapper')[0], 302, 386)
    gsap.set(q('#box-3-wrapper'), { svgOrigin: `${box3Center.x} ${box3Center.y}` })

    const p1Center = getElementCenter(q('#pixel-1')[0], 402, 103)
    gsap.set(q('#pixel-1'), { svgOrigin: `${p1Center.x} ${p1Center.y}` })

    const p2Center = getElementCenter(q('#pixel-2')[0], 431, 83)
    gsap.set(q('#pixel-2'), { svgOrigin: `${p2Center.x} ${p2Center.y}` })

    const p3Center = getElementCenter(q('#pixel-3')[0], 434, 113)
    gsap.set(q('#pixel-3'), { svgOrigin: `${p3Center.x} ${p3Center.y}` })

    const p4Center = getElementCenter(q('#pixel-4')[0], 462, 62)
    gsap.set(q('#pixel-4'), { svgOrigin: `${p4Center.x} ${p4Center.y}` })

    // Calculate light trace path lengths dynamically
    const traceLeftPath = q('#light-trace-left path')[0]
    const traceRightPath = q('#light-trace-right path')[0]
    
    let lenLeft = 8000
    let lenRight = 3000
    
    if (traceLeftPath && typeof traceLeftPath.getTotalLength === 'function') {
      lenLeft = traceLeftPath.getTotalLength()
    }
    if (traceRightPath && typeof traceRightPath.getTotalLength === 'function') {
      lenRight = traceRightPath.getTotalLength()
    }

    // Mathematically center standalone S-Mark inside viewport (translate X=862.85, Y=16.23)
    gsap.set(q('#sense-mark'), { attr: { transform: 'translate(862.85 16.23) scale(0.85)' } })

    // Initialize individual group states using autoAlpha to toggle visibility and save rendering cycles
    gsap.set(q(['#box-1-wrapper', '#box-2-wrapper', '#box-3-wrapper']), { autoAlpha: 0, scale: 0.65, y: 24 })
    gsap.set(q('#s-body'), { autoAlpha: 1, scale: 1, x: 0, y: 0 })
    gsap.set(q('#swoosh-path'), { autoAlpha: 0, strokeDasharray: 100, strokeDashoffset: 100 })
    gsap.set(q('#swoosh-highlight'), { autoAlpha: 0, strokeDasharray: 100, strokeDashoffset: 100 })
    gsap.set(q(['#pixel-1', '#pixel-2', '#pixel-3', '#pixel-4']), { autoAlpha: 0, scale: 0, x: -8, y: 12 })
    gsap.set(q('#wordmark-left'), { autoAlpha: 0, x: -40 })
    gsap.set(q('#wordmark-ense'), { autoAlpha: 0, x: 30 })

    // Initial state for clip paths (top and bottom hidden initially)
    gsap.set(q('#clip-rect-top'), { attr: { width: 0 } })
    gsap.set(q('#clip-rect-bottom'), { attr: { x: 480, width: 0 } })

    // Light trace paths initial setup
    gsap.set(q(['#light-trace-left', '#light-trace-right']), { autoAlpha: 0 })
    if (traceLeftPath) {
      const dashLeft = lenLeft * 0.25
      const gapLeft = lenLeft * 0.75
      gsap.set(traceLeftPath, { strokeDasharray: `${dashLeft} ${gapLeft}`, strokeDashoffset: 0 })
    }
    if (traceRightPath) {
      const dashRight = lenRight * 0.25
      const gapRight = lenRight * 0.75
      gsap.set(traceRightPath, { strokeDasharray: `${dashRight} ${gapRight}`, strokeDashoffset: 0 })
    }

    // --- Dynamic Particle Convergence System ---
    const containerEl = document.getElementById("preloader-particles")
    const rect = svgEl.getBoundingClientRect()
    // Calculate target coordinates based on actual S/swoosh crossing bounds in viewport
    const targetX = rect.left + rect.width / 2
    const targetY = rect.top + rect.height / 2

    const particleCount = 75
    const particles = []
    const colors = ['#10B981', '#34D399', '#A3E635', '#FFFFFF']

    if (containerEl) {
      containerEl.innerHTML = '' // clear previous elements if any
      for (let i = 0; i < particleCount; i++) {
        const p = document.createElement("div")
        p.className = "preloader-particle"
        containerEl.appendChild(p)

        const angle = Math.random() * Math.PI * 2
        const distance = 250 + Math.random() * 150 // radial distribution 250px - 400px
        const startX = targetX + Math.cos(angle) * distance
        const startY = targetY + Math.sin(angle) * distance

        const isSquare = Math.random() > 0.75
        p.style.borderRadius = isSquare ? '0%' : '50%'

        gsap.set(p, {
          x: startX,
          y: startY,
          opacity: 0,
          scale: 0.8 + Math.random() * 1.5,
          backgroundColor: colors[i % colors.length]
        })
        particles.push(p)
      }
    }

    // 2. Initialize unified master GSAP Timeline
    const tl = gsap.timeline()

    // Phase A: PARTICLE CONVERGENCE (0.00s - 1.10s)
    tl.to(particles, {
      x: targetX,
      y: targetY,
      opacity: 0.9,
      duration: 1.10,
      stagger: { each: 0.006, from: "random" },
      ease: "power2.inOut"
    }, 0)

    // Phase B: INVENTORY CORE POP-IN (0.75s - 1.15s)
    tl.to(q(['#box-1-wrapper', '#box-2-wrapper', '#box-3-wrapper']),
      { 
        duration: 0.35, 
        autoAlpha: 1, 
        scale: 1, 
        y: 0, 
        ease: 'back.out(1.2)', 
        stagger: 0.08 
      },
      0.75
    )

    // Phase C: S BODY REVEAL via SVG Clip Paths (1.00s - 1.85s)
    tl.to(q('#clip-rect-top'), {
      duration: 0.85,
      attr: { width: 300 },
      ease: 'power2.inOut'
    }, 1.00)

    tl.to(q('#clip-rect-bottom'), {
      duration: 0.85,
      attr: { x: 168, width: 312 },
      ease: 'power2.inOut'
    }, 1.00)

    // Phase D: SWOOSH DRAW (1.30s - 2.05s)
    tl.to(q('#swoosh-path'),
      { duration: 0.75, autoAlpha: 1, strokeDashoffset: 0, ease: 'power2.inOut' },
      1.30
    )
    tl.to(q('#swoosh-highlight'),
      { duration: 0.75, autoAlpha: 0.42, strokeDashoffset: 0, ease: 'power2.inOut' },
      1.35
    )

    // Phase E: PIXELS ACTIVATE (1.85s - 2.25s)
    tl.to(q(['#pixel-1', '#pixel-3', '#pixel-2', '#pixel-4']),
      { duration: 0.25, autoAlpha: 1, scale: 1, x: 0, y: 0, ease: 'back.out(1.5)', stagger: 0.06 },
      1.85
    )
    // Highest pixel pulses once upon settlement
    tl.to(q('#pixel-4'), {
      scale: 1.4,
      duration: 0.12,
      yoyo: true,
      repeat: 1,
      ease: 'sine.inOut'
    }, 2.15)

    // Phase F: FILL / BRAND LOCK (2.05s - 2.40s)
    // S-mark is now fully completed, visible and locked at desktop target scale. Hold briefly.

    // Post-Assembly Particle Burst (2.40s - 3.20s)
    particles.forEach((p, idx) => {
      const angle = Math.random() * Math.PI * 2
      const distance = 160 + Math.random() * 200
      const burstX = targetX + Math.cos(angle) * distance
      const burstY = targetY + Math.sin(angle) * distance
      tl.to(p, {
        x: burstX,
        y: burstY,
        opacity: 0,
        scale: 0.1,
        duration: 0.8,
        ease: 'power3.out'
      }, 2.40)
    })

    // Phase G: FULL WORDMARK ASSEMBLY (2.30s - 2.85s)
    // Smoothly transition viewBox, translate the S-Mark group, and expand logo size to horizontal layout
    tl.to(svgEl, {
      width: wordmarkDims.width,
      maxWidth: wordmarkDims.maxWidth,
      duration: 0.65,
      ease: 'power3.inOut'
    }, 2.30)

    tl.to(q('#sense-mark'), {
      duration: 0.65,
      attr: { transform: 'translate(1238.41 78.00) scale(0.59)' },
      ease: 'power3.inOut'
    }, 2.30)

    const viewBoxObj = { x: 870, y: 0, w: 460, h: 460 }
    tl.to(viewBoxObj, {
      x: 0,
      y: 0,
      w: 2200,
      h: 460,
      duration: 0.65,
      ease: 'power3.inOut',
      onUpdate: () => {
        if (svgEl) {
          svgEl.setAttribute('viewBox', `${viewBoxObj.x} ${viewBoxObj.y} ${viewBoxObj.w} ${viewBoxObj.h}`)
        }
      }
    }, 2.30)

    // Slide in horizontal wordmarks
    tl.fromTo(q('#wordmark-left'),
      { autoAlpha: 0, x: -40 },
      { duration: 0.50, autoAlpha: 1, x: 0, ease: 'power3.out' },
      2.45
    )
    tl.fromTo(q('#wordmark-ense'),
      { autoAlpha: 0, x: 30 },
      { duration: 0.50, autoAlpha: 1, x: 0, ease: 'power3.out' },
      2.45
    )

    // Phase H: RUNNING LIGHT BORDER (2.80s - 3.55s)
    // Run one clean pass of the light trace contour segment using Zenco calculations
    tl.to(q(['#light-trace-left', '#light-trace-right']), {
      duration: 0.15,
      autoAlpha: 1,
      ease: 'power1.in'
    }, 2.80)

    tl.to(traceLeftPath, {
      duration: 1.0,
      strokeDashoffset: -lenLeft,
      ease: 'none'
    }, 2.80)

    tl.to(traceRightPath, {
      duration: 0.70,
      strokeDashoffset: -lenRight,
      ease: 'none'
    }, 3.10)

    tl.to(q(['#light-trace-left', '#light-trace-right']), {
      duration: 0.20,
      autoAlpha: 0,
      ease: 'power2.out'
    }, 3.50)

    // Phase I: EXIT SPLIT PANELS (3.60s - 4.25s)
    tl.to(q('.intro-panel-left'), { duration: 0.65, xPercent: -100, ease: 'power4.inOut' }, 3.60)
    tl.to(q('.intro-panel-right'), { duration: 0.65, xPercent: 100, ease: 'power4.inOut' }, 3.60)
    tl.to(svgEl, { duration: 0.65, scale: 0.97, autoAlpha: 0, ease: 'power4.inOut' }, 3.60)
    tl.to(q('.radial-glow'), { duration: 0.65, autoAlpha: 0, ease: 'power4.inOut' }, 3.60)

    // Clean up timeline triggers and DOM particles on complete
    tl.add(() => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = ''
      }
      if (containerEl) {
        containerEl.innerHTML = ''
      }
      emit('complete')
    }, 4.25)

  }, containerRef.value)
}

onMounted(() => {
  if (staticTestMode.value === 'none') {
    playIntro()
  } else {
    applyStaticState(staticTestMode.value)
  }
})

onUnmounted(() => {
  if (ctx) {
    ctx.revert()
  }
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
  const containerEl = document.getElementById("preloader-particles")
  if (containerEl) {
    containerEl.innerHTML = ''
  }
})

defineExpose({
  play: playIntro
})
</script>

<template>
  <div ref="containerRef" class="brand-intro-overlay">
    <!-- Split Reveal Panels (True 50vw viewport panels) -->
    <div class="intro-panel-left"></div>
    <div class="intro-panel-right"></div>
    
    <!-- Ambient Radial Glow -->
    <div class="radial-glow"></div>
    
    <!-- Preloader Particles Container -->
    <div id="preloader-particles"></div>
    
    <!-- Large Centered Animated Branding Content -->
    <div class="brand-intro-stage">
      <StockSenseLogo class="logo-svg" :class="{ 'debug-mode': isDev }" />
    </div>

    <!-- Center marker and replay button for visual QA debug mode only -->
    <div v-if="showDebugMode" class="debug-hud">
      <div class="debug-center-marker"></div>
      <button class="debug-replay-btn" @click="playIntro">Replay Timeline</button>
    </div>
  </div>
</template>

<style scoped>
.brand-intro-overlay {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100dvh;
  z-index: 99999;
  overflow: hidden;
  pointer-events: auto;
  background: transparent;
}

.intro-panel-left,
.intro-panel-right {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 50vw;
  background: #08120F; /* Cinematic green-black background overlay */
  z-index: 1;
}

.intro-panel-left {
  left: 0;
  border-right: 1px solid rgba(255, 255, 255, 0.02);
}

.intro-panel-right {
  right: 0;
  border-left: 1px solid rgba(255, 255, 255, 0.02);
}

.radial-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, rgba(8, 18, 15, 0) 70%);
  z-index: 2;
  pointer-events: none;
}

#preloader-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}

:deep(.preloader-particle) {
  position: absolute;
  width: 5px;
  height: 5px;
  pointer-events: none;
  opacity: 0;
  z-index: 2;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
}

.brand-intro-stage {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  z-index: 3;
  pointer-events: none;
  padding: 24px;
}

.logo-svg {
  opacity: 0; /* Hide initially to prevent layout flash before GSAP/static setup */
  width: 90vw;
  height: auto;
  max-width: 1050px;
  overflow: visible;
  display: block;
  will-change: transform, opacity, filter;
  transform-style: preserve-3d;
  backface-visibility: hidden;
}

/* Hide all sub-components initially in CSS to ensure 0ms flash-free startup */
:deep(#wordmark-left),
:deep(#wordmark-ense),
:deep(#s-body),
:deep(#s-body-top),
:deep(#s-body-bottom),
:deep(#swoosh-path),
:deep(#swoosh-highlight),
:deep(#box-1-wrapper),
:deep(#box-2-wrapper),
:deep(#box-3-wrapper),
:deep(#pixel-1),
:deep(#pixel-2),
:deep(#pixel-3),
:deep(#pixel-4),
:deep(#light-trace-left),
:deep(#light-trace-right),
:deep(#light-trace-left path),
:deep(#light-trace-right path) {
  opacity: 0;
}

/* DEV Debug Mode Styles to verify geometry outlines */
.logo-svg.debug-mode :deep(#s-body) {
  stroke: #EF4444 !important;
  stroke-width: 3px !important;
  stroke-dasharray: 4 4 !important;
}
.logo-svg.debug-mode :deep(#box-1),
.logo-svg.debug-mode :deep(#box-2),
.logo-svg.debug-mode :deep(#box-3) {
  stroke: #3B82F6 !important;
  stroke-width: 3px !important;
  stroke-dasharray: 4 4 !important;
}
.logo-svg.debug-mode :deep(#pixel-1),
.logo-svg.debug-mode :deep(#pixel-2),
.logo-svg.debug-mode :deep(#pixel-3),
.logo-svg.debug-mode :deep(#pixel-4) {
  stroke: #F59E0B !important;
  stroke-width: 3px !important;
  stroke-dasharray: 4 4 !important;
}

/* Debug HUD Style */
.debug-hud {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 10000;
}
.debug-center-marker {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 24px;
  height: 24px;
  border: 2px solid rgba(239, 68, 68, 0.7);
  border-radius: 50%;
  transform: translate(-50%, -50%);
}
.debug-center-marker::before,
.debug-center-marker::after {
  content: '';
  position: absolute;
  background: rgba(239, 68, 68, 0.7);
}
.debug-center-marker::before {
  left: -12px;
  top: 11px;
  width: 44px;
  height: 2px;
}
.debug-center-marker::after {
  left: 11px;
  top: -12px;
  width: 2px;
  height: 44px;
}
.debug-replay-btn {
  position: absolute;
  bottom: 24px;
  right: 24px;
  pointer-events: auto;
  background: #EF4444;
  color: white;
  border: 0;
  border-radius: 6px;
  padding: 8px 16px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}
.debug-replay-btn:hover {
  background: #DC2626;
}
</style>
