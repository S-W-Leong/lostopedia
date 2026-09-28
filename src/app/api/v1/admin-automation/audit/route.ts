import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getAdminAutomationPausedMessage,
  isAdminAutomationEnabled,
} from '@/lib/adminAutomation/availability'

export async function GET(request: NextRequest) {
  try {
    if (!isAdminAutomationEnabled()) {
      return NextResponse.json(
        { success: false, error: getAdminAutomationPausedMessage() },
        { status: 503 }
      )
    }

    await requireAdmin()
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(Number(searchParams.get('limit') || 50), 100)
    const offset = Number(searchParams.get('offset') || 0)
    const operationId = searchParams.get('operationId')
    const actorFingerprint = searchParams.get('actorFingerprint')

    const adminClient = createAdminClient()
    let query = (adminClient as any)
      .from('admin_automation_audit_events')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (operationId) query = query.eq('operation_id', operationId)
    if (actorFingerprint) query = query.eq('actor_fingerprint', actorFingerprint)

    const { data, count, error } = await query
    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch automation audit events.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      events: data ?? [],
      total: count ?? 0,
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }
}
