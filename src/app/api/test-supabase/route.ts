import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    console.log('Testing Supabase connection...')
    
    // 接続テスト - eventsテーブルの存在確認
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('count(*)')
      .limit(1)
    
    if (eventsError) {
      console.error('Events table error:', eventsError)
      return NextResponse.json({
        success: false,
        error: 'Events table not accessible',
        details: eventsError
      }, { status: 500 })
    }
    
    // performancesテーブルの存在確認
    const { data: performances, error: performancesError } = await supabase
      .from('performances')
      .select('count(*)')
      .limit(1)
    
    if (performancesError) {
      console.error('Performances table error:', performancesError)
      return NextResponse.json({
        success: false,
        error: 'Performances table not accessible',
        details: performancesError
      }, { status: 500 })
    }
    
    // 簡単なテストデータの挿入を試行
    const testEventData = {
      name: 'テストイベント',
      date: new Date().toISOString(),
      venue: 'テスト会場',
      team: 'テストチーム'
    }
    
    const { data: testEvent, error: insertError } = await supabase
      .from('events')
      .insert(testEventData)
      .select()
      .single()
    
    if (insertError) {
      console.error('Insert test error:', insertError)
      return NextResponse.json({
        success: false,
        error: 'Cannot insert test data',
        details: insertError
      }, { status: 500 })
    }
    
    // テストデータを削除
    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .eq('id', testEvent.id)
    
    if (deleteError) {
      console.warn('Could not delete test data:', deleteError)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Supabase connection and tables working correctly',
      eventsTable: 'OK',
      performancesTable: 'OK',
      insertTest: 'OK'
    })
    
  } catch (error) {
    console.error('Supabase test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}