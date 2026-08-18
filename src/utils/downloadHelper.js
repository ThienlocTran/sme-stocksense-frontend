/**
 * Shared helper for handling binary file downloads and printing.
 */

export function getFilenameFromResponse(response, fallbackFilename) {
  const contentDisposition = response.headers?.['content-disposition'] || response.headers?.['Content-Disposition']
  if (!contentDisposition) return fallbackFilename

  // Match filename*=UTF-8''filename.ext or filename="filename.ext" or filename=filename.ext
  const filenameStarMatch = contentDisposition.match(/filename\*=(?:UTF-8'')?([^;'"\n]+)/i)
  if (filenameStarMatch && filenameStarMatch[1]) {
    try {
      return decodeURIComponent(filenameStarMatch[1])
    } catch (e) {
      console.warn('Failed to decode filename*', e)
    }
  }

  const filenameMatch = contentDisposition.match(/filename\s*=\s*["']?([^"';\n]+)["']?/i)
  if (filenameMatch && filenameMatch[1]) {
    return filenameMatch[1]
  }

  return fallbackFilename
}

export function downloadBlobResponse(response, fallbackFilename) {
  const blob = response.data
  const filename = getFilenameFromResponse(response, fallbackFilename)
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export function setPrintWindowBlob(printWindow, response) {
  const blob = new Blob([response.data], { type: 'application/pdf' })
  const blobUrl = window.URL.createObjectURL(blob)
  
  if (printWindow) {
    printWindow.location.href = blobUrl
    // Safely cleanup after the print window has had time to load the PDF
    setTimeout(() => {
      try {
        window.URL.revokeObjectURL(blobUrl)
      } catch (e) {
        console.warn('Error revoking print blob URL', e)
      }
    }, 60000)
  }
}
