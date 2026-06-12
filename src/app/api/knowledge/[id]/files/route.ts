import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getRequestUser } from '@/lib/get-request-user'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BUCKET_NAME = 'knowledge-files'

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // auth via header
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const supabase = serviceClient()
    const formData = await request.formData()
    const file = formData.get('file') as File
    const purpose = (formData.get('purpose') as string) || 'post_attachment'

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'ファイルが必要です' }, { status: 400 })
    }

    // バケット確認・自動作成
    const { data: buckets } = await supabase.storage.listBuckets()
    if (!buckets?.find((b: any) => b.name === BUCKET_NAME)) {
      await supabase.storage.createBucket(BUCKET_NAME, { public: true, fileSizeLimit: 20 * 1024 * 1024 })
    }

    const ext = file.name.split('.').pop()
    const fileName = `${params.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, { contentType: file.type, upsert: false })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName)

    const { data: fileRecord, error: dbError } = await supabase
      .from('knowledge_files')
      .insert({
        post_id: params.id,
        file_url: publicUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        purpose,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (dbError) {
      await supabase.storage.from(BUCKET_NAME).remove([fileName])
      throw dbError
    }

    return NextResponse.json({ file: fileRecord }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // auth via header
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const supabase = serviceClient()
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')
    if (!fileId) return NextResponse.json({ error: 'fileIdが必要です' }, { status: 400 })

    const { data: fileRecord } = await supabase
      .from('knowledge_files')
      .select('file_url, uploaded_by')
      .eq('id', fileId)
      .single()

    if (!fileRecord) return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 404 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (fileRecord.uploaded_by !== user.id && profile?.role !== 'admin') {
      return NextResponse.json({ error: '削除権限がありません' }, { status: 403 })
    }

    const urlParts = fileRecord.file_url.split(`${BUCKET_NAME}/`)
    if (urlParts.length > 1) {
      await supabase.storage.from(BUCKET_NAME).remove([urlParts[1]])
    }

    await supabase.from('knowledge_files').delete().eq('id', fileId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
