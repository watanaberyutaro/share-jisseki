'use client'

import { useState } from 'react'
import { X, Download, Check } from 'lucide-react'

interface PDFPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  pdfContent: string
  eventName: string
  onDownload: () => Promise<void>
}

export function PDFPreviewModal({
  isOpen,
  onClose,
  pdfContent,
  eventName,
  onDownload
}: PDFPreviewModalProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadComplete, setDownloadComplete] = useState(false)

  if (!isOpen) return null

  const handleDownload = async () => {
    try {
      setIsDownloading(true)
      await onDownload()
      setDownloadComplete(true)

      // 2秒後に完了メッセージを非表示
      setTimeout(() => {
        setDownloadComplete(false)
      }, 2000)
    } catch (error) {
      console.error('Download failed:', error)
      alert('PDFのダウンロードに失敗しました')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 md:p-6 border-b"
          style={{ borderColor: '#22211A' }}
        >
          <div>
            <h2 className="text-xl md:text-2xl font-bold" style={{ color: '#22211A' }}>
              PDFプレビュー
            </h2>
            <p className="text-sm md:text-base mt-1" style={{ color: '#666' }}>
              {eventName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: '#22211A' }}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Preview Content */}
        <div
          className="flex-1 overflow-auto p-4 md:p-6"
          style={{ backgroundColor: '#F5F5F5' }}
        >
          <div
            className="bg-white rounded-lg p-6 md:p-8 mx-auto"
            style={{
              maxWidth: '800px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
            dangerouslySetInnerHTML={{ __html: pdfContent }}
          />
        </div>

        {/* Footer */}
        <div
          className="p-4 md:p-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderColor: '#22211A' }}
        >
          {/* Download Complete Message */}
          {downloadComplete && (
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-lg"
              style={{ backgroundColor: '#4abf79', color: '#FFFFFF' }}
            >
              <Check className="w-5 h-5" />
              <span className="font-medium">ダウンロードが完了しました</span>
            </div>
          )}

          {!downloadComplete && (
            <div className="text-sm" style={{ color: '#666' }}>
              プレビューを確認して、ダウンロードしてください
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border hover:opacity-80 transition-all font-medium"
              style={{ borderColor: '#22211A', color: '#22211A' }}
            >
              閉じる
            </button>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-6 py-2 rounded-lg hover:opacity-90 transition-all font-bold flex items-center gap-2"
              style={{
                backgroundColor: isDownloading ? '#999' : '#FFB300',
                color: '#FFFFFF',
                cursor: isDownloading ? 'not-allowed' : 'pointer'
              }}
            >
              {isDownloading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ダウンロード中...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  ダウンロード
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
