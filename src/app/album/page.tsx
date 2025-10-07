'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { Camera, Upload, Calendar, Grid3X3, List, Download, Search, Filter, X, ChevronDown, Heart } from 'lucide-react'
import { MagneticDots } from '@/components/MagneticDots'

interface ImageData {
  id: string
  filename: string
  originalName: string
  uploadDate: string
  eventDate: string
  url: string
  size: number
  type: string
  venue: string
  agencyName: string
  year: number
  month: number
  weekNumber: number
  performanceId: string
  isFavorite?: boolean
}

export default function Album() {
  const [images, setImages] = useState<ImageData[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedWeek, setSelectedWeek] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  // 実績データから画像を取得
  useEffect(() => {
    const fetchImagesFromPerformances = async () => {
      try {
        // まず基本的な実績データを取得
        const performanceResponse = await fetch('/api/performances/enhanced-v2')
        const allImages: ImageData[] = []

        if (performanceResponse.ok) {
          const performanceData = await performanceResponse.json()

          // 各イベントの詳細APIから画像を並列取得
          const detailPromises = performanceData.map(async (performance: any) => {
            try {
              const detailResponse = await fetch(`/api/events/${performance.id}/detail`)
              if (detailResponse.ok) {
                const eventDetail = await detailResponse.json()

                // 詳細ページの photos フィールドから画像を取得
                if (eventDetail.photos && eventDetail.photos.length > 0) {
                  return eventDetail.photos.map((photo: any, index: number) => ({
                    id: `${performance.id}_${photo.id}_${index}`,
                    filename: photo.file_name || `event_${performance.year}_${performance.month}_${performance.week_number}_${index + 1}.jpg`,
                    originalName: photo.description || photo.file_name || `イベント写真${index + 1}.jpg`,
                    uploadDate: photo.created_at || performance.start_date,
                    eventDate: performance.start_date,
                    url: photo.file_url,
                    size: 2048000,
                    type: 'image/jpeg',
                    venue: performance.venue,
                    agencyName: performance.agency_name,
                    year: performance.year,
                    month: performance.month,
                    weekNumber: performance.week_number,
                    performanceId: performance.id
                  }))
                }
              }
              return []
            } catch (detailError) {
              console.log(`詳細データの取得に失敗: ${performance.id}`)
              return []
            }
          })

          const detailResults = await Promise.all(detailPromises)
          detailResults.forEach(imageArray => {
            allImages.push(...imageArray)
          })
        }


        setImages(allImages)
      } catch (error) {
        console.error('画像データの取得に失敗しました:', error)
      }
    }

    fetchImagesFromPerformances()
  }, [])

  // お気に入り機能の初期化（ローカルストレージから読み込み）
  useEffect(() => {
    const savedFavorites = localStorage.getItem('albumFavorites')
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)))
    }
  }, [])

  // お気に入り切り替え機能
  const toggleFavorite = (imageId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev)
      if (newFavorites.has(imageId)) {
        newFavorites.delete(imageId)
      } else {
        newFavorites.add(imageId)
      }
      localStorage.setItem('albumFavorites', JSON.stringify(Array.from(newFavorites)))
      return newFavorites
    })
  }

  // フィルタリング機能（メモ化）
  const filteredImages = useMemo(() => {
    let filtered = images

    if (selectedYear) {
      filtered = filtered.filter(img => img.year === parseInt(selectedYear))
    }

    if (selectedMonth) {
      filtered = filtered.filter(img => img.month === parseInt(selectedMonth))
    }

    if (selectedWeek) {
      filtered = filtered.filter(img => img.weekNumber === parseInt(selectedWeek))
    }

    if (searchTerm) {
      filtered = filtered.filter(img =>
        img.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        img.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        img.venue.toLowerCase().includes(searchTerm.toLowerCase()) ||
        img.agencyName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // お気に入りのみ表示フィルター
    if (showFavoritesOnly) {
      filtered = filtered.filter(img => favorites.has(img.id))
    }

    return filtered
  }, [images, selectedYear, selectedMonth, selectedWeek, searchTerm, showFavoritesOnly, favorites])

  // 年・月・週でグループ化（メモ化）
  const groupedImages = useMemo(() => {
    return filteredImages.reduce((acc, img) => {
      const key = `${img.year}年${img.month}月第${img.weekNumber}週`
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(img)
      return acc
    }, {} as Record<string, ImageData[]>)
  }, [filteredImages])

  // 利用可能な年・月・週の選択肢を生成（メモ化）
  const availableYears = useMemo(() =>
    [...new Set(images.map(img => img.year))].sort((a, b) => b - a)
  , [images])

  const availableMonths = useMemo(() =>
    selectedYear
      ? [...new Set(images.filter(img => img.year === parseInt(selectedYear)).map(img => img.month))].sort()
      : [...new Set(images.map(img => img.month))].sort()
  , [images, selectedYear])

  const availableWeeks = useMemo(() =>
    selectedYear && selectedMonth
      ? [...new Set(images.filter(img => img.year === parseInt(selectedYear) && img.month === parseInt(selectedMonth)).map(img => img.weekNumber))].sort()
      : [...new Set(images.map(img => img.weekNumber))].sort()
  , [images, selectedYear, selectedMonth])

  const handleFileUpload = async (files: FileList) => {
    setIsUploading(true)

    // ここで実際のアップロード処理を行う
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.type.startsWith('image/')) {
        // 実際の実装では、ここでサーバーにアップロードする
        const newImage: ImageData = {
          id: Date.now().toString() + i,
          filename: `upload_${Date.now()}_${i}.${file.name.split('.').pop()}`,
          originalName: file.name,
          uploadDate: new Date().toISOString().split('T')[0],
          eventDate: new Date().toISOString().split('T')[0],
          url: URL.createObjectURL(file),
          size: file.size,
          type: file.type,
          venue: '',
          agencyName: '',
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
          weekNumber: 1,
          performanceId: ''
        }

        setImages(prev => [...prev, newImage])
      }
    }

    setIsUploading(false)
    setShowUploadModal(false)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  }


  return (
    <div className="min-h-screen" style={{ paddingTop: '5rem' }}>
      <MagneticDots />
      <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-8 py-2 md:py-6 pb-20 md:pb-6">
        {/* ヘッダー */}
        <div className="glass rounded-lg border p-3 md:p-6 mb-3 md:mb-6" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-6 gap-2">
            <div className="flex items-center">
              <Camera className="w-6 md:w-8 h-6 md:h-8 mr-2 md:mr-3" style={{ color: '#22211A' }} />
              <h1 className="text-xl md:text-3xl font-bold" style={{ color: '#22211A' }}>
                イベントアルバム
              </h1>
            </div>
            <div className="text-xs md:text-sm" style={{ color: '#22211A', opacity: 0.7 }}>
              ※画像は実績入力フォームからアップロードできます
            </div>
          </div>

          {/* フィルターとビューコントロール */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* 検索とフィルターのグループ */}
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              {/* 検索 */}
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#22211A' }} />
                <input
                  type="text"
                  placeholder="画像を検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                  style={{ borderColor: '#22211A', color: '#22211A' }}
                />
              </div>

              {/* フィルターグループ */}
              <div className="flex flex-wrap gap-2">
                {/* 年フィルター */}
                <div className="relative">
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      setSelectedYear(e.target.value)
                      setSelectedMonth('')
                      setSelectedWeek('')
                    }}
                    className="px-3 py-2 border rounded-lg pr-8 appearance-none text-sm min-w-[100px]"
                    style={{ borderColor: '#22211A', color: '#22211A' }}
                  >
                    <option value="">全ての年</option>
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}年</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#22211A' }} />
                </div>

                {/* 月フィルター */}
                <div className="relative">
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value)
                      setSelectedWeek('')
                    }}
                    className="px-3 py-2 border rounded-lg pr-8 appearance-none text-sm min-w-[90px]"
                    style={{ borderColor: '#22211A', color: '#22211A' }}
                    disabled={!selectedYear}
                  >
                    <option value="">全ての月</option>
                    {availableMonths.map(month => (
                      <option key={month} value={month}>{month}月</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#22211A' }} />
                </div>

                {/* 週フィルター */}
                <div className="relative">
                  <select
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(e.target.value)}
                    className="px-3 py-2 border rounded-lg pr-8 appearance-none text-sm min-w-[90px]"
                    style={{ borderColor: '#22211A', color: '#22211A' }}
                    disabled={!selectedMonth}
                  >
                    <option value="">全ての週</option>
                    {availableWeeks.map(week => (
                      <option key={week} value={week}>第{week}週</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#22211A' }} />
                </div>
              </div>
            </div>

            {/* フィルタークリア */}
            {(selectedYear || selectedMonth || selectedWeek || searchTerm || showFavoritesOnly) && (
              <button
                onClick={() => {
                  setSelectedYear('')
                  setSelectedMonth('')
                  setSelectedWeek('')
                  setSearchTerm('')
                  setShowFavoritesOnly(false)
                }}
                className="flex items-center px-3 py-2 border rounded-lg hover:bg-gray-50"
                style={{ borderColor: '#22211A', color: '#22211A' }}
              >
                <X className="w-4 h-4 mr-1" />
                クリア
              </button>
            )}

            {/* お気に入りフィルター */}
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`p-2 border rounded-lg transition-colors ${
                showFavoritesOnly
                  ? 'bg-red-50 hover:bg-red-100 border-red-200'
                  : 'hover:bg-gray-50'
              }`}
              style={{
                borderColor: showFavoritesOnly ? '#fca5a5' : '#22211A',
                color: showFavoritesOnly ? '#dc2626' : '#22211A'
              }}
              title={showFavoritesOnly ? 'すべて表示' : 'お気に入りのみ表示'}
            >
              <Heart className={`w-5 h-5 ${showFavoritesOnly ? 'fill-current' : ''}`} />
            </button>

            {/* ビューモード切り替え */}
            <div className="flex ml-auto">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 border-l border-t border-b rounded-l-lg ${viewMode === 'grid' ? 'bg-blue-100' : 'bg-white hover:bg-gray-50'}`}
                style={{ borderColor: '#22211A' }}
              >
                <Grid3X3 className="w-5 h-5" style={{ color: '#22211A' }} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 border-r border-t border-b rounded-r-lg ${viewMode === 'list' ? 'bg-blue-100' : 'bg-white hover:bg-gray-50'}`}
                style={{ borderColor: '#22211A' }}
              >
                <List className="w-5 h-5" style={{ color: '#22211A' }} />
              </button>
            </div>
          </div>
        </div>

        {/* 画像表示エリア */}
        <div className="space-y-8">
          {Object.entries(groupedImages).length === 0 ? (
            <div className="glass rounded-lg border p-12 text-center" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
              <Camera className="w-16 h-16 mx-auto mb-4" style={{ color: '#22211A', opacity: 0.5 }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#22211A' }}>画像がありません</h3>
              <p style={{ color: '#22211A', opacity: 0.7 }}>
                イベントの写真をアップロードして、思い出を保存しましょう。
              </p>
            </div>
          ) : (
            Object.entries(groupedImages)
              .sort(([a], [b]) => {
                const aImg = groupedImages[a][0]
                const bImg = groupedImages[b][0]
                if (aImg.year !== bImg.year) return bImg.year - aImg.year
                if (aImg.month !== bImg.month) return bImg.month - aImg.month
                return bImg.weekNumber - aImg.weekNumber
              })
              .map(([date, dateImages]) => (
                <div key={date} className="glass rounded-lg border p-6" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold" style={{ color: '#22211A' }}>
                        {date}
                      </h2>
                      {dateImages.length > 0 && (
                        <p className="text-sm" style={{ color: '#22211A', opacity: 0.7 }}>
                          会場: {dateImages[0].venue} / 代理店: {dateImages[0].agencyName}
                        </p>
                      )}
                    </div>
                    <span className="text-sm" style={{ color: '#22211A', opacity: 0.7 }}>
                      {dateImages.length}枚の画像
                    </span>
                  </div>

                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {dateImages.map((image) => (
                        <div key={image.id} className="relative group">
                          <div
                            className="aspect-square bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setSelectedImage(image)}
                          >
                            <img
                              src={image.url}
                              alt={image.originalName}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center pointer-events-none">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2 pointer-events-auto">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleFavorite(image.id)
                                }}
                                className={`p-2 rounded-full transition-colors ${
                                  favorites.has(image.id)
                                    ? 'bg-red-500 hover:bg-red-600'
                                    : 'bg-white hover:bg-gray-100'
                                }`}
                                title={favorites.has(image.id) ? 'お気に入りから削除' : 'お気に入りに追加'}
                              >
                                <Heart className={`w-4 h-4 ${
                                  favorites.has(image.id) ? 'text-white fill-current' : ''
                                }`} style={{ color: favorites.has(image.id) ? 'white' : '#22211A' }} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.open(image.url, '_blank')
                                }}
                                className="p-2 bg-white rounded-full hover:bg-gray-100"
                                title="ダウンロード"
                              >
                                <Download className="w-4 h-4" style={{ color: '#22211A' }} />
                              </button>
                            </div>
                          </div>
                          {/* お気に入りバッジ */}
                          {favorites.has(image.id) && (
                            <div className="absolute top-2 right-2">
                              <Heart className="w-5 h-5 text-red-500 fill-current bg-white rounded-full p-1" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dateImages.map((image) => (
                        <div key={image.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                          <div
                            className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden mr-4 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setSelectedImage(image)}
                          >
                            <img
                              src={image.url}
                              alt={image.originalName}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="flex-1 flex items-center">
                            <div className="flex-1">
                              <p className="text-sm" style={{ color: '#22211A', opacity: 0.6 }}>
                                会場: {image.venue} | 代理店: {image.agencyName}
                              </p>
                            </div>
                            {favorites.has(image.id) && (
                              <Heart className="w-4 h-4 text-red-500 fill-current mr-2" />
                            )}
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleFavorite(image.id)
                              }}
                              className={`p-2 rounded-lg transition-colors ${
                                favorites.has(image.id)
                                  ? 'bg-red-100 hover:bg-red-200'
                                  : 'hover:bg-gray-200'
                              }`}
                              title={favorites.has(image.id) ? 'お気に入りから削除' : 'お気に入りに追加'}
                            >
                              <Heart className={`w-4 h-4 ${
                                favorites.has(image.id) ? 'text-red-500 fill-current' : ''
                              }`} style={{ color: favorites.has(image.id) ? '#ef4444' : '#22211A' }} />
                            </button>
                            <button
                              onClick={() => window.open(image.url, '_blank')}
                              className="p-2 hover:bg-gray-200 rounded-lg"
                              title="ダウンロード"
                            >
                              <Download className="w-4 h-4" style={{ color: '#22211A' }} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
          )}
        </div>
      </div>

      {/* 画像拡大表示モーダル */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-7xl max-h-[90vh] w-full h-full flex flex-col">
            {/* モーダルヘッダー */}
            <div className="flex items-center justify-between mb-4 text-white">
              <div className="flex-1">
                <p className="text-sm opacity-75">
                  {selectedImage.venue} / {selectedImage.agencyName} / {selectedImage.year}年{selectedImage.month}月第{selectedImage.weekNumber}週
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(selectedImage.id)
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    favorites.has(selectedImage.id)
                      ? 'bg-red-500 bg-opacity-80 hover:bg-opacity-100'
                      : 'bg-white bg-opacity-20 hover:bg-opacity-30'
                  }`}
                  title={favorites.has(selectedImage.id) ? 'お気に入りから削除' : 'お気に入りに追加'}
                >
                  <Heart className={`w-5 h-5 ${
                    favorites.has(selectedImage.id) ? 'text-white fill-current' : 'text-white'
                  }`} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    window.open(selectedImage.url, '_blank')
                  }}
                  className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
                  title="新しいタブで開く"
                >
                  <Download className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors text-white text-xl font-bold"
                  title="閉じる"
                >
                  ×
                </button>
              </div>
            </div>

            {/* 画像表示エリア */}
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              <img
                src={selectedImage.url}
                alt={selectedImage.originalName}
                className="max-w-full max-h-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* モーダルフッター */}
            <div className="mt-4 text-center">
              <p className="text-white text-sm opacity-75">
                ファイル名: {selectedImage.filename} | サイズ: {formatFileSize(selectedImage.size)}
              </p>
              <p className="text-white text-xs opacity-50 mt-1">
                クリックまたはESCキーで閉じる
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}