import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, requireAdmin } from '@/lib/supabase/admin'
import {
  composePresentedAutomationToken,
  createAutomationTokenPrefix,
  createAutomationTokenSecret,
  hashAutomationTokenSecret,
} from '@/lib/auth/adminAutomation'
import { createAutomationTokenSchema } from '@/lib/validations/adminAutomationTokens'
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
    const limit = Number(searchParams.get('limit') || '50')
    const offset = Number(searchParams.get('offset') || '0')

    const adminClient = createAdminClient()
    const { data, error, count } = await (adminClient as any)
      .from('admin_automation_tokens')
      .select(
        'id, token_name, service_account_name, token_prefix, scopes, is_active, created_by, last_used_at, expires_at, created_at, updated_at',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch automation tokens.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      tokens: data ?? [],
      total: count ?? 0,
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
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
    const payload = await request.json().catch(() => ({}))
    const parsed = createAutomationTokenSchema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid token creation payload.' },
        { status: 400 }
      )
    }

    const tokenId = randomUUID()
    const rawSecret = createAutomationTokenSecret()
    const tokenPrefix = createAutomationTokenPrefix()
    const tokenHash = hashAutomationTokenSecret(rawSecret)
    const requestId = randomUUID()
    const adminClient = createAdminClient()

    const { error } = await (adminClient as any).from('admin_automation_tokens').insert({
      id: tokenId,
      token_name: parsed.data.tokenName,
      service_account_name: parsed.data.serviceAccountName,
      token_prefix: tokenPrefix,
      token_hash: tokenHash,
      scopes: parsed.data.scopes,
      expires_at: parsed.data.expiresAt ?? null,
      created_by: admin.id,
      is_active: true,
    })

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to create automation token.' },
        { status: 500 }
      )
    }

    await writeAutomationAuditEvent({
      requestId,
      actorFingerprint: `session:${admin.id}`,
      operationId: 'admin.tokens.create',
      outcomeStatus: 'success',
      targetRefs: {
        tokenId,
        tokenPrefix,
        scopes: parsed.data.scopes,
      },
    })

    return NextResponse.json({
      success: true,
      token: {
        id: tokenId,
        tokenName: parsed.data.tokenName,
        serviceAccountName: parsed.data.serviceAccountName,
        tokenPrefix,
        scopes: parsed.data.scopes,
        expiresAt: parsed.data.expiresAt ?? null,
      },
      presentedToken: composePresentedAutomationToken(tokenId, rawSecret),
      warning: 'Store this token securely. It will not be shown again.',
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
}
