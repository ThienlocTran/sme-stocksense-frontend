<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  modelValue: {
    type: [String, Number, null],
    default: null
  },
  options: {
    type: Array, // Array of { value, label, sublabel, searchKey }
    required: true
  },
  placeholder: {
    type: String,
    default: 'Tìm kiếm...'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  error: {
    type: [String, Boolean],
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const containerRef = ref(null);
const searchInput = ref('');
const isOpen = ref(false);
const isFocused = ref(false);

// Find label for active modelValue
const selectedOption = computed(() => {
  return props.options.find(opt => opt.value === props.modelValue) || null;
});

// Update input text when selection changes
watch(() => props.modelValue, (newVal) => {
  if (newVal === null) {
    searchInput.value = '';
  } else if (selectedOption.value) {
    searchInput.value = selectedOption.value.label;
  }
}, { immediate: true });

// Filter options based on search query
const filteredOptions = computed(() => {
  const query = searchInput.value.toLowerCase().trim();
  if (!query || (selectedOption.value && selectedOption.value.label === searchInput.value)) {
    return props.options;
  }
  return props.options.filter(opt => 
    opt.label.toLowerCase().includes(query) || 
    (opt.searchKey && opt.searchKey.toLowerCase().includes(query)) ||
    (opt.sublabel && opt.sublabel.toLowerCase().includes(query))
  );
});

function handleFocus() {
  if (props.disabled) return;
  isOpen.value = true;
  isFocused.value = true;
  // Clear input so user can see all options and type search query
  searchInput.value = '';
}

function handleBlur() {
  isFocused.value = false;
  // Delay slightly to allow click event on options list to trigger first
  setTimeout(() => {
    if (!isFocused.value) {
      isOpen.value = false;
      // Restore input text to current selection label
      if (selectedOption.value) {
        searchInput.value = selectedOption.value.label;
      } else {
        searchInput.value = '';
      }
    }
  }, 200);
}

function selectOption(option) {
  emit('update:modelValue', option.value);
  emit('change', option.value);
  searchInput.value = option.label;
  isOpen.value = false;
}

// Click outside handler to close dropdown list
function handleClickOutside(event) {
  if (containerRef.value && !containerRef.value.contains(event.target)) {
    isOpen.value = false;
    if (selectedOption.value) {
      searchInput.value = selectedOption.value.label;
    } else {
      searchInput.value = '';
    }
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div ref="containerRef" class="searchable-select-container">
    <div class="searchable-select-input-wrapper">
      <input
        v-model="searchInput"
        type="text"
        class="searchable-select-input"
        :class="{ 'searchable-select-input--error': error, 'searchable-select-input--focused': isOpen }"
        :placeholder="placeholder"
        :disabled="disabled"
        @focus="handleFocus"
        @blur="handleBlur"
      />
      <!-- Dropdown arrow indicator -->
      <span class="searchable-select-icon">
        <i class="mdi" :class="isOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'"></i>
      </span>
    </div>

    <!-- Dropdown list overlay -->
    <transition name="slide-fade">
      <ul v-if="isOpen && !disabled" class="searchable-select-dropdown">
        <li 
          v-if="filteredOptions.length === 0" 
          class="searchable-select-no-results"
        >
          Không tìm thấy kết quả
        </li>
        <li
          v-for="option in filteredOptions"
          :key="option.value"
          class="searchable-select-option"
          :class="{ 'searchable-select-option--selected': option.value === modelValue }"
          @mousedown.prevent="selectOption(option)"
        >
          <div class="searchable-select-option-label">{{ option.label }}</div>
          <div v-if="option.sublabel" class="searchable-select-option-sublabel">{{ option.sublabel }}</div>
        </li>
      </ul>
    </transition>
  </div>
</template>

<style scoped>
.searchable-select-container {
  position: relative;
  width: 100%;
}

.searchable-select-input-wrapper {
  position: relative;
  width: 100%;
}

.searchable-select-input {
  width: 100%;
  min-height: 40px;
  padding: 8px 36px 8px 12px;
  border: 1px solid var(--color-border-strong);
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  background: var(--color-surface);
  color: var(--color-text-primary);
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}

.searchable-select-input:focus,
.searchable-select-input--focused {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-soft);
}

.searchable-select-input--error {
  border-color: var(--color-danger) !important;
}

.searchable-select-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--color-text-secondary);
  font-size: 18px;
  display: flex;
  align-items: center;
}

.searchable-select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 50;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-height: 250px;
  overflow-y: auto;
  margin: 0;
  padding: 4px 0;
  list-style: none;
}

.searchable-select-option {
  padding: 10px 14px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
  transition: background-color 0.15s;
  color: var(--color-text-primary);
}

.searchable-select-option:hover {
  background-color: var(--color-bg);
}

.searchable-select-option--selected {
  background-color: var(--color-primary-soft) !important;
  color: var(--color-primary);
  font-weight: 600;
}

.searchable-select-option-label {
  font-size: 14px;
  line-height: 1.4;
}

.searchable-select-option-sublabel {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.searchable-select-no-results {
  padding: 12px 14px;
  color: var(--color-text-secondary);
  font-size: 14px;
  font-style: italic;
  text-align: center;
}

/* Scrollbar styling */
.searchable-select-dropdown::-webkit-scrollbar {
  width: 6px;
}

.searchable-select-dropdown::-webkit-scrollbar-track {
  background: transparent;
}

.searchable-select-dropdown::-webkit-scrollbar-thumb {
  background-color: var(--color-border);
  border-radius: 3px;
}

/* Transition animations */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.15s ease-out;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-8px);
  opacity: 0;
}
</style>
