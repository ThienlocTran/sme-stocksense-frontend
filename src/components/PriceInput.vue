<script setup>
import { ref, computed, watch, nextTick } from 'vue'

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  modelValue: {
    type: [Number, String],
    default: 0
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'blur', 'focus'])

const inputRef = ref(null)
const isFocused = ref(false)
const rawInput = ref('')

// Format number to Vietnamese dot-separated format (e.g. 350000 -> 350.000)
function formatNumber(val) {
  if (val === null || val === undefined || val === '') return ''
  const num = parseInt(val.toString().replace(/\D/g, ''), 10)
  if (isNaN(num)) return ''
  return num.toLocaleString('vi-VN')
}

// Parse formatted string to number
function parseNumber(val) {
  if (!val) return 0
  const cleanStr = val.toString().replace(/\D/g, '')
  return cleanStr ? parseInt(cleanStr, 10) : 0
}

// Sync prop changes to rawInput
watch(() => props.modelValue, (newVal) => {
  const currentNum = parseNumber(rawInput.value)
  const propNum = Number(newVal) || 0
  if (currentNum !== propNum || (newVal === 0 && rawInput.value === '')) {
    rawInput.value = newVal !== null && newVal !== undefined && newVal !== 0 && newVal !== '' ? formatNumber(newVal) : ''
  }
}, { immediate: true })

// Suggestion suffix ".000" logic
const suggestionSuffix = computed(() => {
  if (!isFocused.value || !rawInput.value) return ''
  const clean = rawInput.value.replace(/\D/g, '')
  if (!clean || clean === '0') return ''
  
  // If it already ends with '000', do not suggest.
  if (clean.endsWith('000')) return ''
  
  return '.000'
})

// Apply the ".000" suggestion
function applySuggestion() {
  if (!suggestionSuffix.value) return false
  
  const currentNum = parseNumber(rawInput.value)
  const newNum = currentNum * 1000
  
  rawInput.value = formatNumber(newNum)
  emit('update:modelValue', newNum)
  return true
}

// Handle keydown events
function handleKeyDown(e) {
  if (e.key === 'Tab') {
    if (suggestionSuffix.value) {
      applySuggestion()
      // Do not prevent default so that the focus moves to the next element naturally.
    }
  } else if (e.key === 'Enter') {
    if (suggestionSuffix.value) {
      e.preventDefault() // Prevent form submission
      applySuggestion()
    }
  }
}

// Handle text input and format as-you-type
function handleInput(e) {
  const val = e.target.value
  const clean = val.replace(/\D/g, '')
  
  // Maintain cursor position during formatting
  const cursorPosition = e.target.selectionStart
  const oldLen = val.length
  
  const formatted = formatNumber(clean)
  rawInput.value = formatted
  
  const numVal = clean ? parseInt(clean, 10) : ''
  emit('update:modelValue', numVal)
  
  nextTick(() => {
    if (inputRef.value) {
      const newLen = formatted.length
      const diff = newLen - oldLen
      let newCursor = cursorPosition + diff
      if (newCursor < 0) newCursor = 0
      inputRef.value.setSelectionRange(newCursor, newCursor)
    }
  })
}

function handleFocus(e) {
  isFocused.value = true
  emit('focus', e)
}

function handleBlur(e) {
  isFocused.value = false
  // Safe autocomplete on blur if there is a suggestion, so that clicking out also saves the intended value
  if (suggestionSuffix.value) {
    applySuggestion()
  }
  emit('blur', e)
}
</script>

<template>
  <div class="price-input-container">
    <input
      ref="inputRef"
      type="text"
      inputmode="numeric"
      :value="rawInput"
      :disabled="disabled"
      @input="handleInput"
      @keydown="handleKeyDown"
      @focus="handleFocus"
      @blur="handleBlur"
      v-bind="$attrs"
      class="price-input-element"
    />
    <div v-if="suggestionSuffix" class="price-input-suggestion">
      <span class="price-input-suggestion-visible">{{ rawInput }}</span>
      <span class="price-input-suggestion-fade">{{ suggestionSuffix }}</span>
    </div>
  </div>
</template>

<style scoped>
.price-input-container {
  position: relative;
  width: 100%;
  display: inline-block;
}

.price-input-element {
  /* Inherit all properties from parent class bindings */
  width: 100% !important;
}

.price-input-suggestion {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  pointer-events: none;
  font-family: inherit;
  font-size: 14px;
  font-weight: 400;
  padding-left: 13px; /* Must align with the standard 12px horizontal padding */
  padding-right: 12px;
  border: 1px solid transparent;
  box-sizing: border-box;
  white-space: pre;
  overflow: hidden;
  line-height: normal;
}

.price-input-suggestion-visible {
  color: transparent !important;
}

.price-input-suggestion-fade {
  color: #9ca3af !important;
  opacity: 0.6;
}

/* Override input font color for suggestion to align perfectly */
html.dark .price-input-suggestion-fade {
  color: #6b7280 !important;
  opacity: 0.8;
}
</style>
