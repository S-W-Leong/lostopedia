import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/auth/api-auth'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, response: authResponse } = await requireApiUser()
    if (authResponse) return authResponse
    const { id } = await params
    const { data, error } = await supabase.from('items')
      .select('description, image_url, location_text, created_at')
      .eq('id', id)
      .single()
    if (error || !data) {
      const status = error?.code === 'PGRST116' || !error ? 404 : 500
      return NextResponse.json({ success: false, error: status === 404 ? 'Item not found' : 'Unable to load item details' }, { status })
    }
    return NextResponse.json({ success: true, item: {
      description: data.description, imageUrl: data.image_url,
      locationText: data.location_text, createdAt: data.created_at,
    } }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ success: false, error: 'Unable to load item details' }, { status: 500 })
  }
}
