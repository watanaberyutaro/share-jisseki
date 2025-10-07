import { createClient as createClientBase } from '@supabase/supabase-js'

// ストレージ操作用のサーバークライアント（service_roleキーを使用）
function createStorageClient() {
  return createClientBase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // service_roleキーを使用
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

const BUCKET_NAME = 'event-photos'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function uploadEventPhotos(eventId: string, photos: File[]) {
  const supabase = createStorageClient()
  const uploadedPhotos: any[] = []
  
  console.log('Starting photo upload for event:', eventId)
  console.log('Number of photos to upload:', photos.length)
  
  try {
    // Supabaseクライアントの基本情報を確認
    console.log('Supabase client initialized')
    
    // バケットの存在確認
    const { data: buckets, error: bucketListError } = await supabase.storage.listBuckets()
    console.log('Available buckets:', buckets?.map(b => b.name))
    
    if (bucketListError) {
      console.error('Error listing buckets:', bucketListError)
      throw new Error(`バケットの取得に失敗しました: ${bucketListError.message}`)
    }
    
    // 目的のバケットが存在するかチェック
    let targetBucket = buckets?.find(b => b.name === BUCKET_NAME)
    if (!targetBucket) {
      console.log(`Bucket '${BUCKET_NAME}' not found. Attempting to create it...`)
      
      // バケットを自動作成
      const { data: newBucket, error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        fileSizeLimit: MAX_FILE_SIZE
      })
      
      if (createError) {
        console.error('Error creating bucket:', createError)
        console.error('Please create the bucket manually in Supabase Dashboard:')
        console.error('1. Go to https://supabase.com/dashboard')
        console.error('2. Navigate to Storage')
        console.error(`3. Create a public bucket named '${BUCKET_NAME}'`)
        throw new Error(`バケット '${BUCKET_NAME}' が存在しません。Supabaseダッシュボードで手動作成してください。\n詳細: ${createError.message}`)
      }
      
      console.log('Bucket created successfully:', newBucket)
      targetBucket = newBucket
    } else {
      console.log('Target bucket found:', targetBucket)
    }
    
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i]
      
      console.log(`Processing photo ${i + 1}:`, {
        name: photo.name,
        size: photo.size,
        type: photo.type
      })
      
      // ファイル検証
      if (photo.size > MAX_FILE_SIZE) {
        throw new Error(`ファイル "${photo.name}" のサイズが大きすぎます（最大10MB）`)
      }
      
      if (!photo.type.startsWith('image/')) {
        throw new Error(`ファイル "${photo.name}" は画像ファイルではありません`)
      }
      
      // ファイル名を生成（重複回避）
      const fileExt = photo.name.split('.').pop()
      const fileName = `${eventId}/${Date.now()}_${i}.${fileExt}`
      
      // Supabase Storageにアップロード
      console.log(`Attempting to upload file: ${fileName} to bucket: ${BUCKET_NAME}`)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, photo, {
          contentType: photo.type,
          cacheControl: '3600',
          upsert: false
        })
      
      if (uploadError) {
        console.error('Upload error details:', {
          error: uploadError,
          fileName,
          bucketName: BUCKET_NAME,
          photoType: photo.type,
          photoSize: photo.size
        })
        throw new Error(`写真のアップロードに失敗しました: ${uploadError.message}`)
      }
      
      console.log('Upload successful:', {
        fileName,
        uploadPath: uploadData.path,
        uploadId: uploadData.id
      })
      
      // データベースに写真情報を保存
      console.log('Saving photo record to database:', {
        event_id: eventId,
        filename: fileName,
        original_name: photo.name,
        file_path: uploadData.path,
        file_size: photo.size,
        mime_type: photo.type,
        upload_order: i
      })
      
      const { data: photoRecord, error: dbError } = await supabase
        .from('event_photos')
        .insert({
          event_id: eventId,
          filename: fileName,
          original_name: photo.name,
          file_path: uploadData.path,
          file_size: photo.size,
          mime_type: photo.type,
          upload_order: i
        })
        .select()
        .single()
      
      if (dbError) {
        console.error('Database error details:', {
          error: dbError,
          eventId,
          fileName,
          uploadPath: uploadData.path
        })
        // アップロードしたファイルを削除（ロールバック）
        await supabase.storage.from(BUCKET_NAME).remove([fileName])
        throw new Error(`写真情報の保存に失敗しました: ${dbError.message}`)
      }
      
      console.log('Photo record saved successfully:', photoRecord)
      
      uploadedPhotos.push(photoRecord)
    }
    
    return { success: true, photos: uploadedPhotos }
    
  } catch (error) {
    console.error('Photo upload failed:', error)
    
    // エラー時に部分的にアップロードされた写真を削除
    for (const photo of uploadedPhotos) {
      try {
        await supabase.storage.from(BUCKET_NAME).remove([photo.file_path])
        await supabase.from('event_photos').delete().eq('id', photo.id)
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError)
      }
    }
    
    throw error
  }
}

// 写真データベース操作は別の場所で処理するため、この関数は削除
// API routeから直接データベースにアクセスします

export async function getPhotoUrl(filePath: string) {
  // サーバー環境でのみストレージクライアントを使用
  let supabase
  if (typeof window === 'undefined') {
    // サーバー側
    supabase = createStorageClient()
  } else {
    // クライアント側 - 通常のクライアントを使用
    const { createClient } = await import('./client')
    supabase = createClient()
  }
  
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)
  
  return data.publicUrl
}