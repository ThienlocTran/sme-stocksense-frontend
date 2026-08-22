import { defineStore } from 'pinia'
import { ref } from 'vue'
import { seedDemoHistory, getForecastAvailability } from '../services/forecastService'

export const useForecastStore = defineStore('forecast', () => {
  const jobId = ref(localStorage.getItem('forecast_seed_job_id') || '')
  const jobStatus = ref(localStorage.getItem('forecast_seed_job_status') || 'IDLE') // IDLE, RUNNING, COMPLETED, FAILED
  const jobStartedAt = ref(localStorage.getItem('forecast_seed_job_started_at') || '')
  const jobErrorMessage = ref(localStorage.getItem('forecast_seed_job_error') || '')
  const seededCount = ref(Number(localStorage.getItem('forecast_seeded_count') || 0))
  const rowsCount = ref(Number(localStorage.getItem('forecast_rows_count') || 0))

  let pollInterval = null
  let pollTimeout = null

  function saveState() {
    localStorage.setItem('forecast_seed_job_id', jobId.value)
    localStorage.setItem('forecast_seed_job_status', jobStatus.value)
    localStorage.setItem('forecast_seed_job_started_at', jobStartedAt.value)
    localStorage.setItem('forecast_seed_job_error', jobErrorMessage.value)
    localStorage.setItem('forecast_seeded_count', String(seededCount.value))
    localStorage.setItem('forecast_rows_count', String(rowsCount.value))
  }

  function clearState() {
    jobId.value = ''
    jobStatus.value = 'IDLE'
    jobStartedAt.value = ''
    jobErrorMessage.value = ''
    seededCount.value = 0
    rowsCount.value = 0
    saveState()
    stopPolling()
  }

  function startPolling() {
    stopPolling()

    // Poll getForecastAvailability("SEED_DEMO") every 5 seconds
    pollInterval = setInterval(async () => {
      try {
        const res = await getForecastAvailability('SEED_DEMO')
        if (res.combinations && res.combinations.length > 0) {
          jobStatus.value = 'COMPLETED'
          seededCount.value = res.combinations.length
          rowsCount.value = res.combinations.reduce((sum, c) => sum + (c.historyDays || 0), 0)
          saveState()
          stopPolling()
        }
      } catch (err) {
        console.error('Polling availability failed:', err)
      }
    }, 5000)

    // Timeout after 3 minutes (180 seconds)
    pollTimeout = setTimeout(() => {
      if (jobStatus.value === 'RUNNING') {
        jobStatus.value = 'FAILED'
        jobErrorMessage.value = 'Quá trình sinh dữ liệu đang mất nhiều thời gian hơn dự kiến. Vui lòng chờ và kiểm tra lại.'
        saveState()
        stopPolling()
      }
    }, 180000)
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
    if (pollTimeout) {
      clearTimeout(pollTimeout)
      pollTimeout = null
    }
  }

  async function triggerSeed() {
    if (jobStatus.value === 'RUNNING') return

    jobId.value = 'seed_' + Date.now()
    jobStatus.value = 'RUNNING'
    jobStartedAt.value = new Date().toISOString()
    jobErrorMessage.value = ''
    saveState()
    startPolling()

    try {
      const res = await seedDemoHistory()
      jobStatus.value = 'COMPLETED'
      seededCount.value = res.seriesSeeded || 0
      rowsCount.value = res.rowsInserted || 0
      saveState()
      stopPolling()
      return res
    } catch (err) {
      jobStatus.value = 'FAILED'
      jobErrorMessage.value = err.message || 'Không thể sinh dữ liệu demo.'
      saveState()
      stopPolling()
      throw err
    }
  }

  function initStore() {
    if (jobStatus.value === 'RUNNING') {
      startPolling()
    }
  }

  return {
    jobId,
    jobStatus,
    jobStartedAt,
    jobErrorMessage,
    seededCount,
    rowsCount,
    triggerSeed,
    clearState,
    initStore,
    stopPolling,
  }
})
