import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, requireAdmin } from '@/lib/supabase/admin'
import { revokeAutomationTokenSchema } from '@/lib/validations/adminAutomationTokens'
import { writeAutomationAuditEvent } from '@/lib/automation/audit'
import {
  getAdminAutomationPausedMessage,
  isAdminAutomationEnabled,
} from '@/lib/adminAutomation/availability'

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (!origin) return true
  return origin === request.nextUrl.origin
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdminAutomationEnabled()) {
      return NextResponse.json(
        { success: false, error: getAdminAutomationPausedMessage() },
        { status: 503 }
      )
    }

    if (!isSameOrigin(request)) {
      return NextResponse.json(
        { success: false, error: 'Cross-origin mutation is not allowed.' },
        { status: 403 }
      )
    }

    const admin = await requireAdmin()
    const tokenId = (await params).id
    const payload = await request.json().catch(() => ({}))
    const parsed = revokeAutomationTokenSchema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid revoke payload.' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const { data: token, error: findError } = await (adminClient as any)
      .from('admin_automation_tokens')
      .select('id, is_active, token_prefix')
      .eq('id', tokenId)
      .single()

    if (findError || !token) {
      return NextResponse.json({ success: false, error: 'Token not found.' }, { status: 404 })
    }

    if (!token.is_active) {
      return NextResponse.json({
        success: true,
        alreadyRevoked: true,
      })
    }

    const { error: updateError } = await (adminClient as any)
      .from('admin_automation_tokens')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', tokenId)

    if (updateError) {
      return NextResponse.json({ success: false, error: 'Failed to revoke token.' }, { status: 500 })
    }

    await writeAutomationAuditEvent({
      requestId: randomUUID(),
      actorFingerprint: `session:${admin.id}`,
      operationId: 'admin.tokens.revoke',
      outcomeStatus: 'success',
      targetRefs: {
        tokenId,
        tokenPrefix: token.token_prefix,
        reason: parsed.data.reason ?? null,
      },
    })

    return NextResponse.json({ success: true, revoked: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
}
