<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { gsap } from 'gsap'
import StockSenseLogo from './StockSenseLogo.vue'

const emit = defineEmits(['complete'])
const containerRef = ref(null)
const isCentered = ref(true)
const isDev = import.meta.env.DEV
let ctx = null

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

// Play/Replay intro sequence
function playIntro() {
  if (ctx) {
    ctx.revert()
  }

  isCentered.value = true

  // Ensure scroll is locked during the intro
  if (typeof document !== 'undefined') {
    document.body.style.overflow = 'hidden'
  }

  // Initialize GSAP context for scoped selectors and easy cleanup
  ctx = gsap.context((self) => {
    const q = gsap.utils.selector(containerRef.value)
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      // Accessibility: Simple fast fade transition
      gsap.set(q('.logo-svg'), { opacity: 1, scale: 1, filter: 'none', attr: { viewBox: '0 0 2200 460' } })
      gsap.set(q('#wordmark-left'), { opacity: 1, x: 0 })
      gsap.set(q('#sense-mark'), { x: 1238.41, y: 78.00, scale: 0.59 })
      gsap.set(q('#s-body'), { opacity: 1, scale: 1, x: 0, y: 0 })
      gsap.set(q('#swoosh-path'), { strokeDashoffset: 0, opacity: 1 })
      gsap.set(q('#swoosh-highlight'), { strokeDashoffset: 0, opacity: 0.45 })
      gsap.set(q(['#box-1-wrapper', '#box-2-wrapper', '#box-3-wrapper']), { scale: 1, opacity: 1, y: 0 })
      gsap.set(q(['#pixel-1', '#pixel-2', '#pixel-3', '#pixel-4']), { scale: 1, opacity: 1, x: 0, y: 0 })
      gsap.set(q('#wordmark-ense'), { opacity: 1, x: 0 })
      isCentered.value = false

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
    // Center the viewBox tightly around the large standalone S-Mark (X=870, Y=0, W=460, H=460)
    gsap.set(q('.logo-svg'), { attr: { viewBox: '870 0 460 460' } })

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

    // Center S-Mark inside the initial square viewBox (scale: 0.85, x: 882.4, y: 12.4)
    gsap.set(q('#sense-mark'), { x: 882.4, y: 12.4, scale: 0.85 })

    // Parent SVG: make visible and sharp instantly to support cubes pop up
    gsap.set(q('.logo-svg'), { opacity: 1, scale: 1, filter: 'none' })

    // Initialize individual group states
    gsap.set(q(['#box-1-wrapper', '#box-2-wrapper', '#box-3-wrapper']), { opacity: 0, scale: 0.72, y: 28 })
    gsap.set(q('#s-body'), { opacity: 0, scale: 0.92, y: 10 })
    gsap.set(q('#swoosh-path'), { opacity: 0, strokeDasharray: 100, strokeDashoffset: 100 })
    gsap.set(q('#swoosh-highlight'), { opacity: 0, strokeDasharray: 100, strokeDashoffset: 100 })
    gsap.set(q(['#pixel-1', '#pixel-2', '#pixel-3', '#pixel-4']), { opacity: 0, scale: 0, x: -8, y: 12 })
    gsap.set(q('#wordmark-left'), { opacity: 0, x: -40 })
    gsap.set(q('#wordmark-ense'), { opacity: 0, x: 30 })

    // 2. Initialize unified master GSAP Timeline
    const tl = gsap.timeline()

    // 0.00s-0.35s: Act 1: 3 cubes pop up at their final x locations, offset downward
    tl.fromTo(q(['#box-1-wrapper', '#box-2-wrapper', '#box-3-wrapper']),
      { opacity: 0, scale: 0.72, y: 28 },
      { 
        duration: 0.25, 
        opacity: 1, 
        scale: 1, 
        y: 0, 
        ease: 'back.out(1.35)', 
        stagger: 0.07 
      },
      0.00
    )

    // 0.22s-0.65s: Act 2: S-body parent group scales and fades in around its own center
    tl.fromTo(q('#s-body'),
      { opacity: 0, scale: 0.92, y: 10 },
      { duration: 0.35, opacity: 1, scale: 1, y: 0, ease: 'power2.out' },
      0.22
    )

    // 0.45s-1.05s: Act 3: Swoosh draw paths sweeps dynamically
    tl.fromTo(q('#swoosh-path'),
      { opacity: 0, strokeDashoffset: 100 },
      { duration: 0.45, opacity: 1, strokeDashoffset: 0, ease: 'power2.inOut' },
      0.45
    )
    tl.fromTo(q('#swoosh-highlight'),
      { opacity: 0, strokeDashoffset: 100 },
      { duration: 0.45, opacity: 0.45, strokeDashoffset: 0, ease: 'power2.inOut' },
      0.50
    )

    // 0.88s-1.25s: Act 4: Data pixels pop up sequentially from relative positions to natural coordinates
    tl.fromTo(q('#pixel-1'), { opacity: 0, scale: 0, x: -8, y: 12 }, { duration: 0.20, opacity: 1, scale: 1, x: 0, y: 0, ease: 'back.out(1.5)' }, 0.88)
    tl.fromTo(q('#pixel-3'), { opacity: 0, scale: 0, x: -8, y: 12 }, { duration: 0.20, opacity: 1, scale: 1, x: 0, y: 0, ease: 'back.out(1.5)' }, 0.94)
    tl.fromTo(q('#pixel-2'), { opacity: 0, scale: 0, x: -8, y: 12 }, { duration: 0.20, opacity: 1, scale: 1, x: 0, y: 0, ease: 'back.out(1.5)' }, 1.00)
    tl.fromTo(q('#pixel-4'), { opacity: 0, scale: 0, x: -8, y: 12 }, { duration: 0.20, opacity: 1, scale: 1, x: 0, y: 0, ease: 'back.out(1.5)' }, 1.06)

    // 1.20s-1.40s: Act 5: S-Mark complete settling motion
    tl.fromTo(q('#sense-mark'),
      { scale: 0.865 },
      { duration: 0.15, scale: 0.85, ease: 'power2.out' },
      1.20
    )

    // 1.35s-1.85s: Act 6: Wordmark Assembly and ViewBox Zoom Out
    // Center S-Mark slides and scales down to its final resting wordmark position
    tl.to(q('#sense-mark'), {
      duration: 0.50,
      x: 1238.41,
      y: 78.00,
      scale: 0.59,
      ease: 'power3.inOut'
    }, 1.35)

    // Smoothly animate the viewBox from focused square to full horizontal canvas
    tl.to(q('.logo-svg'), {
      attr: { viewBox: '0 0 2200 460' },
      duration: 0.50,
      ease: 'power3.inOut'
    }, 1.35)

    // Remove isCentered class to trigger container CSS width transition
    tl.add(() => {
      isCentered.value = false
    }, 1.35)

    // Slide-in left/right wordmarks from opposite sides
    tl.fromTo(q('#wordmark-left'),
      { opacity: 0, x: -40 },
      { duration: 0.40, opacity: 1, x: 0, ease: 'power3.out' },
      1.45
    )
    tl.fromTo(q('#wordmark-ense'),
      { opacity: 0, x: 30 },
      { duration: 0.40, opacity: 1, x: 0, ease: 'power3.out' },
      1.45
    )

    // 1.85s-2.10s: Full logo final lock-in scale settle
    tl.fromTo(q('.logo-svg'),
      { scale: 1.012 },
      { duration: 0.15, scale: 1, ease: 'power2.out' },
      1.85
    )

    // 2.10s-2.80s: Exit Split Screen panels slide out
    tl.to(q('.left-panel'), { duration: 0.65, xPercent: -100, ease: 'power4.inOut' }, 2.10)
    tl.to(q('.right-panel'), { duration: 0.65, xPercent: 100, ease: 'power4.inOut' }, 2.10)
    tl.to(q('.logo-svg'), { duration: 0.65, scale: 0.96, opacity: 0, ease: 'power4.inOut' }, 2.10)

    // Complete sequence: release scroll locking, emit complete event
    tl.add(() => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = ''
      }
      emit('complete')
    }, 2.75)

  }, containerRef.value)
}

onMounted(() => {
  playIntro()
})

onUnmounted(() => {
  if (ctx) {
    ctx.revert()
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
  <div ref="containerRef" class="brand-intro-overlay">
    <!-- Split Reveal Panels -->
    <div class="intro-panel left-panel"></div>
    <div class="intro-panel right-panel"></div>
    
    <!-- Ambient Radial Glow -->
    <div class="radial-glow"></div>
    
    <!-- Large Centered Animated Branding Content -->
    <div class="intro-content">
      <StockSenseLogo class="logo-svg" :class="{ 'is-centered': isCentered, 'debug-mode': isDev }" />
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

.radial-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, rgba(248, 250, 252, 0) 70%);
  z-index: 2;
  pointer-events: none;
}

.intro-content {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 3;
  pointer-events: none;
  padding: 24px;
}

.logo-svg {
  opacity: 0; /* Hide by default to prevent layout flash before GSAP initializes */
  width: 90vw;
  height: auto;
  max-width: 1050px;
  overflow: visible;
  display: block;
  /* Smooth CSS transition for layout shift between square and horizontal dimensions */
  transition: width 0.5s cubic-bezier(0.25, 1, 0.5, 1), max-width 0.5s cubic-bezier(0.25, 1, 0.5, 1);
  will-change: transform, opacity, filter;
  transform-style: preserve-3d;
  backface-visibility: hidden;
}

.logo-svg.is-centered {
  width: 62vw;
  max-width: 420px;
  aspect-ratio: 1 / 1;
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
:deep(#pixel-4) {
  opacity: 0;
}

@media (min-width: 768px) {
  .logo-svg {
    width: min(75vw, 1050px);
  }
  .logo-svg.is-centered {
    width: min(35vw, 420px);
  }
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
</style>
