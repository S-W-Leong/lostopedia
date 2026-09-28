import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import {
  getAdminAutomationPausedMessage,
  isAdminAutomationEnabled,
} from '@/lib/adminAutomation/availability'
import { createAdminMcpServer, resolveBearerTokenFromExtra } from './stdio'

export interface RemoteRuntimeConfig {
  baseUrl: string
}

export interface RemoteAccessResult {
  ok: boolean
  status: number
  code?: string
  detail?: string
  bearerToken?: string
}

function parseBearerToken(headerValue: string | null): string | undefined {
  if (!headerValue) {
    return undefined
  }

  const [scheme, ...rest] = headerValue.trim().split(/\s+/)
  if (!scheme || scheme.toLowerCase() !== 'bearer') {
    return undefined
  }

  const token = rest.join(' ').trim()
  return token.length > 0 ? token : undefined
}

function hasValidPatFormat(token: string): boolean {
  const separatorIndex = token.indexOf('.')
  if (separatorIndex <= 0 || separatorIndex === token.length - 1) {
    return false
  }

  const tokenId = token.slice(0, separatorIndex).trim()
  const secret = token.slice(separatorIndex + 1).trim()
  return tokenId.length > 0 && secret.length > 0
}

export function resolveRemoteRuntimeConfig(
  requestUrl: string,
  env: Record<string, string | undefined> = process.env
): RemoteRuntimeConfig {
  const baseUrl = env.LOSTOPEDIA_BASE_URL?.trim() || new URL(requestUrl).origin

  return {
    baseUrl,
  }
}

export function validateRemoteAccess(headers: Headers): RemoteAccessResult {
  const bearerToken = parseBearerToken(headers.get('authorization'))
  if (!bearerToken) {
    return {
      ok: false,
      status: 401,
      code: 'missing_bearer_token',
      detail: 'Authorization header with Bearer token is required.',
    }
  }
  if (!hasValidPatFormat(bearerToken)) {
    return {
      ok: false,
      status: 401,
      code: 'invalid_bearer_token_format',
      detail: 'Bearer token must follow token-id.secret format.',
    }
  }

  return {
    ok: true,
    status: 200,
    bearerToken,
  }
}

function asErrorResponse(status: number, code: string, detail: string): Response {
  return Response.json(
    {
      success: false,
      error: { code, detail },
    },
    { status }
  )
}

export async function handleRemoteMcpRequest(
  request: Request,
  env: Record<string, string | undefined> = process.env
): Promise<Response> {
  if (!isAdminAutomationEnabled(env)) {
    return asErrorResponse(
      503,
      'feature_unavailable',
      getAdminAutomationPausedMessage()
    )
  }

  const runtimeConfig = resolveRemoteRuntimeConfig(request.url, env)

  const access = validateRemoteAccess(request.headers)
  if (!access.ok) {
    return asErrorResponse(access.status, access.code || 'unauthorized', access.detail || 'Unauthorized')
  }

  const server = createAdminMcpServer({
    baseUrl: runtimeConfig.baseUrl,
    tokenResolver: resolveBearerTokenFromExtra,
  })
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })

  try {
    await server.connect(transport)
    return await transport.handleRequest(request, {
      authInfo: {
        token: access.bearerToken || '',
        clientId: 'lostopedia-remote-mcp',
        scopes: [],
      },
    })
  } catch {
    return asErrorResponse(
      500,
      'remote_mcp_internal_error',
      'Remote MCP request failed unexpectedly.'
    )
  } finally {
    await server.close().catch(() => undefined)
  }
}
