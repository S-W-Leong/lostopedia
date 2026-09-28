import { NextRequest } from 'next/server'
import { handleRemoteMcpRequest } from '../../../../../mcp/lostopedia-admin/remote'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return handleRemoteMcpRequest(request)
}

export async function POST(request: NextRequest) {
  return handleRemoteMcpRequest(request)
}

export async function DELETE(request: NextRequest) {
  return handleRemoteMcpRequest(request)
}
