<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import BrandIntroOverlay from '../components/branding/BrandIntroOverlay.vue'
import StockSenseMark from '../components/branding/StockSenseMark.vue'

const router = useRouter()
const showIntro = ref(false)
const prefersReduced = ref(false)

// Active states for spinners
const activeSpinner = ref('all') // 'all', 's-mark', 'cubes', 'pixels', 'mdi'

// GSAP timelines for preview spinners
let cubesTimeline = null
let pixelsTimeline = null

function triggerIntro() {
  // Clear played session state so the intro runs
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem('stocksense-intro-played')
  }
  showIntro.value = true
}

function handleIntroComplete() {
  showIntro.value = false
}

function goBack() {
  router.push('/login')
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    prefersReduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  // Spinner 2: Infinite stagger bounce on cubes
  cubesTimeline = gsap.timeline({ repeat: -1 })
  cubesTimeline.fromTo('.cubes-loader #box-1-wrapper, .cubes-loader #box-2-wrapper, .cubes-loader #box-3-wrapper',
    { y: 15, scale: 0.8, transformOrigin: 'center center' },
    {
      y: -15,
      scale: 1.1,
      duration: 0.45,
      transformOrigin: 'center center',
      stagger: {
        each: 0.12,
        yoyo: true,
        repeat: 1
      },
      ease: 'power1.inOut'
    }
  )

  // Spinner 3: Infinite stagger pulsing wave on data pixels
  pixelsTimeline = gsap.timeline({ repeat: -1 })
  pixelsTimeline.fromTo('.pixels-loader #pixel-1, .pixels-loader #pixel-2, .pixels-loader #pixel-3, .pixels-loader #pixel-4',
    { opacity: 0.3, scale: 0.7 },
    {
      opacity: 1,
      scale: 1.3,
      duration: 0.4,
      stagger: {
        each: 0.1,
        yoyo: true,
        repeat: 1
      },
      transformOrigin: 'center center',
      ease: 'sine.inOut'
    }
  )
})

onUnmounted(() => {
  if (cubesTimeline) cubesTimeline.kill()
  if (pixelsTimeline) pixelsTimeline.kill()
})
</script>

<template>
  <div class="preview-container">
    <!-- Brand Intro Overlay Triggered dynamically -->
    <BrandIntroOverlay v-if="showIntro" @complete="handleIntroComplete" />

    <!-- Navigation Header -->
    <header class="preview-header">
      <div class="header-left">
        <button class="back-btn" @click="goBack" aria-label="Quay lại">
          <i class="mdi mdi-arrow-left"></i> Quay lại Đăng nhập
        </button>
      </div>
      <h1 class="preview-title">StockSense Motion & Branding Lab</h1>
      <p class="preview-desc">Thử nghiệm và lựa chọn các biến thể chuyển động tải dữ liệu & logo thương hiệu</p>
    </header>

    <main class="preview-main">
      <!-- Section 1: Full Brand Intro Overlay -->
      <section class="preview-card intro-card">
        <div class="card-header">
          <h2 class="card-title"><i class="mdi mdi-movie-play-outline"></i> 1. Full-Screen Entrance Animation (Intro)</h2>
          <span class="badge">GSAP + SVG</span>
        </div>
        <p class="card-desc">Hiệu ứng mở đầu khi người dùng truy cập hệ thống. Logo được lắp ráp tuần tự (Hộp -> Chữ S -> Quét ánh sáng -> Điểm dữ liệu -> Thương hiệu chữ) trước khi tấm che rách đôi mở ra.</p>
        
        <div class="intro-preview-box">
          <div class="intro-preview-placeholder">
            <i class="mdi mdi-monitor-screenshot"></i>
            <span>Nhấp vào nút bên dưới để xem chạy thử Intro toàn màn hình</span>
          </div>
          <button class="btn btn-primary btn-lg" @click="triggerIntro">
            <i class="mdi mdi-play-circle-outline"></i> Khởi chạy Intro (Full-Screen)
          </button>
        </div>
      </section>

      <!-- Section 2: Loading Animation Variants Showcase -->
      <section class="preview-card spinners-card">
        <div class="card-header">
          <h2 class="card-title"><i class="mdi mdi-loading"></i> 2. Premium Branded Loading Spinner Options</h2>
          <span class="badge">Tự chỉnh / SVG / CSS / GSAP</span>
        </div>
        <p class="card-desc">Lựa chọn các kiểu hiển thị vòng xoay tải dữ liệu (Loading) mang nhận diện thương hiệu đặc trưng của SME StockSense để thay thế spinner mặc định.</p>

        <div class="spinners-grid">
          <!-- Option A: Rotating S-Mark -->
          <div class="spinner-option-card">
            <div class="spinner-demo-box">
              <StockSenseMark class="spinner-svg rotating-s-mark" />
            </div>
            <div class="spinner-meta">
              <h3>Biến thể A: Rotating S-Mark</h3>
              <p>Chuyển động xoay tròn 360 độ vô hạn của khối S-mark thương hiệu. Tạo cảm giác kỹ thuật số tối giản.</p>
              <span class="tech-tag tag-css">CSS Animation</span>
            </div>
          </div>

          <!-- Option B: Stagger Bouncing Cubes -->
          <div class="spinner-option-card">
            <div class="spinner-demo-box cubes-loader">
              <StockSenseMark class="spinner-svg" />
            </div>
            <div class="spinner-meta">
              <h3>Biến thể B: Stagger Bouncing Cubes</h3>
              <p>Khối hộp kho tàng tích trữ bên trong lòng chữ S nhún nhảy so le liên tục, tượng trưng cho luồng hàng hóa lưu chuyển.</p>
              <span class="tech-tag tag-gsap">GSAP Timeline</span>
            </div>
          </div>

          <!-- Option C: Wave Pulsing Pixels -->
          <div class="spinner-option-card">
            <div class="spinner-demo-box pixels-loader">
              <StockSenseMark class="spinner-svg" />
            </div>
            <div class="spinner-meta">
              <h3>Biến thể C: Wave Pulsing Pixels</h3>
              <p>Bốn điểm dữ liệu bay xung quanh góc phải logo nhấp nháy tuần tự theo làn sóng, thể hiện quá trình AI dự báo.</p>
              <span class="tech-tag tag-gsap">GSAP Stagger</span>
            </div>
          </div>

          <!-- Option D: Standard Spinner -->
          <div class="spinner-option-card">
            <div class="spinner-demo-box">
              <div class="standard-loading-wrapper">
                <i class="mdi mdi-loading mdi-spin standard-mdi-spinner"></i>
              </div>
            </div>
            <div class="spinner-meta">
              <h3>Biến thể D: Standard Spinner</h3>
              <p>Spinner xoay tròn mặc định sử dụng Material Design Icon. Đơn giản, quen thuộc và nhẹ nhất.</p>
              <span class="tech-tag tag-mdi">Icon MDI</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.preview-container {
  min-height: 100vh;
  background-color: #F8FAFC;
  color: #0F172A;
  padding: 40px 24px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.preview-header {
  max-width: 1000px;
  margin: 0 auto 32px auto;
  text-align: center;
  position: relative;
}

.header-left {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
}

.back-btn {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 150ms ease;
}

.back-btn:hover {
  background: #F1F5F9;
  color: #0F172A;
  border-color: #CBD5E1;
}

.preview-title {
  font-size: 28px;
  font-weight: 800;
  color: #0F2347;
  margin: 0 0 8px 0;
}

.preview-desc {
  font-size: 15px;
  color: #64748B;
  margin: 0;
}

.preview-main {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.preview-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  border-bottom: 1px solid #F1F5F9;
  padding-bottom: 16px;
}

.card-title {
  font-size: 20px;
  font-weight: 700;
  color: #0F2347;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.badge {
  background: #E0F2FE;
  color: #0369A1;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
}

.card-desc {
  font-size: 14px;
  line-height: 1.6;
  color: #475569;
  margin: 0 0 24px 0;
}

.intro-preview-box {
  background: #F8FAFC;
  border: 2px dashed #E2E8F0;
  border-radius: 12px;
  padding: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  text-align: center;
}

.intro-preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #94A3B8;
}

.intro-preview-placeholder i {
  font-size: 48px;
}

.intro-preview-placeholder span {
  font-size: 14px;
  font-weight: 500;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 700;
  border-radius: 10px;
  cursor: pointer;
  border: 0;
  transition: all 150ms ease;
}

.btn-primary {
  background: var(--color-brand, #10B981);
  color: #FFFFFF;
}

.btn-primary:hover {
  background: var(--color-brand-hover, #059669);
  transform: translateY(-1px);
}

.btn-lg {
  padding: 14px 28px;
  font-size: 16px;
}

/* Spinner option cards */
.spinners-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 24px;
}

.spinner-option-card {
  border: 1px solid #F1F5F9;
  background: #FFFFFF;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
  transition: transform 150ms ease, border-color 150ms ease;
}

.spinner-option-card:hover {
  transform: translateY(-2px);
  border-color: #CBD5E1;
}

.spinner-demo-box {
  height: 180px;
  background: #0F172A; /* Dark theme to match brand highlights */
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  padding: 24px;
}

.spinner-svg {
  width: 90px;
  height: 90px;
  display: block;
}

.spinner-meta {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid #F1F5F9;
}

.spinner-meta h3 {
  font-size: 15px;
  font-weight: 700;
  color: #0F2347;
  margin: 0;
}

.spinner-meta p {
  font-size: 12px;
  line-height: 1.5;
  color: #64748B;
  margin: 0;
  min-height: 54px;
}

.tech-tag {
  align-self: flex-start;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
}

.tag-css { background: #ECFDF5; color: #047857; }
.tag-gsap { background: #EEF2FF; color: #4F46E5; }
.tag-mdi { background: #F8FAFC; color: #475569; }

/* CSS Animations for spinners */
.rotating-s-mark {
  animation: spinSlow 3s linear infinite;
}

.standard-loading-wrapper {
  color: #10B981;
}

.standard-mdi-spinner {
  font-size: 40px;
}

@keyframes spinSlow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .header-left {
    position: static;
    transform: none;
    margin-bottom: 16px;
    display: inline-block;
  }
  .preview-header {
    text-align: left;
    margin-bottom: 24px;
  }
}
</style>
