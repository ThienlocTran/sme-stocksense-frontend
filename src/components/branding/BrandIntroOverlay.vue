<script>
const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/';
const introAudio = (typeof window !== 'undefined' && typeof Audio !== 'undefined')
  ? new Audio(`${base}audio/stocksense-intro.mp3`)
  : null;

if (introAudio) {
  introAudio.preload = 'auto';
  introAudio.volume = 0;   // Start muted — browser allows muted autoplay
  introAudio.muted = true;
  introAudio.loop = false;
}
</script>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { gsap } from 'gsap';

// Emits complete event when animation finishes
const emit = defineEmits(['complete']);

const props = defineProps({
  playback: {
    type: String,
    default: 'once-per-load', // 'once-per-load' | 'once-per-session' | 'every-load' | 'once-ever'
    validator: (value) => ['once-per-load', 'once-per-session', 'every-load', 'once-ever'].includes(value)
  }
});

// UI Interaction State (kept for v-if template compat, always false now)
const isReadyToShowPrompt = ref(false);
const hasInteracted = ref(true);

// Anim references for cleanup
let mainTimeline = null;
let humTween = null;
let startTimelineRef = null;

// Storage Keys
const PLAYBACK_LOAD_KEY = 'stocksense_intro_played_load';
const PLAYBACK_SESSION_KEY = 'stocksense_intro_played_session';
const PLAYBACK_EVER_KEY = 'stocksense_intro_played_ever';

// Determine if we should play the animation based on config and storage
const shouldPlayAnimation = () => {
  if (props.playback === 'every-load') return true;
  
  try {
    if (props.playback === 'once-per-load') {
      const played = sessionStorage.getItem(PLAYBACK_LOAD_KEY);
      if (played) return false;
      sessionStorage.setItem(PLAYBACK_LOAD_KEY, 'true');
      return true;
    }
    
    if (props.playback === 'once-per-session') {
      const played = sessionStorage.getItem(PLAYBACK_SESSION_KEY);
      if (played) return false;
      sessionStorage.setItem(PLAYBACK_SESSION_KEY, 'true');
      return true;
    }
    
    if (props.playback === 'once-ever') {
      const played = localStorage.getItem(PLAYBACK_EVER_KEY);
      if (played) return false;
      localStorage.setItem(PLAYBACK_EVER_KEY, 'true');
      return true;
    }
  } catch (e) {
    console.warn("Storage access failed, playing animation as fallback:", e.message);
    return true; // Safe fallback
  }
  
  return true;
};

// Check for reduced motion
const checkReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Reset logo elements to initial animation states
const resetInitialStates = (svg) => {
  if (!svg) return;
  const drawCubes = svg.querySelectorAll('.draw-c');
  const cFills = svg.querySelectorAll('.c-fill');
  const bDraw = svg.querySelector('.b-draw');
  const tDraw = svg.querySelector('.t-draw');
  const bottomFill = svg.querySelector('.fill-bottom');
  const topFill = svg.querySelector('.fill-top');
  const swooshFill = svg.querySelector('.swoosh-fill');
  const swPulse = svg.querySelector('.sw-pulse');
  const pFills = svg.querySelectorAll('.p-fill');
  const flickerDot = svg.querySelector('.pre-ign-dot');
  const sparks = svg.querySelectorAll('.c-spark');
  const greenSpill = svg.querySelector('.local-green-spill');
  const cyanSpill = svg.querySelector('.local-cyan-spill');
  const ghostRip = svg.querySelector('.ghost-ripple');
  const ghostRip2 = svg.querySelector('.ghost-ripple-2');
  const spec = svg.querySelector('.junction-specular');
  const bgFalloff = svg.querySelector('.bg-falloff');
  const embers = svg.querySelectorAll('.data-ember');
  const speedLines = svg.querySelector('.cin-speed-lines');
  const rgbRed = svg.querySelector('.rgb-red-disp');
  const rgbCyan = svg.querySelector('.rgb-cyan-disp');
  const debris = svg.querySelectorAll('.pixel-debris');
  const pxArcs = svg.querySelectorAll('.px-conn-arc');
  const sheen = svg.querySelector('.prem-shine-sweep');
  const glint = svg.querySelector('.final-glint');
  const logoLayout = svg.querySelector('.logo-layout-grp');
  const expRing = svg.querySelector('.exp-ring');
  const expRing2 = svg.querySelector('.exp-ring-2');
  const expParts = svg.querySelectorAll('.exp-particle');
  const expPartsCyan = svg.querySelectorAll('.exp-particle-cyan');

  // Set initial states
  if (cFills.length || bottomFill || topFill || swooshFill || pFills.length) {
    gsap.set([cFills, bottomFill, topFill, swooshFill, pFills], { opacity: 0 });
  }
  
  const primaryPaths = [...drawCubes, bDraw, tDraw, swPulse];
  primaryPaths.forEach(p => {
    if (!p) return;
    const len = p.getTotalLength() || 1000;
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
    p.style.opacity = 1;
  });

  const lines = svg.querySelectorAll('.cin-speed-lines line');
  lines.forEach(l => {
    l.style.strokeDasharray = 300;
    l.style.strokeDashoffset = 300;
  });

  pxArcs.forEach(a => {
    a.style.strokeDasharray = 100;
    a.style.strokeDashoffset = 100;
  });

  if (flickerDot) gsap.set(flickerDot, { opacity: 0 });
  if (sparks.length) gsap.set(sparks, { opacity: 0, scale: 0.5 });
  if (greenSpill || cyanSpill) gsap.set([greenSpill, cyanSpill], { opacity: 0 });
  if (spec) gsap.set(spec, { opacity: 0, scale: 0.2 });
  if (embers.length) gsap.set(embers, { opacity: 0, scale: 0.1 });
  if (speedLines) gsap.set(speedLines, { opacity: 0 });
  if (rgbRed || rgbCyan) gsap.set([rgbRed, rgbCyan], { opacity: 0, x: 0 });
  if (debris.length) gsap.set(debris, { opacity: 0, x: 0, y: 0, scale: 1 });
  if (pxArcs.length) gsap.set(pxArcs, { opacity: 0, strokeDashoffset: 100 });
  if (sheen) gsap.set(sheen, { x: -600 });
  if (glint) gsap.set(glint, { opacity: 0 });
  
  const ambientBgGlow = document.getElementById('ambient-bg-glow');
  if (ambientBgGlow) gsap.set(ambientBgGlow, { opacity: 0, scale: 0.9 });
  
  if (logoLayout) {
    logoLayout.style.transform = '';
    logoLayout.style.transformOrigin = '';
    gsap.set(logoLayout, { attr: { transform: 'translate(0, 0) scale(1)' } });
  }
  if (expRing || expRing2) gsap.set([expRing, expRing2], { attr: { r: 0 }, opacity: 0 });
  if (expParts.length || expPartsCyan.length) gsap.set([expParts, expPartsCyan], { x: 0, y: 0, opacity: 0, scale: 1 });
  if (bottomFill || topFill || cFills.length || pFills.length) gsap.set([bottomFill, topFill, cFills, pFills], { x: 0, y: 0 });

  gsap.set(svg, { scale: 1, opacity: 1, attr: { viewBox: "0 0 1000 600" } });
  gsap.set('.bg-effects', { opacity: 1 });
  gsap.set(['#panel-l', '#panel-r'], { x: '0%' });
};

// Set to final completed states (used for reduced motion)
const setCompletedStates = (svg) => {
  if (!svg) return;
  const cFills = svg.querySelectorAll('.c-fill');
  const bottomFill = svg.querySelector('.fill-bottom');
  const topFill = svg.querySelector('.fill-top');
  const swooshFill = svg.querySelector('.swoosh-fill');
  const pFills = svg.querySelectorAll('.p-fill');
  const drawCubes = svg.querySelectorAll('.draw-c');
  const bDraw = svg.querySelector('.b-draw');
  const tDraw = svg.querySelector('.t-draw');
  const swPulse = svg.querySelector('.sw-pulse');

  if (cFills.length || bottomFill || topFill || swooshFill || pFills.length) {
    gsap.set([cFills, bottomFill, topFill, swooshFill, pFills], { opacity: 1, x: 0, y: 0 });
  }
  const primaryPaths = [...drawCubes, bDraw, tDraw, swPulse];
  primaryPaths.forEach(p => { if (p) p.style.opacity = 0; });
};

// Start intro audio + GSAP timeline.
// Uses muted autoplay trick: browser always allows muted playback,
// then we unmute immediately and fade volume up to bypass the autoplay policy.
const startIntro = () => {
  if (introAudio) {
    introAudio.currentTime = 0;
    introAudio.muted = true;
    introAudio.volume = 0;

    let timelineStarted = false;
    const startTimeline = () => {
      if (timelineStarted) return;
      timelineStarted = true;
      if (mainTimeline) mainTimeline.play();
    };

    startTimelineRef = startTimeline;
    introAudio.addEventListener('playing', startTimelineRef, { once: true });

    // Muted play always succeeds → unmute + fade volume in immediately
    introAudio.play().then(() => {
      introAudio.muted = false;
      // Smooth volume fade-in over 0.4s via GSAP proxy
      gsap.to(introAudio, { volume: 0.7, duration: 0.4, ease: 'power1.in' });
    }).catch((error) => {
      console.warn("Intro audio play failed:", error);
      startTimeline();
    });

    // Safety fallback: if audio doesn't fire 'playing' within 500ms, start timeline anyway
    setTimeout(startTimeline, 500);
  } else {
    if (mainTimeline) mainTimeline.play();
  }
};

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.body.classList.add('scroll-locked');
    document.documentElement.classList.add('scroll-locked');
  }

  try {
    const overlay = document.getElementById('brand-intro-preloader');
    const svg = document.getElementById('logo-svg-canvas');

    if (!overlay || !svg) {
      console.warn("Preloader or SVG not found, skipping intro.");
      if (typeof document !== 'undefined') {
        document.body.classList.remove('scroll-locked');
        document.documentElement.classList.remove('scroll-locked');
      }
      emit('complete');
      return;
    }

    if (!shouldPlayAnimation()) {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('scroll-locked');
        document.documentElement.classList.remove('scroll-locked');
      }
      emit('complete');
      return;
    }

    const isReduced = checkReducedMotion();

    if (isReduced) {
      mainTimeline = gsap.timeline({
        onComplete: () => {
          if (typeof document !== 'undefined') {
            document.body.classList.remove('scroll-locked');
            document.documentElement.classList.remove('scroll-locked');
          }
          emit('complete');
        }
      });
      
      setCompletedStates(svg);
      
      mainTimeline.to(overlay, {
        opacity: 0,
        duration: 0.6,
        ease: 'power2.inOut',
        delay: 0.8
      });
      return;
    }

    // --- FULL CHOREOGRAPHED ANIMATION TIMELINE ---
    // Start timeline paused to wait for audio playing event
    mainTimeline = gsap.timeline({
      paused: true,
      onComplete: () => {
        if (typeof document !== 'undefined') {
          document.body.classList.remove('scroll-locked');
          document.documentElement.classList.remove('scroll-locked');
        }
        emit('complete');
      }
    });

    // Apply user-requested 0.5 speed scale
    mainTimeline.timeScale(0.5);

    resetInitialStates(svg);

    // Muted autoplay trick — no user interaction needed, browser always allows muted audio
    startIntro();

    // Select all dynamic elements
    const drawCubes = svg.querySelectorAll('.draw-c');
    const cFills = svg.querySelectorAll('.c-fill');
    const bDraw = svg.querySelector('.b-draw');
    const tDraw = svg.querySelector('.t-draw');
    const bottomFill = svg.querySelector('.fill-bottom');
    const topFill = svg.querySelector('.fill-top');
    const swooshFill = svg.querySelector('.swoosh-fill');
    const swPulse = svg.querySelector('.sw-pulse');
    const pFills = svg.querySelectorAll('.p-fill');
    
    const dust = svg.querySelectorAll('.data-dust circle');
    const flickerDot = svg.querySelector('.pre-ign-dot');
    const sparks = svg.querySelectorAll('.c-spark');
    const greenSpill = svg.querySelector('.local-green-spill');
    const cyanSpill = svg.querySelector('.local-cyan-spill');
    const ghostRip = svg.querySelector('.ghost-ripple');
    const ghostRip2 = svg.querySelector('.ghost-ripple-2');
    const spec = svg.querySelector('.junction-specular');
    const bgFalloff = svg.querySelector('.bg-falloff');
    const embers = svg.querySelectorAll('.data-ember');
    const speedLines = svg.querySelector('.cin-speed-lines');
    const rgbRed = svg.querySelector('.rgb-red-disp');
    const rgbCyan = svg.querySelector('.rgb-cyan-disp');
    const debris = svg.querySelectorAll('.pixel-debris');
    const pxArcs = svg.querySelectorAll('.px-conn-arc');
    const sheen = svg.querySelector('.prem-shine-sweep');
    const glint = svg.querySelector('.final-glint');
    const edgeH_B = svg.querySelector('.edge-highlight-b');
    const edgeH_T = svg.querySelector('.edge-highlight-t');
    const glowBlurNode = svg.querySelector('#v3-glow-blur');

    const expRing = svg.querySelector('.exp-ring');
    const expRing2 = svg.querySelector('.exp-ring-2');
    const expParts = svg.querySelectorAll('.exp-particle');
    const expPartsCyan = svg.querySelectorAll('.exp-particle-cyan');
    
    const lines = svg.querySelectorAll('.cin-speed-lines line');

    // --- PRIMARY SEQUENCE TIMELINE WORKFLOW ---
    if (drawCubes.length) mainTimeline.to(drawCubes, { strokeDashoffset: 0, duration: 0.4, stagger: 0.08 }, 0.4);
    if (cFills.length) mainTimeline.to(cFills, { opacity: 1, duration: 0.25 }, 0.75);
    if (drawCubes.length) mainTimeline.to(drawCubes, { opacity: 0, duration: 0.25 }, 0.8);

    if (bDraw) mainTimeline.to(bDraw, { strokeDashoffset: 0, duration: 0.5 }, 0.85);
    if (tDraw) mainTimeline.to(tDraw, { strokeDashoffset: 0, duration: 0.5 }, 0.95);
    if (bottomFill && topFill) mainTimeline.to([bottomFill, topFill], { opacity: 1, duration: 0.45 }, 1.15);
    if (bDraw && tDraw) mainTimeline.to([bDraw, tDraw], { opacity: 0, duration: 0.3 }, 1.3);

    if (swPulse) mainTimeline.to(swPulse, { strokeDashoffset: 0, duration: 0.4, ease: 'power2.out' }, 1.25);
    if (swooshFill) mainTimeline.to(swooshFill, { opacity: 1, duration: 0.3 }, 1.45);
    if (swPulse) mainTimeline.to(swPulse, { opacity: 0, duration: 0.3 }, 1.55);

    if (pFills.length) {
      pFills.forEach((px, idx) => {
        mainTimeline.fromTo(px, 
          { scale: 0.5, opacity: 0 }, 
          { scale: 1.0, opacity: 1, duration: 0.25, ease: 'back.out(2)' }, 
          1.55 + idx * 0.08
        );
      });
    }

    if (bgFalloff) {
      mainTimeline.to(bgFalloff, { opacity: 0.8, duration: 0.35, ease: 'sine.inOut' }, 0);
      mainTimeline.to(bgFalloff, { opacity: 0.55, duration: 0.35, ease: 'sine.inOut' }, 0.35);
    }

    if (dust.length) {
      gsap.fromTo(dust, 
        { y: 0, opacity: 0.05 },
        { y: -15, opacity: 0.15, duration: 2.2, stagger: 0.08, ease: 'power1.inOut' }
      );
    }

    if (flickerDot) {
      mainTimeline.to(flickerDot, { opacity: 0.5, duration: 0.04 }, 0.1);
      mainTimeline.to(flickerDot, { opacity: 0, duration: 0.04 }, 0.14);
      mainTimeline.to(flickerDot, { opacity: 0.9, duration: 0.04 }, 0.28);
      mainTimeline.to(flickerDot, { opacity: 0, duration: 0.04 }, 0.32);
    }

    mainTimeline.fromTo(svg, 
      { attr: { viewBox: "0 0 1000 600" } }, 
      { attr: { viewBox: "12.2 7.35 975.6 585.3" }, duration: 1.8, ease: 'power1.out' }, 
      0.4
    );

    if (sparks.length >= 3) {
      mainTimeline.to(sparks[0], { opacity: 1, scale: 1.5, duration: 0.04, yoyo: true, repeat: 1 }, 0.48);
      mainTimeline.to(sparks[1], { opacity: 1, scale: 1.5, duration: 0.04, yoyo: true, repeat: 1 }, 0.64);
      mainTimeline.to(sparks[2], { opacity: 1, scale: 1.5, duration: 0.04, yoyo: true, repeat: 1 }, 0.72);
    }

    mainTimeline.to(svg, { attr: { viewBox: "10.2 9.35 975.6 585.3" }, duration: 0.03 }, 0.75);
    mainTimeline.to(svg, { attr: { viewBox: "14.2 5.35 975.6 585.3" }, duration: 0.03 }, 0.78);
    mainTimeline.to(svg, { attr: { viewBox: "12.2 7.35 975.6 585.3" }, duration: 0.03 }, 0.81);

    if (greenSpill) {
      mainTimeline.to(greenSpill, { opacity: 0.28, duration: 0.25 }, 0.75);
      mainTimeline.to(greenSpill, { opacity: 0, duration: 0.35 }, 1.0);
    }
    if (cyanSpill) {
      mainTimeline.to(cyanSpill, { opacity: 0.22, duration: 0.25 }, 0.95);
      mainTimeline.to(cyanSpill, { opacity: 0, duration: 0.35 }, 1.2);
    }

    if (ghostRip) mainTimeline.fromTo(ghostRip, { attr: { r: 0 }, opacity: 0.6 }, { attr: { r: 160 }, opacity: 0, duration: 0.75, ease: 'power1.out' }, 0.83);
    if (ghostRip2) mainTimeline.fromTo(ghostRip2, { attr: { r: 0 }, opacity: 0.5 }, { attr: { r: 140 }, opacity: 0, duration: 0.75, ease: 'power1.out' }, 1.03);

    if (embers.length >= 3) {
      mainTimeline.set(embers, { opacity: 0.8, x: 0, y: 0 }, 0.85);
      mainTimeline.to(embers[0], { x: 40, y: -60, opacity: 0, duration: 0.6 }, 0.85);
      mainTimeline.to(embers[1], { x: -30, y: -80, opacity: 0, duration: 0.6 }, 0.95);
      mainTimeline.to(embers[2], { x: 60, y: -40, opacity: 0, duration: 0.6 }, 1.05);
    }

    mainTimeline.to('.logo-main-grp', { opacity: 0.85, duration: 0.08 }, 1.17);
    mainTimeline.to('.logo-main-grp', { opacity: 1.0, duration: 0.08 }, 1.25);

    if (speedLines) mainTimeline.set(speedLines, { opacity: 0.75 }, 1.25);
    if (lines.length) mainTimeline.to(lines, { strokeDashoffset: 0, duration: 0.3, stagger: 0.05 }, 1.25);
    if (speedLines) mainTimeline.to(speedLines, { opacity: 0, duration: 0.15 }, 1.55);

    if (spec) {
      mainTimeline.set(spec, { opacity: 1, scale: 0.2 }, 1.45);
      mainTimeline.to(spec, { scale: 1.5, duration: 0.18, ease: 'power2.out' }, 1.45);
      mainTimeline.to(spec, { opacity: 0, scale: 2.2, duration: 0.15 }, 1.63);
    }

    if (rgbRed && rgbCyan) {
      mainTimeline.set([rgbRed, rgbCyan], { opacity: 0.65 }, 1.45);
      mainTimeline.to(rgbRed, { x: -4, duration: 0.05 }, 1.45);
      mainTimeline.to(rgbCyan, { x: 4, duration: 0.05 }, 1.45);
      mainTimeline.to([rgbRed, rgbCyan], { x: 0, opacity: 0, duration: 0.15 }, 1.5);
    }

    if (debris.length >= 5) {
      mainTimeline.set(debris, { opacity: 0.9, x: 0, y: 0 }, 1.45);
      mainTimeline.to(debris[0], { x: 20, y: -25, scale: 0.2, opacity: 0, duration: 0.45, ease: 'power2.out' }, 1.45);
      mainTimeline.to(debris[1], { x: 35, y: 5, scale: 0.2, opacity: 0, duration: 0.45, ease: 'power2.out' }, 1.45);
      mainTimeline.to(debris[2], { x: -10, y: -30, scale: 0.2, opacity: 0, duration: 0.45, ease: 'power2.out' }, 1.45);
      mainTimeline.to(debris[3], { x: 25, y: 30, scale: 0.2, opacity: 0, duration: 0.45, ease: 'power2.out' }, 1.45);
      mainTimeline.to(debris[4], { x: -30, y: 15, scale: 0.2, opacity: 0, duration: 0.45, ease: 'power2.out' }, 1.45);
    }

    if (pxArcs.length >= 3) {
      mainTimeline.to(pxArcs[0], { opacity: 0.7, duration: 0.05 }, 1.55);
      mainTimeline.to(pxArcs[0], { strokeDashoffset: 0, duration: 0.08 }, 1.55);
      mainTimeline.to(pxArcs[0], { opacity: 0, duration: 0.08 }, 1.63);

      mainTimeline.to(pxArcs[1], { opacity: 0.7, duration: 0.05 }, 1.63);
      mainTimeline.to(pxArcs[1], { strokeDashoffset: 0, duration: 0.08 }, 1.63);
      mainTimeline.to(pxArcs[1], { opacity: 0, duration: 0.08 }, 1.71);

      mainTimeline.to(pxArcs[2], { opacity: 0.7, duration: 0.05 }, 1.71);
      mainTimeline.to(pxArcs[2], { strokeDashoffset: 0, duration: 0.08 }, 1.71);
      mainTimeline.to(pxArcs[2], { opacity: 0, duration: 0.08 }, 1.79);
    }

    mainTimeline.to('.logo-main-grp', { filter: 'brightness(1.35)', duration: 0.15 }, 1.8);
    mainTimeline.to('.logo-main-grp', { filter: 'brightness(1.0)', duration: 0.35, ease: 'power2.out' }, 1.95);

    if (sheen) mainTimeline.to(sheen, { x: 1000, duration: 0.8, ease: 'power2.inOut' }, 1.85);

    mainTimeline.to(svg, { attr: { viewBox: "0 0 1000 600" }, duration: 0.7, ease: 'power3.out' }, 1.85);

    if (glint) {
      mainTimeline.to(glint, { opacity: 1, duration: 0.15 }, 2.05);
      mainTimeline.to(glint, { opacity: 0, duration: 0.3, ease: 'power2.in' }, 2.2);
    }

    if (expRing && expRing2) {
      mainTimeline.set([expRing, expRing2], { opacity: 0.85 }, 2.2);
      mainTimeline.to(expRing, { attr: { r: 350 }, opacity: 0, duration: 0.55, ease: 'power2.out' }, 2.2);
      mainTimeline.to(expRing2, { attr: { r: 240 }, opacity: 0, duration: 0.45, ease: 'power3.out' }, 2.2);
    }

    mainTimeline.to('.logo-main-grp', { filter: 'brightness(2.5) contrast(1.4)', duration: 0.06, ease: 'power2.out' }, 2.2);
    mainTimeline.to('.logo-main-grp', { filter: 'brightness(1.0) contrast(1.0)', duration: 0.55, ease: 'power3.out' }, 2.26);

    mainTimeline.to(svg, { attr: { viewBox: "-5 -4 1000 600" }, duration: 0.03 }, 2.2);
    mainTimeline.to(svg, { attr: { viewBox: "5 4 1000 600" }, duration: 0.03 }, 2.23);
    mainTimeline.to(svg, { attr: { viewBox: "-2 2 1000 600" }, duration: 0.03 }, 2.26);
    mainTimeline.to(svg, { attr: { viewBox: "0 0 1000 600" }, duration: 0.04 }, 2.29);

    if (rgbRed && rgbCyan) {
      mainTimeline.set([rgbRed, rgbCyan], { opacity: 0.95 }, 2.2);
      mainTimeline.fromTo(rgbRed, { x: -14, y: -3 }, { x: 0, y: 0, opacity: 0, duration: 0.3, ease: 'power2.out' }, 2.2);
      mainTimeline.fromTo(rgbCyan, { x: 14, y: 3 }, { x: 0, y: 0, opacity: 0, duration: 0.3, ease: 'power2.out' }, 2.2);
    }

    if (bottomFill) mainTimeline.fromTo(bottomFill, { x: 16, y: 16 }, { x: 0, y: 0, duration: 0.55, ease: 'back.out(2.5)' }, 2.2);
    if (topFill) mainTimeline.fromTo(topFill, { x: -16, y: -16 }, { x: 0, y: 0, duration: 0.55, ease: 'back.out(2.5)' }, 2.2);
    if (cFills.length) mainTimeline.fromTo(cFills, { x: -22, y: 14 }, { x: 0, y: 0, duration: 0.55, ease: 'back.out(2.5)' }, 2.2);

    if (pFills.length) {
      pFills.forEach((px, idx) => {
        mainTimeline.fromTo(px, 
          { x: 18 + idx * 4, y: -14 - idx * 4 }, 
          { x: 0, y: 0, duration: 0.55, ease: 'back.out(3)' }, 
          2.2 + idx * 0.02
        );
      });
    }

    if (expParts.length) {
      expParts.forEach((p, idx) => {
        const angle = (idx / expParts.length) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 120 + Math.random() * 140;
        const targetX = Math.cos(angle) * dist;
        const targetY = Math.sin(angle) * dist;

        mainTimeline.set(p, { opacity: 1, scale: 1.2, x: 0, y: 0 }, 2.2);
        mainTimeline.to(p, {
          x: targetX,
          y: targetY,
          scale: 0.1,
          opacity: 0,
          duration: 0.65,
          ease: 'power2.out'
        }, 2.2);
      });
    }

    if (expPartsCyan.length) {
      expPartsCyan.forEach((p, idx) => {
        const angle = ((idx + 0.5) / expPartsCyan.length) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 100 + Math.random() * 120;
        const targetX = Math.cos(angle) * dist;
        const targetY = Math.sin(angle) * dist;

        mainTimeline.set(p, { opacity: 1, scale: 1.2, x: 0, y: 0 }, 2.22);
        mainTimeline.to(p, {
          x: targetX,
          y: targetY,
          scale: 0.1,
          opacity: 0,
          duration: 0.55,
          ease: 'power2.out'
        }, 2.22);
      });
    }

    if (edgeH_B && edgeH_T) {
      const lenH_B = edgeH_B.getTotalLength() || 1000;
      edgeH_B.style.strokeDasharray = `120 ${lenH_B}`;
      edgeH_B.style.strokeDashoffset = lenH_B;
      
      const lenH_T = edgeH_T.getTotalLength() || 1000;
      edgeH_T.style.strokeDasharray = `120 ${lenH_T}`;
      edgeH_T.style.strokeDashoffset = lenH_T;

      mainTimeline.set([edgeH_B, edgeH_T], { opacity: 0.95 }, 1.85);
      mainTimeline.to(edgeH_B, { strokeDashoffset: 0, duration: 0.65, ease: 'power1.inOut' }, 1.85);
      mainTimeline.to(edgeH_T, { strokeDashoffset: 0, duration: 0.65, ease: 'power1.inOut' }, 1.95);
      mainTimeline.to([edgeH_B, edgeH_T], { opacity: 0, duration: 0.2 }, 2.45);
    }

    if (glowBlurNode) {
      mainTimeline.add(() => {
        if (humTween) humTween.kill();
        humTween = gsap.to(glowBlurNode, {
          attr: { stdDeviation: 15 },
          duration: 1.5,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut'
        });
      }, 2.5);
    }

    const ambientBgGlow = document.getElementById('ambient-bg-glow');
    if (ambientBgGlow) {
      mainTimeline.to(ambientBgGlow, {
        opacity: 0.7,
        scale: 1.1,
        duration: 0.8,
        ease: 'power2.out'
      }, 0.9);
    }

    // Phase 9: Intro Exit
    mainTimeline.to(overlay, {
      backgroundColor: 'transparent',
      duration: 0.05
    }, 2.75);

    mainTimeline.to(svg, {
      scale: 0.97,
      opacity: 0,
      duration: 0.7,
      ease: 'power2.inOut'
    }, 2.75);

    mainTimeline.to('.bg-effects', {
      opacity: 0,
      duration: 0.7,
      ease: 'power2.inOut'
    }, 2.75);

    mainTimeline.to('#panel-l', {
      x: '-100%',
      duration: 0.75,
      ease: 'power3.inOut'
    }, 2.80);
    
    mainTimeline.to('#panel-r', {
      x: '100%',
      duration: 0.75,
      ease: 'power3.inOut'
    }, 2.80);

    mainTimeline.to(overlay, {
      opacity: 0,
      duration: 0.2
    }, 3.45);

  } catch (error) {
    console.error("Error initializing GSAP timeline:", error);
    // Fallback: unlock and skip
    if (typeof document !== 'undefined') {
      document.body.classList.remove('scroll-locked');
      document.documentElement.classList.remove('scroll-locked');
    }
    emit('complete');
  }
});

onUnmounted(() => {
  if (mainTimeline) mainTimeline.kill();
  if (humTween) humTween.kill();
  if (introAudio) {
    introAudio.pause();
    introAudio.currentTime = 0;
    if (startTimelineRef) {
      introAudio.removeEventListener('playing', startTimelineRef);
    }
  }
  if (typeof document !== 'undefined') {
    document.body.classList.remove('scroll-locked');
    document.documentElement.classList.remove('scroll-locked');
  }
});
</script>

<template>
  <div id="brand-intro-preloader" class="brand-intro-overlay">
    <!-- Exit Panels (Solid slide elements that open left/right) -->
    <div class="exit-panel panel-left" id="panel-l"></div>
    <div class="exit-panel panel-right" id="panel-r"></div>

    <!-- Interaction Prompt Overlay (shown before user clicks) -->
    <div v-if="isReadyToShowPrompt && !hasInteracted" class="interaction-prompt">
      <div class="prompt-content">
        <div class="brand-logo-glow">
          <div class="pulse-ring"></div>
          <div class="pulse-dot"></div>
        </div>
        <h2 class="prompt-title">StockSense</h2>
        <p class="prompt-subtitle">Sẵn sàng khởi động hệ thống với âm thanh sống động</p>
        <button @click="startIntro" class="start-btn">
          <span class="btn-glow"></span>
          <span class="btn-text">Bấm để bắt đầu</span>
        </button>
      </div>
    </div>

    <!-- Background visual effects (Radial gradients that fade out before slide) -->
    <div class="bg-effects">
      <div class="radial-glow"></div>
      <div id="ambient-bg-glow" class="ambient-light"></div>
    </div>

    <!-- MAIN SVG STAGE -->
    <svg 
      id="logo-svg-canvas" 
      viewBox="0 0 1000 600" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <!-- Gradients and Glow Filters -->
        <linearGradient id="v3-brand-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#0c944e" />
          <stop offset="100%" stop-color="#97f813" />
        </linearGradient>

        <radialGradient id="bg-glow-grad" cx="50%" cy="50%" r="75%">
          <stop offset="0%" stop-color="#08112d" />
          <stop offset="100%" stop-color="#020617" />
        </radialGradient>
        
        <filter id="v3-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur id="v3-glow-blur" stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        
        <filter id="cin-blur-spill" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="15" />
        </filter>
        
        <filter id="cin-speed-blur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="20, 0" />
        </filter>

        <linearGradient id="prem-shine-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0" />
          <stop offset="50%" stop-color="#ffffff" stop-opacity="0.45" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        </linearGradient>

        <!-- Mask for logo metallic sheen sweep -->
        <mask id="prem-shine-mask">
          <g transform="translate(-143.9, -298.9) scale(0.3546)" transform-origin="643.9px 598.9px" fill="white">
            <path d="M 240.8826,1091.0043 c 0,-5.1729 38.3107,-52.6825 62.5,-77.5069 63.56,-65.22894 102.1516,-81.17118 165,-68.16158 9.6394,1.99535 15.3704,3.83975 46.2215,14.87521 36.1461,12.9295 32.6985,12.6442 152.7785,12.6442 108.9573,0 111.6311,-0.1103 135.5,-5.5908 102.6944,-23.57937 148.7718,-117.85346 96.094,-196.60763 -26.4785,-39.58579 -68.5318,-57.21275 -151.094,-63.33225 -23.6244,-1.75104 -29.0549,-2.38546 -29.1285,-3.40298 -0.037,-0.51351 18.539,-10.87823 41.2804,-23.03271 44.8045,-23.94638 64.9409,-35.22175 91.4621,-51.21394 19.5262,-11.77428 17.0551,-11.2995 38.0489,-7.31056 59.3791,11.28243 101.3391,31.96978 133.34276,65.7414 61.1192,64.4959 73.6621,175.44026 28.9704,256.24945 -2.8897,5.225 -6.4477,11.75 -7.9068,14.50002 -10.7446,20.2517 -44.65641,56.08177 -69.06926,72.97627 -3.025,2.0934 -7.525,5.2631 -10,7.0439 -40.2434,28.9545 -96.9174,48.5021 -152,52.4268 -24.0339,1.7125 -572,1.4271 -572,-0.2979 z" />
            <path d="M 404.2043,722.4171 c -190.6476,-72.6017 -136.4318,-343.00602 82.1783,-409.86826 41.0981,-12.56992 29.541,-12.04869 280,-12.62828 240.10096,-0.55562 219.6899,-1.31869 216.5464,8.09566 -24.3765,73.00299 -55.1862,116.85831 -92.7327,131.99831 -17.5819,7.08958 -5.0506,6.57826 -180.8137,7.37785 -102.8052,0.46769 -160.9439,1.09094 -164.5,1.76344 -101.3958,19.17502 -106.251,140.35575 -6.5,162.23293 7.2931,1.59951 31.6295,3.68203 58.5,5.00597 12.925,0.63683 25.075,1.4936 27,1.90393 l 3.5,0.74607 -6,2.74429 c -3.3,1.50936 -10.7916,4.72153 -16.6481,7.13815 -50.9207,21.01224 -124.0509,58.47929 -177.2442,90.80815 -12.7918,7.77436 -10.5816,7.51982 -23.286,2.68179 z" />
            <path d="M 71.882614,1090.2154 c 0,-8.7327 46.020946,-79.8445 71.097426,-109.86017 43.0871,-51.57384 84.7221,-93.54924 129.9026,-130.96458 7.425,-6.14887 15.525,-12.86028 18,-14.91424 69.0094,-57.26987 195.8403,-131.28473 309,-180.3236 24.86,-10.77336 52.7886,-22.59535 55.0841,-23.31681 2.2867,-0.71871 10.5659,-4.01762 33.4159,-13.31492 5.5,-2.23786 22.15,-8.85822 37,-14.71191 155.1882,-61.17334 238.9978,-114.43908 304.77866,-193.70396 l 8.9213,-10.75 h 6.341 c 8.571,0 8.5708,-0.0654 0.062,16.72644 -48.97826,96.65485 -165.61586,189.62508 -350.89356,279.69223 -40.8025,19.83491 -53.655,26.00355 -66.2092,31.7775 -7.15,3.28844 -15.025,7.04906 -17.5,8.35693 -2.475,1.30787 -15.7718,7.7814 -29.5485,14.38562 -136.3594,65.36777 -253.8992,139.88511 -359.5169,227.925 -45.4476,37.88387 -81.7348,70.26667 -114.09384,101.81797 l -13.659206,13.3183 h -11.09099 c -10.66566,0 -11.09079,-0.082 -11.09079,-2.1398 z" />
          </g>
        </mask>

        <!-- Chromatic filters -->
        <filter id="rgb-red">
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
        </filter>
        <filter id="rgb-cyan">
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" />
        </filter>
      </defs>

      <!-- Background Ambient Navy Falloff -->
      <rect class="bg-falloff" width="100%" height="100%" fill="url(#bg-glow-grad)" opacity="0.55" />

      <!-- Micro Data Dust -->
      <g class="data-dust" opacity="0.75">
        <circle cx="280" cy="180" r="1.5" fill="#22d3ee" opacity="0.1" />
        <circle cx="340" cy="380" r="1" fill="#97f813" opacity="0.08" />
        <circle cx="720" cy="220" r="1.2" fill="#ffffff" opacity="0.12" />
        <circle cx="650" cy="420" r="1.5" fill="#22d3ee" opacity="0.06" />
        <circle cx="480" cy="280" r="1" fill="#97f813" opacity="0.15" />
        <circle cx="520" cy="120" r="1.3" fill="#ffffff" opacity="0.05" />
        <circle cx="180" cy="320" r="1.2" fill="#22d3ee" opacity="0.08" />
        <circle cx="820" cy="340" r="1" fill="#97f813" opacity="0.07" />
      </g>

      <!-- Pre-Ignition Flicker Dot -->
      <circle class="pre-ign-dot" cx="391" cy="315" r="2.5" fill="#22d3ee" opacity="0" />

      <!-- Explosion FX Group (Centered at 500, 300) -->
      <g class="explosion-grp" transform="translate(500, 300)">
        <circle class="exp-ring" cx="0" cy="0" r="0" fill="none" stroke="url(#v3-brand-grad)" stroke-width="4.5" opacity="0" filter="url(#v3-glow)" />
        <circle class="exp-ring-2" cx="0" cy="0" r="0" fill="none" stroke="#ffffff" stroke-width="3" opacity="0" filter="url(#v3-glow)" />
        
        <!-- Exploding pixel particles -->
        <rect class="exp-particle" x="-4" y="-4" width="8" height="8" fill="#97f813" opacity="0" filter="url(#v3-glow)" />
        <rect class="exp-particle" x="-4" y="-4" width="8" height="8" fill="#97f813" opacity="0" filter="url(#v3-glow)" />
        <rect class="exp-particle" x="-4" y="-4" width="8" height="8" fill="#97f813" opacity="0" filter="url(#v3-glow)" />
        <rect class="exp-particle" x="-4" y="-4" width="8" height="8" fill="#97f813" opacity="0" filter="url(#v3-glow)" />
        <rect class="exp-particle" x="-4" y="-4" width="8" height="8" fill="#97f813" opacity="0" filter="url(#v3-glow)" />
        <rect class="exp-particle" x="-4" y="-4" width="8" height="8" fill="#97f813" opacity="0" filter="url(#v3-glow)" />
        <rect class="exp-particle" x="-4" y="-4" width="8" height="8" fill="#97f813" opacity="0" filter="url(#v3-glow)" />
        <rect class="exp-particle" x="-4" y="-4" width="8" height="8" fill="#97f813" opacity="0" filter="url(#v3-glow)" />
        <rect class="exp-particle" x="-4" y="-4" width="8" height="8" fill="#97f813" opacity="0" filter="url(#v3-glow)" />
        <rect class="exp-particle" x="-4" y="-4" width="8" height="8" fill="#97f813" opacity="0" filter="url(#v3-glow)" />
        <rect class="exp-particle" x="-4" y="-4" width="8" height="8" fill="#97f813" opacity="0" filter="url(#v3-glow)" />
        <rect class="exp-particle" x="-4" y="-4" width="8" height="8" fill="#97f813" opacity="0" filter="url(#v3-glow)" />
        
        <rect class="exp-particle-cyan" x="-3" y="-3" width="6" height="6" fill="#22d3ee" opacity="0" filter="url(#v3-glow)" />
        <rect class="exp-particle-cyan" x="-3" y="-3" width="6" height="6" fill="#22d3ee" opacity="0" filter="url(#v3-glow)" />
        <rect class="exp-particle-cyan" x="-3" y="-3" width="6" height="6" fill="#22d3ee" opacity="0" filter="url(#v3-glow)" />
        <rect class="exp-particle-cyan" x="-3" y="-3" width="6" height="6" fill="#22d3ee" opacity="0" filter="url(#v3-glow)" />
        <rect class="exp-particle-cyan" x="-3" y="-3" width="6" height="6" fill="#22d3ee" opacity="0" filter="url(#v3-glow)" />
        <rect class="exp-particle-cyan" x="-3" y="-3" width="6" height="6" fill="#22d3ee" opacity="0" filter="url(#v3-glow)" />
      </g>

      <!-- Viewport Group -->
      <g class="logo-viewport" style="display: block;">
        
        <!-- Outer Layout Group for slide-to-wordmark animation -->
        <g class="logo-layout-grp" transform="translate(0, 0) scale(1)">
          
          <!-- Supporting FX Group -->
          <g transform="translate(-143.9, -298.9) scale(0.3546)" transform-origin="643.9px 598.9px">
            <!-- Corner Sparks -->
            <g class="sparks-grp" fill="#ffffff" filter="url(#v3-glow)">
              <circle class="c-spark" cx="550" cy="850" r="4" opacity="0" />
              <circle class="c-spark" cx="720" cy="870" r="4" opacity="0" />
              <circle class="c-spark" cx="660" cy="780" r="4" opacity="0" />
            </g>

            <!-- Local Green/Cyan Spill -->
            <circle class="local-green-spill" cx="391" cy="889" r="110" fill="#0c944e" opacity="0" filter="url(#cin-blur-spill)" />
            <circle class="local-cyan-spill" cx="130" cy="-5" r="110" fill="#22d3ee" opacity="0" filter="url(#cin-blur-spill)" />

            <!-- Ghost Ripples -->
            <circle class="ghost-ripple" cx="391.6" cy="889.3" r="0" stroke="#97f813" stroke-width="1.5" fill="none" opacity="0" />
            <circle class="ghost-ripple-2" cx="-103" cy="-47.5" r="0" stroke="#22d3ee" stroke-width="1.5" fill="none" opacity="0" />

            <!-- Data Embers (particles floating up) -->
            <circle class="data-ember" cx="448" cy="833" r="4" fill="#ffffff" filter="url(#v3-glow)" />
            <circle class="data-ember" cx="475" cy="760" r="3.5" fill="#97f813" filter="url(#v3-glow)" />
            <circle class="data-ember" cx="490" cy="690" r="3" fill="#22d3ee" filter="url(#v3-glow)" />

            <!-- Parallel Speed lines -->
            <g class="cin-speed-lines" fill="none" stroke="#97f813" stroke-width="1.5" opacity="0" filter="url(#cin-speed-blur)">
              <line x1="100" y1="1050" x2="300" y2="880" />
              <line x1="320" y1="840" x2="520" y2="670" />
              <line x1="600" y1="520" x2="800" y2="350" />
            </g>

            <!-- Junction Flash Cross Specular -->
            <g class="junction-specular" opacity="0" transform="translate(1014, 367)">
              <path d="M -80 0 L 80 0 M 0 -80 L 0 80" stroke="#ffffff" stroke-width="2.5" />
              <circle cx="0" cy="0" r="16" fill="#ffffff" />
            </g>

            <!-- Chromatic Aberration Dispersion Red Layer -->
            <g class="rgb-red-disp" filter="url(#rgb-red)" opacity="0">
              <path d="M 240.8826,1091.0043 c 0,-5.1729 38.3107,-52.6825 62.5,-77.5069 63.56,-65.22894 102.1516,-81.17118 165,-68.16158 9.6394,1.99535 15.3704,3.83975 46.2215,14.87521 36.1461,12.9295 32.6985,12.6442 152.7785,12.6442 108.9573,0 111.6311,-0.1103 135.5,-5.5908 102.6944,-23.57937 148.7718,-117.85346 96.094,-196.60763 -26.4785,-39.58579 -68.5318,-57.21275 -151.094,-63.33225 -23.6244,-1.75104 -29.0549,-2.38546 -29.1285,-3.40298 -0.037,-0.51351 18.539,-10.87823 41.2804,-23.03271 44.8045,-23.94638 64.9409,-35.22175 91.4621,-51.21394 19.5262,-11.77428 17.0551,-11.2995 38.0489,-7.31056 59.3791,11.28243 101.3391,31.96978 133.34276,65.7414 61.1192,64.4959 73.6621,175.44026 28.9704,256.24945 -2.8897,5.225 -6.4477,11.75 -7.9068,14.50002 -10.7446,20.2517 -44.65641,56.08177 -69.06926,72.97627 -3.025,2.0934 -7.525,5.2631 -10,7.0439 -40.2434,28.9545 -96.9174,48.5021 -152,52.4268 -24.0339,1.7125 -572,1.4271 -572,-0.2979 z" fill="#ffffff" />
              <path d="M 404.2043,722.4171 c -190.6476,-72.6017 -136.4318,-343.00602 82.1783,-409.86826 41.0981,-12.56992 29.541,-12.04869 280,-12.62828 240.10096,-0.55562 219.6899,-1.31869 216.5464,8.09566 -24.3765,73.00299 -55.1862,116.85831 -92.7327,131.99831 -17.5819,7.08958 -5.0506,6.57826 -180.8137,7.37785 -102.8052,0.46769 -160.9439,1.09094 -164.5,1.76344 -101.3958,19.17502 -106.251,140.35575 -6.5,162.23293 7.2931,1.59951 31.6295,3.68203 58.5,5.00597 12.925,0.63683 25.075,1.4936 27,1.90393 l 3.5,0.74607 -6,2.74429 c -3.3,1.50936 -10.7916,4.72153 -16.6481,7.13815 -50.9207,21.01224 -124.0509,58.47929 -177.2442,90.80815 -12.7918,7.77436 -10.5816,7.51982 -23.286,2.68179 z" fill="#ffffff" />
              <path d="M 71.882614,1090.2154 c 0,-8.7327 46.020946,-79.8445 71.097426,-109.86017 43.0871,-51.57384 84.7221,-93.54924 129.9026,-130.96458 7.425,-6.14887 15.525,-12.86028 18,-14.91424 69.0094,-57.26987 195.8403,-131.28473 309,-180.3236 24.86,-10.77336 52.7886,-22.59535 55.0841,-23.31681 2.2867,-0.71871 10.5659,-4.01762 33.4159,-13.31492 5.5,-2.23786 22.15,-8.85822 37,-14.71191 155.1882,-61.17334 238.9978,-114.43908 304.77866,-193.70396 l 8.9213,-10.75 h 6.341 c 8.571,0 8.5708,-0.0654 0.062,16.72644 -48.97826,96.65485 -165.61586,189.62508 -350.89356,279.69223 -40.8025,19.83491 -53.655,26.00355 -66.2092,31.7775 -7.15,3.28844 -15.025,7.04906 -17.5,8.35693 -2.475,1.30787 -15.7718,7.7814 -29.5485,14.38562 -136.3594,65.36777 -253.8992,139.88511 -359.5169,227.925 -45.4476,37.88387 -81.7348,70.26667 -114.09384,101.81797 l -13.659206,13.3183 h -11.09099 c -10.66566,0 -11.09079,-0.082 -11.09079,-2.1398 z" fill="#ffffff" />
              <!-- Cube 1 -->
              <path d="M 632.5492,957.6886 c -0.3666,-0.36667 -0.6666,-15.88602 -0.6666,-34.48746 V 889.3803 l 3.75,-2.32912 c 2.0625,-1.28102 9.6,-5.39171 16.75,-9.13488 7.15,-3.74316 19.2107,-10.17748 26.8016,-14.29848 7.5909,-4.12101 14.0596,-7.23467 14.3751,-6.91926 1.2477,1.24774 0.3339,67.12909 -0.9427,67.95754 -0.6787,0.44049 -7.759,4.51673 -15.734,9.0583 -7.975,4.54157 -20.8932,11.94367 -28.7071,16.44911 -15.3007,8.82232 -14.6448,8.50648 -15.6263,7.52504 z" fill="#ffffff" />
              <path d="M 620.8826,955.8408 c -1.375,-0.78887 -14.875,-8.1331 -30,-16.32051 l -27.5,-14.88621 -0.2628,-35.13945 c -0.2094,-28.00201 0,-35.13946 1.0158,-35.13946 0.7033,0 4.2856,1.75711 7.9606,3.90469 3.6751,2.14758 16.4929,9.32132 28.4842,15.94165 11.9912,6.62033 22.7022,12.7019 23.8022,13.51461 3.1664,2.33946 3.2928,69.71101 0.1305,69.59902 -0.6218,-0.022 -2.2555,-0.68548 -3.6305,-1.47434 z" fill="#ffffff" />
              <path d="M 619.88264,877.4583 c -4.675,-2.6631 -15.25,-8.56447 -23.5,-13.11415 -22.5645,-12.44379 -25.841,-14.40487 -25.7562,-15.41604 0.1294,-1.54372 56.5995,-29.56771 58.4377,-29.00046 4.4794,1.38223 58.3185,30.32864 58.3185,31.35469 0,0.64822 -7.425,5.02299 -16.5,9.72172 -9.075,4.69872 -21.7661,11.42494 -28.2023,14.94714 -13.9279,7.62195 -12.2572,7.5115 -22.7977,1.5071 z" fill="#ffffff" />
              <!-- Cube 2 -->
              <path d="M 750.8826,950.1769 c -6.875,-3.83764 -19.7,-10.82251 -28.5,-15.52193 -8.8,-4.69943 -16.7875,-9.23412 -17.75,-10.07709 -2.0133,-1.76326 -2.7071,-64.19922 -0.747,-67.2227 0.8331,-1.285 1.7984,-1.05534 6.7347,1.60229 3.1693,1.70626 16.8998,9.06448 30.5123,16.3516 l 24.75,13.24931 v 34.3984 c 0,26.90559 -0.2723,34.37654 -1.25,34.29802 -0.6875,-0.0552 -6.875,-3.24027 -13.75,-7.0779 z" fill="#ffffff" />
              <path d="M 772.5492,956.6886 c -1.3222,-1.32228 -0.7643,-66.83047 0.5834,-68.49405 0.6875,-0.84863 5.975,-4.24592 11.75,-7.54953 10.3152,-5.90088 27.7029,-16.02995 41.4841,-24.16635 3.8413,-2.26787 7.3288,-4.12341 7.75,-4.12341 0.4212,0 0.7646,15.6375 0.763,34.75 v 34.75 l -10.2471,6.09429 c -5.636,3.35186 -14.2972,8.4783 -19.2472,11.39209 -34.0504,20.04364 -31.4896,18.69067 -32.8333,17.34696 z" fill="#ffffff" />
              <path d="M 764.6847,879.9672 c -2.3662,-1.25677 -11.5021,-6.01579 -20.3021,-10.57559 -26.9687,-13.97407 -32.6245,-17.16293 -32.2789,-18.19965 0.1829,-0.54878 9.3205,-5.71653 20.3057,-11.48391 10.9853,-5.76737 24.3157,-12.93113 29.6233,-15.91947 5.3076,-2.98833 10.5059,-5.43334 11.5519,-5.43334 2.9304,0 56.298,26.92074 56.298,28.39894 0,1.0605 -53.2488,32.36714 -59.1898,34.79957 -1.0235,0.41904 -3.4273,-0.21571 -6.0081,-1.58655 z" fill="#ffffff" />
              <!-- Cube 3 -->
              <path d="M 661.4485,832.4006 c -23.6662,-12.09409 -31.1507,-16.36466 -31.8561,-18.17679 -0.9845,-2.529 -0.2967,-43.61507 0.7476,-44.65937 0.7329,-0.73288 9.4684,3.65832 31.0426,15.6046 8.8,4.87282 19.9041,11.0204 24.6758,13.66128 l 8.6758,4.8016 0.3242,7.61163 c 0.6286,14.75979 -0.2874,37.11619 -1.5175,37.03843 -0.6371,-0.0403 -15.0786,-7.18689 -32.0924,-15.88138 z" fill="#ffffff" />
              <path d="M 701.8826,826.4233 V 804.4914 l 2.75,-1.9149 c 1.5125,-1.0532 13.1,-7.44931 25.75,-14.21359 12.65,-6.76428 26.547,-14.30088 30.8824,-16.748 10.0036,-5.64669 9.5869,-6.46125 9.5869,18.7403 0,24.37093 1.6669,21.11001 -15.4693,30.26405 -7.7,4.11329 -22.47,12.03659 -32.8222,17.60733 -10.3523,5.57074 -19.2398,10.12862 -19.75,10.12862 -0.5422,0 -0.9278,-9.11542 -0.9278,-21.9319 z" fill="#ffffff" />
              <path d="M 689.3070,792.9648 c -24.0206,-12.49097 -51.3318,-27.95054 -50.8254,-28.76983 0.3037,-0.49143 4.2307,-2.73936 8.7266,-4.9954 4.4959,-2.25604 18.5004,-9.74403 31.121,-16.63997 l 22.9467,-12.53807 11.5533,5.95552 c 59.0327,30.43017 54.5581,26.60976 39.8034,33.98414 -9.7423,4.86918 -21.2543,10.92774 -47.3256,24.90678 l -6.0756,3.25764 z" fill="#ffffff" />
              <!-- Pixels -->
              <path d="M 1014.0953,367.84861 c -5.9294,-2.57621 -6.4003,-5.29784 -6.035,-34.88447 0.4502,-36.46335 -2.1831,-33.98792 35.0913,-32.98762 l 26.2096,0.70337 2.7607,2.76074 2.7608,2.76074 v 28.02116 c 0,34.72273 0.7323,33.00297 -14.5794,34.23641 -16.8685,1.35885 -42.4536,1.02091 -46.208,-0.61033 z" fill="#ffffff" />
              <path d="M 1098.9928,317.9597 c -4.803,-2.66208 -5.0368,-4.21902 -5.0747,-33.7894 -0.05,-39.17148 -2.76,-36.18773 33.278,-36.6408 37.4672,-0.47104 34.6881,-3.31776 34.6828,35.52604 0,30.59707 -0.4506,33.00114 -6.5618,35.32459 -4.1069,1.56146 -53.4126,1.19341 -56.3243,-0.42043 z" fill="#ffffff" />
              <path d="M 1002.2708,263.4492 c -6.32566,-2.77756 -6.38816,-3.16676 -6.38816,-39.77848 0,-45.77526 -4.2081,-41.31548 38.98396,-41.31548 43.7534,0 39.0161,-4.80032 39.0161,39.53474 0,35.71348 -0.2219,37.49442 -4.9784,39.95409 -3.1759,1.6423 -63.253,3.08949 -66.6335,1.60513 z" fill="#ffffff" />
              <path d="M 1133.9998,202.6165 c -11.7206,-1.04103 -11.8257,-1.45044 -12.2553,-47.76131 -0.5033,-54.24661 -5.007,-49.49622 46.928,-49.49844 51.8701,-0.002 47.2102,-4.87027 47.2102,49.31844 0,52.94017 3.8375,48.75737 -44.5,48.50374 -18.15,-0.0952 -34.9723,-0.34833 -37.3829,-0.56243 z" fill="#ffffff" />
            </g>

            <!-- Chromatic Aberration Dispersion Cyan Layer -->
            <g class="rgb-cyan-disp" filter="url(#rgb-cyan)" opacity="0">
              <path d="M 240.8826,1091.0043 c 0,-5.1729 38.3107,-52.6825 62.5,-77.5069 63.56,-65.22894 102.1516,-81.17118 165,-68.16158 9.6394,1.99535 15.3704,3.83975 46.2215,14.87521 36.1461,12.9295 32.6985,12.6442 152.7785,12.6442 108.9573,0 111.6311,-0.1103 135.5,-5.5908 102.6944,-23.57937 148.7718,-117.85346 96.094,-196.60763 -26.4785,-39.58579 -68.5318,-57.21275 -151.094,-63.33225 -23.6244,-1.75104 -29.0549,-2.38546 -29.1285,-3.40298 -0.037,-0.51351 18.539,-10.87823 41.2804,-23.03271 44.8045,-23.94638 64.9409,-35.22175 91.4621,-51.21394 19.5262,-11.77428 17.0551,-11.2995 38.0489,-7.31056 59.3791,11.28243 101.3391,31.96978 133.34276,65.7414 61.1192,64.4959 73.6621,175.44026 28.9704,256.24945 -2.8897,5.225 -6.4477,11.75 -7.9068,14.50002 -10.7446,20.2517 -44.65641,56.08177 -69.06926,72.97627 -3.025,2.0934 -7.525,5.2631 -10,7.0439 -40.2434,28.9545 -96.9174,48.5021 -152,52.4268 -24.0339,1.7125 -572,1.4271 -572,-0.2979 z" fill="#ffffff" />
              <path d="M 404.2043,722.4171 c -190.6476,-72.6017 -136.4318,-343.00602 82.1783,-409.86826 41.0981,-12.56992 29.541,-12.04869 280,-12.62828 240.10096,-0.55562 219.6899,-1.31869 216.5464,8.09566 -24.3765,73.00299 -55.1862,116.85831 -92.7327,131.99831 -17.5819,7.08958 -5.0506,6.57826 -180.8137,7.37785 -102.8052,0.46769 -160.9439,1.09094 -164.5,1.76344 -101.3958,19.17502 -106.251,140.35575 -6.5,162.23293 7.2931,1.59951 31.6295,3.68203 58.5,5.00597 12.925,0.63683 25.075,1.4936 27,1.90393 l 3.5,0.74607 -6,2.74429 c -3.3,1.50936 -10.7916,4.72153 -16.6481,7.13815 -50.9207,21.01224 -124.0509,58.47929 -177.2442,90.80815 -12.7918,7.77436 -10.5816,7.51982 -23.286,2.68179 z" fill="#ffffff" />
              <path d="M 71.882614,1090.2154 c 0,-8.7327 46.020946,-79.8445 71.097426,-109.86017 43.0871,-51.57384 84.7221,-93.54924 129.9026,-130.96458 7.425,-6.14887 15.525,-12.86028 18,-14.91424 69.0094,-57.26987 195.8403,-131.28473 309,-180.3236 24.86,-10.77336 52.7886,-22.59535 55.0841,-23.31681 2.2867,-0.71871 10.5659,-4.01762 33.4159,-13.31492 5.5,-2.23786 22.15,-8.85822 37,-14.71191 155.1882,-61.17334 238.9978,-114.43908 304.77866,-193.70396 l 8.9213,-10.75 h 6.341 c 8.571,0 8.5708,-0.0654 0.062,16.72644 -48.97826,96.65485 -165.61586,189.62508 -350.89356,279.69223 -40.8025,19.83491 -53.655,26.00355 -66.2092,31.7775 -7.15,3.28844 -15.025,7.04906 -17.5,8.35693 -2.475,1.30787 -15.7718,7.7814 -29.5485,14.38562 -136.3594,65.36777 -253.8992,139.88511 -359.5169,227.925 -45.4476,37.88387 -81.7348,70.26667 -114.09384,101.81797 l -13.659206,13.3183 h -11.09099 c -10.66566,0 -11.09079,-0.082 -11.09079,-2.1398 z" fill="#ffffff" />
              <!-- Cube 1 -->
              <path d="M 632.5492,957.6886 c -0.3666,-0.36667 -0.6666,-15.88602 -0.6666,-34.48746 V 889.3803 l 3.75,-2.32912 c 2.0625,-1.28102 9.6,-5.39171 16.75,-9.13488 7.15,-3.74316 19.2107,-10.17748 26.8016,-14.29848 7.5909,-4.12101 14.0596,-7.23467 14.3751,-6.91926 1.2477,1.24774 0.3339,67.12909 -0.9427,67.95754 -0.6787,0.44049 -7.759,4.51673 -15.734,9.0583 -7.975,4.54157 -20.8932,11.94367 -28.7071,16.44911 -15.3007,8.82232 -14.6448,8.50648 -15.6263,7.52504 z" fill="#ffffff" />
              <path d="M 620.8826,955.8408 c -1.375,-0.78887 -14.875,-8.1331 -30,-16.32051 l -27.5,-14.88621 -0.2628,-35.13945 c -0.2094,-28.00201 0,-35.13946 1.0158,-35.13946 0.7033,0 4.2856,1.75711 7.9606,3.90469 3.6751,2.14758 16.4929,9.32132 28.4842,15.94165 11.9912,6.62033 22.7022,12.7019 23.8022,13.51461 3.1664,2.33946 3.2928,69.71101 0.1305,69.59902 -0.6218,-0.022 -2.2555,-0.68548 -3.6305,-1.47434 z" fill="#ffffff" />
              <path d="M 619.88264,877.4583 c -4.675,-2.6631 -15.25,-8.56447 -23.5,-13.11415 -22.5645,-12.44379 -25.841,-14.40487 -25.7562,-15.41604 0.1294,-1.54372 56.5995,-29.56771 58.4377,-29.00046 4.4794,1.38223 58.3185,30.32864 58.3185,31.35469 0,0.64822 -7.425,5.02299 -16.5,9.72172 -9.075,4.69872 -21.7661,11.42494 -28.2023,14.94714 -13.9279,7.62195 -12.2572,7.5115 -22.7977,1.5071 z" fill="#ffffff" />
              <!-- Cube 2 -->
              <path d="M 750.8826,950.1769 c -6.875,-3.83764 -19.7,-10.82251 -28.5,-15.52193 -8.8,-4.69943 -16.7875,-9.23412 -17.75,-10.07709 -2.0133,-1.76326 -2.7071,-64.19922 -0.747,-67.2227 0.8331,-1.285 1.7984,-1.05534 6.7347,1.60229 3.1693,1.70626 16.8998,9.06448 30.5123,16.3516 l 24.75,13.24931 v 34.3984 c 0,26.90559 -0.2723,34.37654 -1.25,34.29802 -0.6875,-0.0552 -6.875,-3.24027 -13.75,-7.0779 z" fill="#ffffff" />
              <path d="M 772.5492,956.6886 c -1.3222,-1.32228 -0.7643,-66.83047 0.5834,-68.49405 0.6875,-0.84863 5.975,-4.24592 11.75,-7.54953 10.3152,-5.90088 27.7029,-16.02995 41.4841,-24.16635 3.8413,-2.26787 7.3288,-4.12341 7.75,-4.12341 0.4212,0 0.7646,15.6375 0.763,34.75 v 34.75 l -10.2471,6.09429 c -5.636,3.35186 -14.2972,8.4783 -19.2472,11.39209 -34.0504,20.04364 -31.4896,18.69067 -32.8333,17.34696 z" fill="#ffffff" />
              <path d="M 764.6847,879.9672 c -2.3662,-1.25677 -11.5021,-6.01579 -20.3021,-10.57559 -26.9687,-13.97407 -32.6245,-17.16293 -32.2789,-18.19965 0.1829,-0.54878 9.3205,-5.71653 20.3057,-11.48391 10.9853,-5.76737 24.3157,-12.93113 29.6233,-15.91947 5.3076,-2.98833 10.5059,-5.43334 11.5519,-5.43334 2.9304,0 56.298,26.92074 56.298,28.39894 0,1.0605 -53.2488,32.36714 -59.1898,34.79957 -1.0235,0.41904 -3.4273,-0.21571 -6.0081,-1.58655 z" fill="#ffffff" />
              <!-- Cube 3 -->
              <path d="M 661.4485,832.4006 c -23.6662,-12.09409 -31.1507,-16.36466 -31.8561,-18.17679 -0.9845,-2.529 -0.2967,-43.61507 0.7476,-44.65937 0.7329,-0.73288 9.4684,3.65832 31.0426,15.6046 8.8,4.87282 19.9041,11.0204 24.6758,13.66128 l 8.6758,4.8016 0.3242,7.61163 c 0.6286,14.75979 -0.2874,37.11619 -1.5175,37.03843 -0.6371,-0.0403 -15.0786,-7.18689 -32.0924,-15.88138 z" fill="#ffffff" />
              <path d="M 701.8826,826.4233 V 804.4914 l 2.75,-1.9149 c 1.5125,-1.0532 13.1,-7.44931 25.75,-14.21359 12.65,-6.76428 26.547,-14.30088 30.8824,-16.748 10.0036,-5.64669 9.5869,-6.46125 9.5869,18.7403 0,24.37093 1.6669,21.11001 -15.4693,30.26405 -7.7,4.11329 -22.47,12.03659 -32.8222,17.60733 -10.3523,5.57074 -19.2398,10.12862 -19.75,10.12862 -0.5422,0 -0.9278,-9.11542 -0.9278,-21.9319 z" fill="#ffffff" />
              <path d="M 689.3070,792.9648 c -24.0206,-12.49097 -51.3318,-27.95054 -50.8254,-28.76983 0.3037,-0.49143 4.2307,-2.73936 8.7266,-4.9954 4.4959,-2.25604 18.5004,-9.74403 31.121,-16.63997 l 22.9467,-12.53807 11.5533,5.95552 c 59.0327,30.43017 54.5581,26.60976 39.8034,33.98414 -9.7423,4.86918 -21.2543,10.92774 -47.3256,24.90678 l -6.0756,3.25764 z" fill="#ffffff" />
              <!-- Pixels -->
              <path d="M 1014.0953,367.84861 c -5.9294,-2.57621 -6.4003,-5.29784 -6.035,-34.88447 0.4502,-36.46335 -2.1831,-33.98792 35.0913,-32.98762 l 26.2096,0.70337 2.7607,2.76074 2.7608,2.76074 v 28.02116 c 0,34.72273 0.7323,33.00297 -14.5794,34.23641 -16.8685,1.35885 -42.4536,1.02091 -46.208,-0.61033 z" fill="#ffffff" />
              <path d="M 1098.9928,317.9597 c -4.803,-2.66208 -5.0368,-4.21902 -5.0747,-33.7894 -0.05,-39.17148 -2.76,-36.18773 33.278,-36.6408 37.4672,-0.47104 34.6881,-3.31776 34.6828,35.52604 0,30.59707 -0.4506,33.00114 -6.5618,35.32459 -4.1069,1.56146 -53.4126,1.19341 -56.3243,-0.42043 z" fill="#ffffff" />
              <path d="M 1002.2708,263.4492 c -6.32566,-2.77756 -6.38816,-3.16676 -6.38816,-39.77848 0,-45.77526 -4.2081,-41.31548 38.98396,-41.31548 43.7534,0 39.0161,-4.80032 39.0161,39.53474 0,35.71348 -0.2219,37.49442 -4.9784,39.95409 -3.1759,1.6423 -63.253,3.08949 -66.6335,1.60513 z" fill="#ffffff" />
              <path d="M 1133.9998,202.6165 c -11.7206,-1.04103 -11.8257,-1.45044 -12.2553,-47.76131 -0.5033,-54.24661 -5.007,-49.49622 46.928,-49.49844 51.8701,-0.002 47.2102,-4.87027 47.2102,49.31844 0,52.94017 3.8375,48.75737 -44.5,48.50374 -18.15,-0.0952 -34.9723,-0.34833 -37.3829,-0.56243 z" fill="#ffffff" />
            </g>

            <!-- Pixel Debris scattering -->
            <rect class="pixel-debris" x="1014" y="367" width="10" height="10" fill="#97f813" />
            <rect class="pixel-debris" x="1014" y="367" width="8" height="8" fill="#ffffff" />
            <rect class="pixel-debris" x="1014" y="367" width="9" height="9" fill="#22d3ee" />
            <rect class="pixel-debris" x="1014" y="367" width="7" height="7" fill="#97f813" />
            <rect class="pixel-debris" x="1014" y="367" width="6" height="6" fill="#0c944e" />

            <!-- Pixel Arc Transfer lines -->
            <path class="px-conn-arc" d="M 1014 367 C 1050 350, 1070 330, 1098 317" fill="none" stroke="#97f813" stroke-width="1.5" />
            <path class="px-conn-arc" d="M 1098 317 C 1060 290, 1030 275, 1002 263" fill="none" stroke="#22d3ee" stroke-width="1.5" />
            <path class="px-conn-arc" d="M 1002 263 C 1050 240, 1100 220, 1133 202" fill="none" stroke="#ffffff" stroke-width="1.5" />

            <!-- Final Settle Specular Glint -->
            <path class="final-glint" d="M 440 1020 c 40 12, 100 12, 150 5" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" filter="url(#v3-glow)" />

            <!-- Diamond-cut beveled edge highlight paths -->
            <path class="edge-highlight-b" d="M 240.8826,1091.0043 c 0,-5.1729 38.3107,-52.6825 62.5,-77.5069 63.56,-65.22894 102.1516,-81.17118 165,-68.16158 9.6394,1.99535 15.3704,3.83975 46.2215,14.87521 36.1461,12.9295 32.6985,12.6442 152.7785,12.6442 108.9573,0 111.6311,-0.1103 135.5,-5.5908 102.6944,-23.57937 148.7718,-117.85346 96.094,-196.60763 -26.4785,-39.58579 -68.5318,-57.21275 -151.094,-63.33225 -23.6244,-1.75104 -29.0549,-2.38546 -29.1285,-3.40298 -0.037,-0.51351 18.539,-10.87823 41.2804,-23.03271 44.8045,-23.94638 64.9409,-35.22175 91.4621,-51.21394 19.5262,-11.77428 17.0551,-11.2995 38.0489,-7.31056 59.3791,11.28243 101.3391,31.96978 133.34276,65.7414 61.1192,64.4959 73.6621,175.44026 28.9704,256.24945 -2.8897,5.225 -6.4477,11.75 -7.9068,14.50002 -10.7446,20.2517 -44.65641,56.08177 -69.06926,72.97627 -3.025,2.0934 -7.525,5.2631 -10,7.0439 -40.2434,28.9545 -96.9174,48.5021 -152,52.4268 -24.0339,1.7125 -572,1.4271 -572,-0.2979 z" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0" filter="url(#v3-glow)" />
            <path class="edge-highlight-t" d="M 404.2043,722.4171 c -190.6476,-72.6017 -136.4318,-343.00602 82.1783,-409.86826 41.0981,-12.56992 29.541,-12.04869 280,-12.62828 240.10096,-0.55562 219.6899,-1.31869 216.5464,8.09566 -24.3765,73.00299 -55.1862,116.85831 -92.7327,131.99831 -17.5819,7.08958 -5.0506,6.57826 -180.8137,7.37785 -102.8052,0.46769 -160.9439,1.09094 -164.5,1.76344 -101.3958,19.17502 -106.251,140.35575 -6.5,162.23293 7.2931,1.59951 31.6295,3.68203 58.5,5.00597 12.925,0.63683 25.075,1.4936 27,1.90393 l 3.5,0.74607 -6,2.74429 c -3.3,1.50936 -10.7916,4.72153 -16.6481,7.13815 -50.9207,21.01224 -124.0509,58.47929 -177.2442,90.80815 -12.7918,7.77436 -10.5816,7.51982 -23.286,2.68179 z" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0" filter="url(#v3-glow)" />
          </g>

          <!-- Final Metallic Sheen Sweep overlay -->
          <rect class="prem-shine-sweep" x="-450" y="-100" width="300" height="900" fill="url(#prem-shine-grad)" mask="url(#prem-shine-mask)" transform="rotate(25)" />

          <!-- Logo Main Group -->
          <g class="logo-main-grp" transform="translate(-143.9, -298.9) scale(0.3546)" transform-origin="643.9px 598.9px">
            <!-- Final Solid Fills -->
            <g fill="url(#v3-brand-grad)">
              <path class="fill-bottom" d="M 240.8826,1091.0043 c 0,-5.1729 38.3107,-52.6825 62.5,-77.5069 63.56,-65.22894 102.1516,-81.17118 165,-68.16158 9.6394,1.99535 15.3704,3.83975 46.2215,14.87521 36.1461,12.9295 32.6985,12.6442 152.7785,12.6442 108.9573,0 111.6311,-0.1103 135.5,-5.5908 102.6944,-23.57937 148.7718,-117.85346 96.094,-196.60763 -26.4785,-39.58579 -68.5318,-57.21275 -151.094,-63.33225 -23.6244,-1.75104 -29.0549,-2.38546 -29.1285,-3.40298 -0.037,-0.51351 18.539,-10.87823 41.2804,-23.03271 44.8045,-23.94638 64.9409,-35.22175 91.4621,-51.21394 19.5262,-11.77428 17.0551,-11.2995 38.0489,-7.31056 59.3791,11.28243 101.3391,31.96978 133.34276,65.7414 61.1192,64.4959 73.6621,175.44026 28.9704,256.24945 -2.8897,5.225 -6.4477,11.75 -7.9068,14.50002 -10.7446,20.2517 -44.65641,56.08177 -69.06926,72.97627 -3.025,2.0934 -7.525,5.2631 -10,7.0439 -40.2434,28.9545 -96.9174,48.5021 -152,52.4268 -24.0339,1.7125 -572,1.4271 -572,-0.2979 z" />
              <path class="fill-top" d="M 404.2043,722.4171 c -190.6476,-72.6017 -136.4318,-343.00602 82.1783,-409.86826 41.0981,-12.56992 29.541,-12.04869 280,-12.62828 240.10096,-0.55562 219.6899,-1.31869 216.5464,8.09566 -24.3765,73.00299 -55.1862,116.85831 -92.7327,131.99831 -17.5819,7.08958 -5.0506,6.57826 -180.8137,7.37785 -102.8052,0.46769 -160.9439,1.09094 -164.5,1.76344 -101.3958,19.17502 -106.251,140.35575 -6.5,162.23293 7.2931,1.59951 31.6295,3.68203 58.5,5.00597 12.925,0.63683 25.075,1.4936 27,1.90393 l 3.5,0.74607 -6,2.74429 c -3.3,1.50936 -10.7916,4.72153 -16.6481,7.13815 -50.9207,21.01224 -124.0509,58.47929 -177.2442,90.80815 -12.7918,7.77436 -10.5816,7.51982 -23.286,2.68179 z" />
              <path class="swoosh-fill" d="M 71.882614,1090.2154 c 0,-8.7327 46.020946,-79.8445 71.097426,-109.86017 43.0871,-51.57384 84.7221,-93.54924 129.9026,-130.96458 7.425,-6.14887 15.525,-12.86028 18,-14.91424 69.0094,-57.26987 195.8403,-131.28473 309,-180.3236 24.86,-10.77336 52.7886,-22.59535 55.0841,-23.31681 2.2867,-0.71871 10.5659,-4.01762 33.4159,-13.31492 5.5,-2.23786 22.15,-8.85822 37,-14.71191 155.1882,-61.17334 238.9978,-114.43908 304.77866,-193.70396 l 8.9213,-10.75 h 6.341 c 8.571,0 8.5708,-0.0654 0.062,16.72644 -48.97826,96.65485 -165.61586,189.62508 -350.89356,279.69223 -40.8025,19.83491 -53.655,26.00355 -66.2092,31.7775 -7.15,3.28844 -15.025,7.04906 -17.5,8.35693 -2.475,1.30787 -15.7718,7.7814 -29.5485,14.38562 -136.3594,65.36777 -253.8992,139.88511 -359.5169,227.925 -45.4476,37.88387 -81.7348,70.26667 -114.09384,101.81797 l -13.659206,13.3183 h -11.09099 c -10.66566,0 -11.09079,-0.082 -11.09079,-2.1398 z" />
              
              <g class="c-fill">
                <path d="M 632.5492,957.6886 c -0.3666,-0.36667 -0.6666,-15.88602 -0.6666,-34.48746 V 889.3803 l 3.75,-2.32912 c 2.0625,-1.28102 9.6,-5.39171 16.75,-9.13488 7.15,-3.74316 19.2107,-10.17748 26.8016,-14.29848 7.5909,-4.12101 14.0596,-7.23467 14.3751,-6.91926 1.2477,1.24774 0.3339,67.12909 -0.9427,67.95754 -0.6787,0.44049 -7.759,4.51673 -15.734,9.0583 -7.975,4.54157 -20.8932,11.94367 -28.7071,16.44911 -15.3007,8.82232 -14.6448,8.50648 -15.6263,7.52504 z" />
                <path d="M 620.8826,955.8408 c -1.375,-0.78887 -14.875,-8.1331 -30,-16.32051 l -27.5,-14.88621 -0.2628,-35.13945 c -0.2094,-28.00201 0,-35.13946 1.0158,-35.13946 0.7033,0 4.2856,1.75711 7.9606,3.90469 3.6751,2.14758 16.4929,9.32132 28.4842,15.94165 11.9912,6.62033 22.7022,12.7019 23.8022,13.51461 3.1664,2.33946 3.2928,69.71101 0.1305,69.59902 -0.6218,-0.022 -2.2555,-0.68548 -3.6305,-1.47434 z" />
                <path d="M 619.88264,877.4583 c -4.675,-2.6631 -15.25,-8.56447 -23.5,-13.11415 -22.5645,-12.44379 -25.841,-14.40487 -25.7562,-15.41604 0.1294,-1.54372 56.5995,-29.56771 58.4377,-29.00046 4.4794,1.38223 58.3185,30.32864 58.3185,31.35469 0,0.64822 -7.425,5.02299 -16.5,9.72172 -9.075,4.69872 -21.7661,11.42494 -28.2023,14.94714 -13.9279,7.62195 -12.2572,7.5115 -22.7977,1.5071 z" />
              </g>
              <g class="c-fill">
                <path d="M 750.8826,950.1769 c -6.875,-3.83764 -19.7,-10.82251 -28.5,-15.52193 -8.8,-4.69943 -16.7875,-9.23412 -17.75,-10.07709 -2.0133,-1.76326 -2.7071,-64.19922 -0.747,-67.2227 0.8331,-1.285 1.7984,-1.05534 6.7347,1.60229 3.1693,1.70626 16.8998,9.06448 30.5123,16.3516 l 24.75,13.24931 v 34.3984 c 0,26.90559 -0.2723,34.37654 -1.25,34.29802 -0.6875,-0.0552 -6.875,-3.24027 -13.75,-7.0779 z" />
                <path d="M 772.5492,956.6886 c -1.3222,-1.32228 -0.7643,-66.83047 0.5834,-68.49405 0.6875,-0.84863 5.975,-4.24592 11.75,-7.54953 10.3152,-5.90088 27.7029,-16.02995 41.4841,-24.16635 3.8413,-2.26787 7.3288,-4.12341 7.75,-4.12341 0.4212,0 0.7646,15.6375 0.763,34.75 v 34.75 l -10.2471,6.09429 c -5.636,3.35186 -14.2972,8.4783 -19.2472,11.39209 -34.0504,20.04364 -31.4896,18.69067 -32.8333,17.34696 z" />
                <path d="M 764.6847,879.9672 c -2.3662,-1.25677 -11.5021,-6.01579 -20.3021,-10.57559 -26.9687,-13.97407 -32.6245,-17.16293 -32.2789,-18.19965 0.1829,-0.54878 9.3205,-5.71653 20.3057,-11.48391 10.9853,-5.76737 24.3157,-12.93113 29.6233,-15.91947 5.3076,-2.98833 10.5059,-5.43334 11.5519,-5.43334 2.9304,0 56.298,26.92074 56.298,28.39894 0,1.0605 -53.2488,32.36714 -59.1898,34.79957 -1.0235,0.41904 -3.4273,-0.21571 -6.0081,-1.58655 z" />
              </g>
              <g class="c-fill">
                <path d="M 661.4485,832.4006 c -23.6662,-12.09409 -31.1507,-16.36466 -31.8561,-18.17679 -0.9845,-2.529 -0.2967,-43.61507 0.7476,-44.65937 0.7329,-0.73288 9.4684,3.65832 31.0426,15.6046 8.8,4.87282 19.9041,11.0204 24.6758,13.66128 l 8.6758,4.8016 0.3242,7.61163 c 0.6286,14.75979 -0.2874,37.11619 -1.5175,37.03843 -0.6371,-0.0403 -15.0786,-7.18689 -32.0924,-15.88138 z" />
                <path d="M 701.8826,826.4233 V 804.4914 l 2.75,-1.9149 c 1.5125,-1.0532 13.1,-7.44931 25.75,-14.21359 12.65,-6.76428 26.547,-14.30088 30.8824,-16.748 10.0036,-5.64669 9.5869,-6.46125 9.5869,18.7403 0,24.37093 1.6669,21.11001 -15.4693,30.26405 -7.7,4.11329 -22.47,12.03659 -32.8222,17.60733 -10.3523,5.57074 -19.2398,10.12862 -19.75,10.12862 -0.5422,0 -0.9278,-9.11542 -0.9278,-21.9319 z" />
                <path d="M 689.3070,792.9648 c -24.0206,-12.49097 -51.3318,-27.95054 -50.8254,-28.76983 0.3037,-0.49143 4.2307,-2.73936 8.7266,-4.9954 4.4959,-2.25604 18.5004,-9.74403 31.121,-16.63997 l 22.9467,-12.53807 11.5533,5.95552 c 59.0327,30.43017 54.5581,26.60976 39.8034,33.98414 -9.7423,4.86918 -21.2543,10.92774 -47.3256,24.90678 l -6.0756,3.25764 z" />
              </g>

              <path class="p-fill" d="M 1014.0953,367.84861 c -5.9294,-2.57621 -6.4003,-5.29784 -6.035,-34.88447 0.4502,-36.46335 -2.1831,-33.98792 35.0913,-32.98762 l 26.2096,0.70337 2.7607,2.76074 2.7608,2.76074 v 28.02116 c 0,34.72273 0.7323,33.00297 -14.5794,34.23641 -16.8685,1.35885 -42.4536,1.02091 -46.208,-0.61033 z" />
              <path class="p-fill" d="M 1098.9928,317.9597 c -4.803,-2.66208 -5.0368,-4.21902 -5.0747,-33.7894 -0.05,-39.17148 -2.76,-36.18773 33.278,-36.6408 37.4672,-0.47104 34.6881,-3.31776 34.6828,35.52604 0,30.59707 -0.4506,33.00114 -6.5618,35.32459 -4.1069,1.56146 -53.4126,1.19341 -56.3243,-0.42043 z" />
              <path class="p-fill" d="M 1002.2708,263.4492 c -6.32566,-2.77756 -6.38816,-3.16676 -6.38816,-39.77848 0,-45.77526 -4.2081,-41.31548 38.98396,-41.31548 43.7534,0 39.0161,-4.80032 39.0161,39.53474 0,35.71348 -0.2219,37.49442 -4.9784,39.95409 -3.1759,1.6423 -63.253,3.08949 -66.6335,1.60513 z" />
              <path class="p-fill" d="M 1133.9998,202.6165 c -11.7206,-1.04103 -11.8257,-1.45044 -12.2553,-47.76131 -0.5033,-54.24661 -5.007,-49.49622 46.928,-49.49844 51.8701,-0.002 47.2102,-4.87027 47.2102,49.31844 0,52.94017 3.8375,48.75737 -44.5,48.50374 -18.15,-0.0952 -34.9723,-0.34833 -37.3829,-0.56243 z" />
            </g>

            <!-- Outlines for Draw Animation -->
            <g fill="none" stroke-linecap="round">
              <path class="draw-c" d="M 632.5492,957.6886 c -0.3666,-0.36667 -0.6666,-15.88602 -0.6666,-34.48746 V 889.3803 l 3.75,-2.32912 c 2.0625,-1.28102 9.6,-5.39171 16.75,-9.13488 7.15,-3.74316 19.2107,-10.17748 26.8016,-14.29848 7.5909,-4.12101 14.0596,-7.23467 14.3751,-6.91926 1.2477,1.24774 0.3339,67.12909 -0.9427,67.95754 -0.6787,0.44049 -7.759,4.51673 -15.734,9.0583 -7.975,4.54157 -20.8932,11.94367 -28.7071,16.44911 -15.3007,8.82232 -14.6448,8.50648 -15.6263,7.52504 z" stroke="#22d3ee" stroke-width="2" />
              <path class="draw-c" d="M 620.8826,955.8408 c -1.375,-0.78887 -14.875,-8.1331 -30,-16.32051 l -27.5,-14.88621 -0.2628,-35.13945 c -0.2094,-28.00201 0,-35.13946 1.0158,-35.13946 0.7033,0 4.2856,1.75711 7.9606,3.90469 3.6751,2.14758 16.4929,9.32132 28.4842,15.94165 11.9912,6.62033 22.7022,12.7019 23.8022,13.51461 3.1664,2.33946 3.2928,69.71101 0.1305,69.59902 -0.6218,-0.022 -2.2555,-0.68548 -3.6305,-1.47434 z" stroke="#22d3ee" stroke-width="2" />
              <path class="draw-c" d="M 619.88264,877.4583 c -4.675,-2.6631 -15.25,-8.56447 -23.5,-13.11415 -22.5645,-12.44379 -25.841,-14.40487 -25.7562,-15.41604 0.1294,-1.54372 56.5995,-29.56771 58.4377,-29.00046 4.4794,1.38223 58.3185,30.32864 58.3185,31.35469 0,0.64822 -7.425,5.02299 -16.5,9.72172 -9.075,4.69872 -21.7661,11.42494 -28.2023,14.94714 -13.9279,7.62195 -12.2572,7.5115 -22.7977,1.5071 z" stroke="#22d3ee" stroke-width="2" />
              <path class="draw-c" d="M 750.8826,950.1769 c -6.875,-3.83764 -19.7,-10.82251 -28.5,-15.52193 -8.8,-4.69943 -16.7875,-9.23412 -17.75,-10.07709 -2.0133,-1.76326 -2.7071,-64.19922 -0.747,-67.2227 0.8331,-1.285 1.7984,-1.05534 6.7347,1.60229 3.1693,1.70626 16.8998,9.06448 30.5123,16.3516 l 24.75,13.24931 v 34.3984 c 0,26.90559 -0.2723,34.37654 -1.25,34.29802 -0.6875,-0.0552 -6.875,-3.24027 -13.75,-7.0779 z" stroke="#22d3ee" stroke-width="2" />
              <path class="draw-c" d="M 772.5492,956.6886 c -1.3222,-1.32228 -0.7643,-66.83047 0.5834,-68.49405 0.6875,-0.84863 5.975,-4.24592 11.75,-7.54953 10.3152,-5.90088 27.7029,-16.02995 41.4841,-24.16635 3.8413,-2.26787 7.3288,-4.12341 7.75,-4.12341 0.4212,0 0.7646,15.6375 0.763,34.75 v 34.75 l -10.2471,6.09429 c -5.636,3.35186 -14.2972,8.4783 -19.2472,11.39209 -34.0504,20.04364 -31.4896,18.69067 -32.8333,17.34696 z" stroke="#22d3ee" stroke-width="2" />
              <path class="draw-c" d="M 764.6847,879.9672 c -2.3662,-1.25677 -11.5021,-6.01579 -20.3021,-10.57559 -26.9687,-13.97407 -32.6245,-17.16293 -32.2789,-18.19965 0.1829,-0.54878 9.3205,-5.71653 20.3057,-11.48391 10.9853,-5.76737 24.3157,-12.93113 29.6233,-15.91947 5.3076,-2.98833 10.5059,-5.43334 11.5519,-5.43334 2.9304,0 56.298,26.92074 56.298,28.39894 0,1.0605 -53.2488,32.36714 -59.1898,34.79957 -1.0235,0.41904 -3.4273,-0.21571 -6.0081,-1.58655 z" stroke="#22d3ee" stroke-width="2" />
              <path class="draw-c" d="M 661.4485,832.4006 c -23.6662,-12.09409 -31.1507,-16.36466 -31.8561,-18.17679 -0.9845,-2.529 -0.2967,-43.61507 0.7476,-44.65937 0.7329,-0.73288 9.4684,3.65832 31.0426,15.6046 8.8,4.87282 19.9041,11.0204 24.6758,13.66128 l 8.6758,4.8016 0.3242,7.61163 c 0.6286,14.75979 -0.2874,37.11619 -1.5175,37.03843 -0.6371,-0.0403 -15.0786,-7.18689 -32.0924,-15.88138 z" stroke="#22d3ee" stroke-width="2" />
              <path class="draw-c" d="M 701.8826,826.4233 V 804.4914 l 2.75,-1.9149 c 1.5125,-1.0532 13.1,-7.44931 25.75,-14.21359 12.65,-6.76428 26.547,-14.30088 30.8824,-16.748 10.0036,-5.64669 9.5869,-6.46125 9.5869,18.7403 0,24.37093 1.6669,21.11001 -15.4693,30.26405 -7.7,4.11329 -22.47,12.03659 -32.8222,17.60733 -10.3523,5.57074 -19.2398,10.12862 -19.75,10.12862 -0.5422,0 -0.9278,-9.11542 -0.9278,-21.9319 z" stroke="#22d3ee" stroke-width="2" />
              <path class="draw-c" d="M 689.3070,792.9648 c -24.0206,-12.49097 -51.3318,-27.95054 -50.8254,-28.76983 0.3037,-0.49143 4.2307,-2.73936 8.7266,-4.9954 4.4959,-2.25604 18.5004,-9.74403 31.121,-16.63997 l 22.9467,-12.53807 11.5533,5.95552 c 59.0327,30.43017 54.5581,26.60976 39.8034,33.98414 -9.7423,4.86918 -21.2543,10.92774 -47.3256,24.90678 l -6.0756,3.25764 z" stroke="#22d3ee" stroke-width="2" />
              
              <path class="b-draw" d="M 240.8826,1091.0043 c 0,-5.1729 38.3107,-52.6825 62.5,-77.5069 63.56,-65.22894 102.1516,-81.17118 165,-68.16158 9.6394,1.99535 15.3704,3.83975 46.2215,14.87521 36.1461,12.9295 32.6985,12.6442 152.7785,12.6442 108.9573,0 111.6311,-0.1103 135.5,-5.5908 102.6944,-23.57937 148.7718,-117.85346 96.094,-196.60763 -26.4785,-39.58579 -68.5318,-57.21275 -151.094,-63.33225 -23.6244,-1.75104 -29.0549,-2.38546 -29.1285,-3.40298 -0.037,-0.51351 18.539,-10.87823 41.2804,-23.03271 44.8045,-23.94638 64.9409,-35.22175 91.4621,-51.21394 19.5262,-11.77428 17.0551,-11.2995 38.0489,-7.31056 59.3791,11.28243 101.3391,31.96978 133.34276,65.7414 61.1192,64.4959 73.6621,175.44026 28.9704,256.24945 -2.8897,5.225 -6.4477,11.75 -7.9068,14.50002 -10.7446,20.2517 -44.65641,56.08177 -69.06926,72.97627 -3.025,2.0934 -7.525,5.2631 -10,7.0439 -40.2434,28.9545 -96.9174,48.5021 -152,52.4268 -24.0339,1.7125 -572,1.4271 -572,-0.2979 z" stroke="#ffffff" stroke-width="3.5" filter="url(#v3-glow)" />
              <path class="t-draw" d="M 404.2043,722.4171 c -190.6476,-72.6017 -136.4318,-343.00602 82.1783,-409.86826 41.0981,-12.56992 29.541,-12.04869 280,-12.62828 240.10096,-0.55562 219.6899,-1.31869 216.5464,8.09566 -24.3765,73.00299 -55.1862,116.85831 -92.7327,131.99831 -17.5819,7.08958 -5.0506,6.57826 -180.8137,7.37785 -102.8052,0.46769 -160.9439,1.09094 -164.5,1.76344 -101.3958,19.17502 -106.251,140.35575 -6.5,162.23293 7.2931,1.59951 31.6295,3.68203 58.5,5.00597 12.925,0.63683 25.075,1.4936 27,1.90393 l 3.5,0.74607 -6,2.74429 c -3.3,1.50936 -10.7916,4.72153 -16.6481,7.13815 -50.9207,21.01224 -124.0509,58.47929 -177.2442,90.80815 -12.7918,7.77436 -10.5816,7.51982 -23.286,2.68179 z" stroke="#ffffff" stroke-width="3.5" filter="url(#v3-glow)" />
              <path class="sw-pulse" d="M 71.882614,1090.2154 c 0,-8.7327 46.020946,-79.8445 71.097426,-109.86017 43.0871,-51.57384 84.7221,-93.54924 129.9026,-130.96458 7.425,-6.14887 15.525,-12.86028 18,-14.91424 69.0094,-57.26987 195.8403,-131.28473 309,-180.3236 24.86,-10.77336 52.7886,-22.59535 55.0841,-23.31681 2.2867,-0.71871 10.5659,-4.01762 33.4159,-13.31492 5.5,-2.23786 22.15,-8.85822 37,-14.71191 155.1882,-61.17334 238.9978,-114.43908 304.77866,-193.70396 l 8.9213,-10.75 h 6.341 c 8.571,0 8.5708,-0.0654 0.062,16.72644 -48.97826,96.65485 -165.61586,189.62508 -350.89356,279.69223 -40.8025,19.83491 -53.655,26.00355 -66.2092,31.7775 -7.15,3.28844 -15.025,7.04906 -17.5,8.35693 -2.475,1.30787 -15.7718,7.7814 -29.5485,14.38562 -136.3594,65.36777 -253.8992,139.88511 -359.5169,227.925 -45.4476,37.88387 -81.7348,70.26667 -114.09384,101.81797 l -13.659206,13.3183 h -11.09099 c -10.66566,0 -11.09079,-0.082 -11.09079,-2.1398 z" stroke="#97f813" stroke-width="6.5" filter="url(#v3-glow)" />
            </g>
          </g> <!-- end logo-main-grp -->

        </g> <!-- end logo-layout-grp -->

      </g> <!-- end logo-viewport -->
    </svg>
  </div>
</template>

<style scoped>
/* Container Overlay */
.brand-intro-overlay {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 99999;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #020817; /* Solid background initially to hide login screen flash */
  overflow: hidden;
}

/* Background Effects (radial navy gradient) */
.bg-effects {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2; /* Layered above exit panels, below particles and SVG */
}

.radial-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(6, 18, 37, 0.95) 0%, rgba(2, 8, 23, 1) 100%);
}

.ambient-light {
  position: absolute;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(151, 248, 19, 0.03) 0%, rgba(12, 148, 78, 0.01) 50%, rgba(0, 0, 0, 0) 100%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  filter: blur(80px);
  z-index: 2;
}

/* responsive SVG stage */
#logo-svg-canvas {
  position: relative;
  width: clamp(320px, 80vw, 1200px);
  height: auto;
  max-height: 85vh;
  aspect-ratio: 1000 / 600;
  z-index: 4; /* Above panels, background effects */
  display: block;
}

/* SVG paths fill bindings */
.svg-text-path {
  fill: #0c944e; /* Brand dark green */
}

.logo-main-path {
  fill: #97f813; /* Brand neon green */
}

.cube-group path {
  fill: #97f813;
  opacity: 0;
}

.pixel-block {
  fill: #97f813;
  opacity: 0;
}

/* Exit Split Panels */
.exit-panel {
  position: absolute;
  top: 0;
  height: 100%;
  width: 50%;
  background-color: #020817; /* Matches --bg-dark */
  z-index: 1; /* Background layer, underneath everything else */
  transform: translateX(0);
}

.panel-left {
  left: 0;
  border-right: 1px solid rgba(255, 255, 255, 0.02);
}

.panel-right {
  right: 0;
  border-left: 1px solid rgba(255, 255, 255, 0.02);
}

.highlight-sweep-group {
  mix-blend-mode: screen;
}

/* Global scroll locking */
:global(.scroll-locked) {
  overflow: hidden !important;
  touch-action: none !important;
}

/* Interaction Prompt Overlay */
.interaction-prompt {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(2, 8, 23, 0.95); /* Deep dark background */
  z-index: 100; /* On top of everything */
  transition: opacity 0.5s ease;
}

.prompt-content {
  text-align: center;
  max-width: 400px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: fadeIn 0.8s ease-out;
}

.brand-logo-glow {
  position: relative;
  width: 80px;
  height: 80px;
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

.pulse-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 2px solid #97f813;
  border-radius: 50%;
  animation: pulseOuter 2s infinite ease-out;
}

.pulse-dot {
  width: 24px;
  height: 24px;
  background-color: #97f813;
  border-radius: 50%;
  box-shadow: 0 0 20px #97f813;
  animation: pulseInner 2s infinite ease-in-out;
}

.prompt-title {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 2.25rem;
  font-weight: 800;
  color: #ffffff;
  margin: 0 0 0.75rem 0;
  letter-spacing: 0.05em;
  text-shadow: 0 0 15px rgba(151, 248, 19, 0.2);
}

.prompt-subtitle {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 0.95rem;
  color: #94a3b8; /* Slate 400 */
  margin: 0 0 2rem 0;
  line-height: 1.5;
}

.start-btn {
  position: relative;
  background-color: #0c944e; /* Brand dark green */
  color: #ffffff;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 1rem;
  font-weight: 600;
  padding: 0.85rem 2.25rem;
  border: 1px solid rgba(151, 248, 19, 0.4);
  border-radius: 50px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 20px rgba(12, 148, 78, 0.3);
}

.start-btn:hover {
  background-color: #97f813; /* Brand neon green */
  color: #020817; /* Dark background text */
  border-color: #97f813;
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(151, 248, 19, 0.5);
}

.start-btn:active {
  transform: translateY(0);
}

.btn-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 120%;
  height: 120%;
  background: radial-gradient(circle, rgba(151, 248, 19, 0.4) 0%, transparent 70%);
  transform: translate(-50%, -50%) scale(0);
  transition: transform 0.5s ease-out;
  pointer-events: none;
}

.start-btn:hover .btn-glow {
  transform: translate(-50%, -50%) scale(1.5);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulseOuter {
  0% {
    transform: scale(0.6);
    opacity: 1;
  }
  100% {
    transform: scale(1.4);
    opacity: 0;
  }
}

@keyframes pulseInner {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 15px #97f813;
  }
  50% {
    transform: scale(1.15);
    box-shadow: 0 0 25px #97f813, 0 0 40px #22d3ee;
  }
}
</style>
