<script setup>
import { onBeforeUnmount, onMounted, ref, watch, nextTick } from "vue";

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close"]);

const dialogRef = ref(null);
let previouslyFocused = null;

function close(action = "dismiss") {
  emit("close", action);
}

function handleWindowKeydown(event) {
  if (event.key === "Escape" && props.open) {
    close();
  }
}

function getFocusableElements() {
  if (!dialogRef.value) return [];
  const selectors =
    'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])';
  return Array.from(dialogRef.value.querySelectorAll(selectors)).filter(
    (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
  );
}

function handleDialogKeydown(e) {
  if (e.key !== "Tab") return;
  const focusable = getFocusableElements();
  if (focusable.length === 0) {
    e.preventDefault();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (e.shiftKey) {
    if (document.activeElement === first) {
      e.preventDefault();
      last.focus();
    }
  } else {
    if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

function enforceFocus(e) {
  if (!dialogRef.value) return;
  if (!dialogRef.value.contains(e.target)) {
    e.stopImmediatePropagation();
    dialogRef.value.focus();
  }
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      previouslyFocused = document.activeElement;
      await nextTick();
      const focusable = getFocusableElements();
      if (focusable.length) {
        focusable[0].focus();
      } else if (dialogRef.value) {
        dialogRef.value.setAttribute("tabindex", "-1");
        dialogRef.value.focus();
      }
      document.addEventListener("focus", enforceFocus, true);
      dialogRef.value?.addEventListener("keydown", handleDialogKeydown);
    } else {
      document.removeEventListener("focus", enforceFocus, true);
      dialogRef.value?.removeEventListener("keydown", handleDialogKeydown);
      if (previouslyFocused && previouslyFocused.focus) {
        previouslyFocused.focus();
      }
      previouslyFocused = null;
    }
  },
);

onMounted(() => {
  window.addEventListener("keydown", handleWindowKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleWindowKeydown);
  document.removeEventListener("focus", enforceFocus, true);
  dialogRef.value?.removeEventListener("keydown", handleDialogKeydown);
});
</script>

<template>
  <Teleport to="body">
    <transition name="welcome-fade">
      <div
        v-if="open"
        class="modal-backdrop welcome-backdrop"
        @click.self="close"
      >
        <div
          ref="dialogRef"
          tabindex="-1"
          class="welcome-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-modal-title"
        >
          <div class="welcome-hero">
            <div class="welcome-badge">
              <i class="mdi mdi-rocket-launch-outline"></i>
            </div>
            <div>
              <p class="welcome-eyebrow">Chào mừng bạn</p>
              <h2 id="welcome-modal-title">
                StockSense đã sẵn sàng cho ngày làm việc
              </h2>
            </div>
          </div>

          <div class="welcome-body">
            <p>
              Khám phá các tác vụ nhập, xuất, duyệt và theo dõi kho nhanh hơn
              với giao diện mới.
            </p>
            <ul>
              <li>
                Xem tổng quan kho và nhiệm vụ đang chờ xử lý ngay trên
                dashboard.
              </li>
              <li>
                Quản lý phiếu nhập, phiếu xuất và duyệt đơn thuận tiện hơn.
              </li>
              <li>Điều hướng dễ dàng trên thiết bị máy tính và điện thoại.</li>
            </ul>
          </div>

          <div class="welcome-actions">
            <button class="btn btn-ghost" type="button" @click="close('skip')">
              Để sau
            </button>
            <button
              class="btn btn-primary"
              type="button"
              @click="close('start')"
            >
              Bắt đầu
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.welcome-backdrop {
  padding: 20px;
}

.welcome-modal {
  width: min(560px, 100%);
  background: linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);
  border: 1px solid #dbeafe;
  border-radius: 16px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.18);
  overflow: hidden;
}

.welcome-hero {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 24px 24px 0;
}

.welcome-badge {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  color: #fff;
  background: linear-gradient(135deg, var(--primary), #60a5fa);
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.2);
  flex-shrink: 0;
}

.welcome-badge i {
  font-size: 24px;
}

.welcome-eyebrow {
  margin: 0 0 4px;
  color: var(--primary);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.welcome-hero h2 {
  margin: 0;
  font-size: 20px;
  line-height: 28px;
  color: var(--text);
}

.welcome-body {
  padding: 16px 24px 0;
  color: var(--muted);
}

.welcome-body p {
  margin: 0 0 12px;
  line-height: 1.6;
}

.welcome-body ul {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;
  line-height: 1.5;
}

.welcome-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px 24px 24px;
}

.welcome-fade-enter-active,
.welcome-fade-leave-active {
  transition: opacity 160ms ease;
}

.welcome-fade-enter-from,
.welcome-fade-leave-to {
  opacity: 0;
}

@media (max-width: 767px) {
  .welcome-hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .welcome-actions {
    flex-direction: column-reverse;
  }

  .welcome-actions .btn {
    width: 100%;
  }
}
</style>
