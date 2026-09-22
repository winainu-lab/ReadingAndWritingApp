import { describe, expect, it } from 'vitest'
import { extractGoogleDriveFileId, getGoogleDriveDirectThumbnailUrl, getGoogleDriveThumbnailFallbackUrl, getGoogleDriveThumbnailUrl, resolveResourceThumbnail } from './googleDrive'

describe('Google Drive resource helpers', () => {
  it('extracts file ids from common public links', () => {
    expect(extractGoogleDriveFileId('https://drive.google.com/file/d/file_123-abc/view?usp=sharing')).toBe('file_123-abc')
    expect(extractGoogleDriveFileId('https://drive.google.com/open?id=document_456')).toBe('document_456')
    expect(extractGoogleDriveFileId('https://docs.google.com/document/d/doc_789/edit')).toBe('doc_789')
  })

  it('creates a sharp thumbnail and prefers a manually supplied cover', () => {
    expect(getGoogleDriveThumbnailUrl('https://drive.google.com/file/d/file_123/view')).toBe('https://drive.google.com/thumbnail?id=file_123&sz=w1000&v=3')
    expect(getGoogleDriveThumbnailFallbackUrl('https://drive.google.com/file/d/file_123/view', 123)).toBe('https://drive.google.com/thumbnail?id=file_123&sz=w1000&retry=123')
    expect(getGoogleDriveDirectThumbnailUrl('https://drive.google.com/file/d/file_123/view')).toBe('https://lh3.googleusercontent.com/d/file_123=w1000')
    expect(resolveResourceThumbnail('https://drive.google.com/file/d/file_123/view', 'https://example.com/cover.jpg')).toBe('https://example.com/cover.jpg')
  })

  it('upgrades a previously generated Drive thumbnail to the direct image URL', () => {
    expect(resolveResourceThumbnail(
      'https://drive.google.com/file/d/file_123/view',
      'https://drive.google.com/thumbnail?id=file_123&sz=w1000',
    )).toBe('https://drive.google.com/thumbnail?id=file_123&sz=w1000&v=3')
  })

  it('uses the local A4 placeholder when the link is unsupported', () => {
    expect(resolveResourceThumbnail('https://example.com/document')).toBe('/document-placeholder.svg')
  })
})
