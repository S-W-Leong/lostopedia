import type { AdminOperationId, AdminScope } from './schemas'
import { operationInputSchemas } from './schemas'

export interface AdminOperationDefinition {
  id: AdminOperationId
  title: string
  description: string
  destructive: boolean
  requiredScopes: AdminScope[]
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  route: string
}

export const adminOperationsV1: Record<AdminOperationId, AdminOperationDefinition> = {
  'admin.items.list': {
    id: 'admin.items.list',
    title: 'List moderated items',
    description: 'List items with moderation filters and pagination.',
    destructive: false,
    requiredScopes: ['read'],
    method: 'GET',
    route: '/api/admin/items',
  },
  'admin.items.bulk-update': {
    id: 'admin.items.bulk-update',
    title: 'Bulk update item status',
    description: 'Perform bulk remove or restore operations on items.',
    destructive: true,
    requiredScopes: ['mutate', 'destructive'],
    method: 'PATCH',
    route: '/api/admin/items',
  },
  'admin.items.post-draft': {
    id: 'admin.items.post-draft',
    title: 'Generate posting drafts',
    description: 'Normalize structured or AI-assisted inputs into reviewable item drafts.',
    destructive: false,
    requiredScopes: ['mutate'],
    method: 'POST',
    route: '/api/admin/items',
  },
  'admin.items.post-confirm': {
    id: 'admin.items.post-confirm',
    title: 'Confirm posting drafts',
    description: 'Create items from reviewed posting drafts with actor attribution.',
    destructive: false,
    requiredScopes: ['mutate'],
    method: 'POST',
    route: '/api/admin/items',
  },
  'admin.users.list': {
    id: 'admin.users.list',
    title: 'List users',
    description: 'List users with filters and pagination.',
    destructive: false,
    requiredScopes: ['read'],
    method: 'GET',
    route: '/api/admin/users',
  },
  'admin.users.update-status': {
    id: 'admin.users.update-status',
    title: 'Update user status',
    description: 'Ban or unban a user with moderation reason tracking.',
    destructive: false,
    requiredScopes: ['mutate'],
    method: 'PATCH',
    route: '/api/admin/users/[id]',
  },
  'admin.users.delete': {
    id: 'admin.users.delete',
    title: 'Delete user permanently',
    description: 'Permanently delete a user with explicit confirmation semantics.',
    destructive: true,
    requiredScopes: ['mutate', 'destructive'],
    method: 'DELETE',
    route: '/api/admin/users/[id]',
  },
  'admin.reputation.adjust': {
    id: 'admin.reputation.adjust',
    title: 'Adjust reputation',
    description: 'Apply manual reputation event adjustments for a user.',
    destructive: false,
    requiredScopes: ['mutate'],
    method: 'POST',
    route: '/api/admin/reputation',
  },
  'admin.reputation.list': {
    id: 'admin.reputation.list',
    title: 'List reputation events',
    description: 'List reputation events with user and pagination filters.',
    destructive: false,
    requiredScopes: ['read'],
    method: 'GET',
    route: '/api/admin/reputation',
  },
}

export function getOperationDefinition(operationId: AdminOperationId): AdminOperationDefinition {
  return adminOperationsV1[operationId]
}

export function getOperationInputSchema(operationId: AdminOperationId) {
  return operationInputSchemas[operationId]
}
