export function extractGoogleDriveFileId(url: string) {
  const value = url.trim()
  const pathMatch = value.match(/\/(?:file|document|presentation|spreadsheets)\/d\/([a-zA-Z0-9_-]+)/)
  if (pathMatch?.[1]) return pathMatch[1]

  try {
    const parsed = new URL(value)
    return parsed.searchParams.get('id')
  } catch {
    return null
  }
}

export function getGoogleDriveThumbnailUrl(url: string) {
  const fileId = extractGoogleDriveFileId(url)
  return fileId ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1000&v=3` : null
}

export function getGoogleDriveThumbnailFallbackUrl(url: string, cacheBust = Date.now()) {
  const fileId = extractGoogleDriveFileId(url)
  return fileId ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1000&retry=${cacheBust}` : null
}

export function getGoogleDriveDirectThumbnailUrl(url: string) {
  const fileId = extractGoogleDriveFileId(url)
  return fileId ? `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}=w1000` : null
}

function isGeneratedGoogleDriveThumbnail(url: string) {
  try {
    const parsed = new URL(url)
    return (parsed.hostname === 'drive.google.com' && parsed.pathname === '/thumbnail')
      || (parsed.hostname === 'lh3.googleusercontent.com' && parsed.pathname.startsWith('/d/'))
  } catch {
    return false
  }
}

export function resolveResourceThumbnail(googleDriveUrl: string, thumbnailUrl?: string | null) {
  const customThumbnail = thumbnailUrl?.trim()
  if (customThumbnail && !isGeneratedGoogleDriveThumbnail(customThumbnail)) return customThumbnail
  return getGoogleDriveThumbnailUrl(googleDriveUrl) || '/document-placeholder.svg'
}

export function applyResourceThumbnailFallback(image: HTMLImageElement, googleDriveUrl: string) {
  const attempt = image.dataset.thumbnailFallback
  const fallbackUrl = getGoogleDriveThumbnailFallbackUrl(googleDriveUrl)
  const directUrl = getGoogleDriveDirectThumbnailUrl(googleDriveUrl)

  if (!attempt && fallbackUrl) {
    image.dataset.thumbnailFallback = 'retry'
    image.src = fallbackUrl
    return
  }

  if (attempt === 'retry' && directUrl) {
    image.dataset.thumbnailFallback = 'direct'
    image.src = directUrl
    return
  }

  if (attempt !== 'placeholder') {
    image.dataset.thumbnailFallback = 'placeholder'
    image.src = '/document-placeholder.svg'
  }
}
