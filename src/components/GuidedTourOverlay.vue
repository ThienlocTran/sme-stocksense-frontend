<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useRouter } from "vue-router";

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  steps: {
    type: Array,
    default: () => [],
  },
  initialStep: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(["close", "completed", "skip"]);
const router = useRouter();

const currentStepIndex = ref(props.initialStep);
const spotlightRect = ref(null);
let updateTargetInFlight = false;
let updateTargetQueued = false;
let navToken = 0;
let pendingNavigationToken = null;
let pendingNavigationPrevRoute = null;
let pendingNavigationCancelled = false;

const currentStep = computed(() => props.steps[currentStepIndex.value] || null);
const isLastStep = computed(() => {
  return currentStepIndex.value >= (props.steps.length || 1) - 1;
});

async function updateTarget() {
  if (!props.open) return;

  if (updateTargetInFlight) {
    updateTargetQueued = true;
    return;
  }

  updateTargetInFlight = true;

  try {
    while (true) {
      updateTargetQueued = false;

      const step = currentStep.value;
      if (!step) {
        spotlightRect.value = null;
        break;
      }

      if (step.route && router.currentRoute.value.path !== step.route) {
        try {
          // prepare cancellable navigation token and remember previous route
          pendingNavigationPrevRoute = router.currentRoute.value.fullPath;
          navToken += 1;
          const token = navToken;
          pendingNavigationToken = token;
          pendingNavigationCancelled = false;

          await router.push(step.route);

          // if the tour was closed or cancelled while navigation was pending, revert
          if (
            !props.open ||
            pendingNavigationToken !== token ||
            pendingNavigationCancelled
          ) {
            if (
              router.currentRoute.value.path === step.route &&
              pendingNavigationPrevRoute !== null
            ) {
              try {
                await router.push(pendingNavigationPrevRoute);
              } catch {
                // ignore revert errors
              }
            }
            spotlightRect.value = null;
            break;
          }

          await nextTick();
          if (
            !props.open ||
            pendingNavigationToken !== token ||
            pendingNavigationCancelled
          ) {
            if (
              router.currentRoute.value.path === step.route &&
              pendingNavigationPrevRoute !== null
            ) {
              try {
                await router.push(pendingNavigationPrevRoute);
              } catch {}
            }
            spotlightRect.value = null;
            break;
          }
          // If navigation was redirected or blocked and we're not on the expected route,
          // skip this step rather than attempting to locate a selector on the wrong page.
          if (router.currentRoute.value.path !== step.route) {
            spotlightRect.value = null;
            if (currentStepIndex.value < props.steps.length - 1) {
              currentStepIndex.value += 1;
            } else {
              emit("completed");
            }
            break;
          }
        } catch {
          spotlightRect.value = null;
          break;
        }
      }

      const selector = step.selector;
      if (!selector) {
        spotlightRect.value = null;
        break;
      }

      await nextTick();
      if (!props.open) break;

      const target = document.querySelector(selector);
      if (!(target instanceof HTMLElement)) {
        spotlightRect.value = null;
        if (currentStepIndex.value < props.steps.length - 1) {
          currentStepIndex.value += 1;
        } else {
          emit("completed");
        }
        break;
      }

      const rect = target.getBoundingClientRect();
      spotlightRect.value = {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      };

      if (updateTargetQueued) {
        continue;
      }

      break;
    }
  } finally {
    updateTargetInFlight = false;
    if (updateTargetQueued && props.open) {
      await updateTarget();
    }
  }
}

function handleNextStep() {
  if (isLastStep.value) {
    emit("completed");
    return;
  }

  currentStepIndex.value += 1;
}

function closeTour() {
  pendingNavigationCancelled = true;
  emit("close");
}

function skipTour() {
  pendingNavigationCancelled = true;
  emit("skip");
}

function syncCurrentStepIndex() {
  if (!props.open) return;

  if (!props.steps?.length) {
    emit("close");
    return;
  }

  const clampedIndex = Math.min(
    Math.max(currentStepIndex.value, 0),
    props.steps.length - 1,
  );

  if (clampedIndex !== currentStepIndex.value) {
    currentStepIndex.value = clampedIndex;
  }

  nextTick(() => {
    updateTarget();
  });
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      currentStepIndex.value = Math.min(
        Math.max(props.initialStep, 0),
        Math.max(props.steps.length - 1, 0),
      );
      nextTick(() => {
        updateTarget();
      });
    }
  },
  { immediate: true },
);

watch(
  () => props.steps,
  () => {
    syncCurrentStepIndex();
  },
  { deep: true },
);

watch(currentStepIndex, () => {
  nextTick(() => {
    updateTarget();
  });
});

function handleResize() {
  if (!props.open) return;
  updateTarget();
}

onMounted(() => {
  window.addEventListener("resize", handleResize);
  window.addEventListener("scroll", handleResize, true);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
  window.removeEventListener("scroll", handleResize, true);
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="tour-backdrop" @click.self="closeTour">
      <div
        class="tour-spotlight"
        :style="
          spotlightRect
            ? {
                top: `${spotlightRect.top}px`,
                left: `${spotlightRect.left}px`,
                width: `${spotlightRect.width}px`,
                height: `${spotlightRect.height}px`,
              }
            : {}
        "
      />

      <div
        class="tour-card"
        :style="
          spotlightRect
            ? {
                top: `${Math.min(Math.max(spotlightRect.top + spotlightRect.height + 12, 24), Math.max(window.innerHeight - 220, 24))}px`,
                left: `${Math.min(Math.max(spotlightRect.left, 24), Math.max(window.innerWidth - 360, 24))}px`,
                maxWidth: `${Math.min(360, window.innerWidth - 48)}px`,
              }
            : { top: '24px', right: '24px', maxWidth: '360px' }
        "
      >
        <div class="tour-pill">Hướng dẫn nhanh</div>
        <h3>{{ currentStep?.title || "Hướng dẫn" }}</h3>
        <p>
          {{ currentStep?.description || "Bạn có thể bỏ qua bất cứ lúc nào." }}
        </p>
        <div class="tour-actions">
          <button
            class="btn btn-ghost tour-btn"
            type="button"
            @click="skipTour"
          >
            Bỏ qua
          </button>
          <button class="btn tour-btn" type="button" @click="handleNextStep">
            {{ isLastStep ? "Hoàn tất" : "Tiếp tục" }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.tour-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(2, 6, 23, 0.58);
}

.tour-spotlight {
  position: fixed;
  z-index: 10000;
  border-radius: 14px;
  box-shadow: 0 0 0 9999px rgba(2, 6, 23, 0.58);
  border: 2px solid #fff;
}

.tour-card {
  position: fixed;
  z-index: 10001;
  display: grid;
  gap: 10px;
  padding: 18px 18px 16px;
  border-radius: 16px;
  background: #fff;
  color: #0f172a;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
}

.tour-pill {
  display: inline-flex;
  width: fit-content;
  padding: 5px 10px;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.tour-card h3 {
  margin: 0;
  font-size: 18px;
  line-height: 24px;
}

.tour-card p {
  margin: 0;
  color: #475569;
  line-height: 1.6;
}

.tour-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.tour-btn {
  min-width: 96px;
}

@media (max-width: 767px) {
  .tour-card {
    width: calc(100vw - 32px);
    max-width: none;
    left: 16px !important;
    right: 16px !important;
    top: auto !important;
    bottom: 16px;
  }
}
</style>
