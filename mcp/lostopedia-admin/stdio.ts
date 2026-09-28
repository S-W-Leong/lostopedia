import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { listMcpTools, invokeContractedOperation, type InvokeOptions } from './server'
import { getOperationInputSchema } from '@/lib/contracts/admin/v1/operations'

export interface RuntimeConfig {
  baseUrl: string
  bearerToken?: string
  tokenResolver?: (extra: unknown) => string | undefined
}

const SERVER_INFO = {
  name: 'lostopedia-admin-mcp',
  version: '1.0.0',
} as const

interface ToolRequestExtra {
  authInfo?: {
    token?: string
  }
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}

export function resolveBearerTokenFromExtra(extra: unknown): string | undefined {
  if (!extra || typeof extra !== 'object') {
    return undefined
  }

  const authInfo = (extra as ToolRequestExtra).authInfo
  return typeof authInfo?.token === 'string' && authInfo.token.length > 0
    ? authInfo.token
    : undefined
}

export function resolveRuntimeConfig(
  env: Record<string, string | undefined> = process.env
): RuntimeConfig {
  const baseUrl = env.LOSTOPEDIA_BASE_URL?.trim()
  const bearerToken = env.LOSTOPEDIA_ADMIN_PAT?.trim()

  if (!baseUrl) {
    throw new Error('LOSTOPEDIA_BASE_URL is required.')
  }
  if (!bearerToken) {
    throw new Error('LOSTOPEDIA_ADMIN_PAT is required.')
  }

  return { baseUrl, bearerToken }
}

export function createAdminMcpServer(runtimeConfig: RuntimeConfig) {
  const server = new McpServer(SERVER_INFO)
  const tools = listMcpTools()

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        title: tool.name,
        description: tool.description,
        inputSchema: getOperationInputSchema(tool.operationId),
      },
      async (args: unknown, extra: unknown) => {
        const normalizedArgs = asObject(args)
        const bearerToken =
          runtimeConfig.tokenResolver?.(extra) ??
          resolveBearerTokenFromExtra(extra) ??
          runtimeConfig.bearerToken

        if (!bearerToken) {
          const payload = {
            success: false,
            error: {
              code: 'missing_bearer_token',
              detail: 'Bearer token is required for admin automation operations.',
            },
          }

          return {
            content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
            structuredContent: payload,
            isError: true,
          }
        }

        const invocationOptions: InvokeOptions = {
          baseUrl: runtimeConfig.baseUrl,
          bearerToken,
          idempotencyKey:
            typeof normalizedArgs._idempotencyKey === 'string'
              ? normalizedArgs._idempotencyKey
              : undefined,
          confirmToken:
            typeof normalizedArgs._confirmToken === 'string'
              ? normalizedArgs._confirmToken
              : undefined,
          dryRun: normalizedArgs._dryRun === true,
        }

        delete normalizedArgs._idempotencyKey
        delete normalizedArgs._confirmToken
        delete normalizedArgs._dryRun

        const result = await invokeContractedOperation(
          tool.operationId,
          normalizedArgs,
          invocationOptions
        )

        const text = JSON.stringify(result.payload, null, 2)
        const structuredContent =
          result.payload && typeof result.payload === 'object' && !Array.isArray(result.payload)
            ? (result.payload as Record<string, unknown>)
            : undefined

        return {
          content: [{ type: 'text' as const, text }],
          structuredContent,
          isError: !result.ok,
        }
      }
    )
  }

  return server
}

export async function startStdioServer() {
  const config = resolveRuntimeConfig()
  const server = createAdminMcpServer(config)
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startStdioServer().catch((error) => {
    const message = error instanceof Error ? error.message : 'Unknown MCP startup failure'
    process.stderr.write(`[lostopedia-admin-mcp] ${message}\n`)
    process.exit(1)
  })
}

