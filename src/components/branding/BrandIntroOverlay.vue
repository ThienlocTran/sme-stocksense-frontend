<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { gsap } from 'gsap'
import StockSenseLogo from './StockSenseLogo.vue'

const emit = defineEmits(['complete'])
const containerRef = ref(null)
let ctx = null

// Play/Replay intro sequence
function playIntro() {
  if (ctx) {
    ctx.revert()
  }

  // Ensure scroll is locked during the intro
  if (typeof document !== 'undefined') {
    document.body.style.overflow = 'hidden'
  }

  // Initialize GSAP context for scoped selectors and easy cleanup
  ctx = gsap.context((self) => {
    const q = gsap.utils.selector(containerRef)
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      // Accessibility: Simple fast fade transition
      gsap.set(q('.logo-svg'), { opacity: 1, scale: 1, filter: 'none' })
      gsap.set(q('#wordmark-left'), { opacity: 1, x: 0 })
      gsap.set(q('#sense-mark'), { x: 1238.41, y: 78.00, scale: 0.59 })
      gsap.set(q('#s-body-top'), { opacity: 1, scale: 1, x: 0, y: 0 })
      gsap.set(q('#s-body-bottom'), { opacity: 1, scale: 1, x: 0, y: 0 })
      gsap.set(q('#swoosh-path'), { strokeDashoffset: 0 })
      gsap.set(q('#swoosh-highlight'), { strokeDashoffset: 0 })
      gsap.set(q(['#box-1', '#box-2', '#box-3']), { scale: 1, opacity: 1, y: 0 })
      gsap.set(q(['#pixel-1', '#pixel-2', '#pixel-3', '#pixel-4']), { scale: 1, opacity: 1, x: 0, y: 0 })
      gsap.set(q('#wordmark-ense'), { opacity: 1, x: 0 })

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

    // 1. Set initial states of S-Mark elements
    // S-Mark centered initially in the 2200x460 canvas (TX = 900.32, TY = 30.32, Scale = 0.78)
    gsap.set(q('#sense-mark'), { x: 900.32, y: 30.32, scale: 0.78 })

    // Parent SVG: make visible and sharp instantly to support cubes pop up
    gsap.set(q('.logo-svg'), { opacity: 1, scale: 1, filter: 'none' })

    // Inventory boxes: hidden, translated down, scaled down
    gsap.set(q(['#box-1', '#box-2', '#box-3']), { opacity: 0, scale: 0.65, y: 28 })
    
    // S body parent and child parts setup
    gsap.set(q('#s-body'), { opacity: 0, scale: 0.85 })
    gsap.set(q('#s-body-top'), { x: -16, y: -16 })
    gsap.set(q('#s-body-bottom'), { x: 16, y: 16 })
    
    // Swoosh paths: set strokeDasharray/strokeDashoffset for path drawing sweep
    gsap.set(q('#swoosh-path'), { opacity: 0, strokeDasharray: 100, strokeDashoffset: 100 })
    gsap.set(q('#swoosh-highlight'), { opacity: 0, strokeDasharray: 100, strokeDashoffset: 100 })
    
    // Data pixels: hidden, scale 0, offset bottom-left for growth motion
    gsap.set(q(['#pixel-1', '#pixel-2', '#pixel-3', '#pixel-4']), { opacity: 0, scale: 0, x: -8, y: 12 })
    
    // Left and Right wordmarks: hidden, offset left and right respectively
    gsap.set(q('#wordmark-left'), { opacity: 0, x: -30 })
    gsap.set(q('#wordmark-ense'), { opacity: 0, x: 30 })

    // 2. Initialize unified master GSAP Timeline
    const tl = gsap.timeline()

    // 0.00s-0.35s: Act 1: 3 cubes pop up, scale up, fade in with back easing
    tl.fromTo(q(['#box-1', '#box-2', '#box-3']),
      { opacity: 0, scale: 0.65, y: 28 },
      { 
        duration: 0.25, 
        opacity: 1, 
        scale: 1, 
        y: 0, 
        transformOrigin: '32px 36px', 
        ease: 'back.out(1.35)', 
        stagger: 0.05 
      },
      0.00
    )

    // 0.35s-0.70s: Act 2: S-body parent group scales & fades in, and top/bottom diagonal converge
    tl.fromTo(q('#s-body'),
      { opacity: 0, scale: 0.85 },
      { duration: 0.35, opacity: 1, scale: 1, transformOrigin: 'center center', ease: 'power3.out' },
      0.35
    )
    tl.fromTo(q('#s-body-top'),
      { x: -16, y: -16 },
      { duration: 0.35, x: 0, y: 0, ease: 'power3.out' },
      0.35
    )
    tl.fromTo(q('#s-body-bottom'),
      { x: 16, y: 16 },
      { duration: 0.35, x: 0, y: 0, ease: 'power3.out' },
      0.35
    )

    // 0.70s-1.15s: Act 3: Swoosh draw paths
    tl.to(q('#swoosh-path'),
      { duration: 0.45, opacity: 1, strokeDashoffset: 0, ease: 'power2.inOut' },
      0.70
    )
    tl.to(q('#swoosh-highlight'),
      { duration: 0.45, opacity: 1, strokeDashoffset: 0, ease: 'power2.inOut' },
      0.75
    )

    // 1.15s-1.45s: Act 4: Data pixels pop up sequentially
    tl.fromTo(q(['#pixel-1', '#pixel-3', '#pixel-2', '#pixel-4']),
      { opacity: 0, scale: 0, x: -8, y: 12 },
      {
        duration: 0.22,
        opacity: 1,
        scale: 1,
        x: 0,
        y: 0,
        transformOrigin: 'center center',
        ease: 'back.out(1.6)',
        stagger: 0.04
      },
      1.15
    )
    // Pulse the final pixel (pixel-4) scale 1 -> 1.10 -> 1
    tl.to(q('#pixel-4'), {
      duration: 0.10,
      scale: 1.10,
      transformOrigin: 'center center',
      ease: 'power1.inOut'
    }, 1.30)
    tl.to(q('#pixel-4'), {
      duration: 0.10,
      scale: 1.0,
      transformOrigin: 'center center',
      ease: 'power1.inOut'
    }, 1.40)

    // 1.45s-1.60s: Act 5: S-Mark complete settling motion
    tl.fromTo(q('#sense-mark'),
      { scale: 0.80 },
      { duration: 0.15, scale: 0.78, ease: 'power2.out' },
      1.45
    )

    // 1.60s-2.05s: Act 6: Full Brand Assembly
    // Center S-Mark slides and scales down to its final wordmark position
    tl.to(q('#sense-mark'), {
      duration: 0.45,
      x: 1238.41,
      y: 78.00,
      scale: 0.59,
      ease: 'power3.out'
    }, 1.60)
    
    // Left and right wordmarks slide in from opposite sides at 1.70s (slight delay)
    tl.fromTo(q('#wordmark-left'),
      { opacity: 0, x: -30 },
      { duration: 0.35, opacity: 1, x: 0, ease: 'power3.out' },
      1.70
    )
    tl.fromTo(q('#wordmark-ense'),
      { opacity: 0, x: 30 },
      { duration: 0.35, opacity: 1, x: 0, ease: 'power3.out' },
      1.70
    )

    // 2.05s-2.20s: Full logo final lock-in scale motion
    tl.fromTo(q('.logo-svg'),
      { scale: 1.018 },
      { duration: 0.15, scale: 1, ease: 'power2.out' },
      2.05
    )

    // 2.20s-2.35s: Hold logo (150ms hold)

    // 2.35s-2.95s: Exit Split Screen Reveal
    // Left panel moves left, right panel moves right, logo scales down and fades out
    tl.to(q('.left-panel'), { duration: 0.60, xPercent: -100, ease: 'power4.inOut' }, 2.35)
    tl.to(q('.right-panel'), { duration: 0.60, xPercent: 100, ease: 'power4.inOut' }, 2.35)
    tl.to(q('.logo-svg'), { duration: 0.60, scale: 0.96, opacity: 0, ease: 'power4.inOut' }, 2.35)

    // Complete sequence: release scroll locking, emit complete event
    tl.add(() => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = ''
      }
      emit('complete')
    })

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
      <StockSenseLogo class="logo-svg" />
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

/* Hide all sub-components initially in CSS to ensure 0ms flash-free startup */
:deep(#wordmark-left),
:deep(#wordmark-ense),
:deep(#s-body),
:deep(#s-body-top),
:deep(#s-body-bottom),
:deep(#swoosh-path),
:deep(#swoosh-highlight),
:deep(#box-1),
:deep(#box-2),
:deep(#box-3),
:deep(#pixel-1),
:deep(#pixel-2),
:deep(#pixel-3),
:deep(#pixel-4) {
  opacity: 0;
}

@media (min-width: 768px) {
  .logo-svg {
    width: min(70vw, 850px);
  }
}
</style>
