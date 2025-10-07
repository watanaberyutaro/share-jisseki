import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('id_calculation_data')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching ID calculation data:', error)
      return NextResponse.json(
        { error: 'Failed to fetch ID calculation data' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}