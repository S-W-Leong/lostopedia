'use client'
import * as React from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ItemCard, ItemCardSkeleton } from '@/components/items/ItemCard'
import { ItemCard as ItemCardType } from '@/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { RecoveryModal } from '@/components/items/RecoveryModal'
import { OfficeClaimantModal } from '@/components/items/OfficeClaimantModal'
import { Pencil, Trash2, CheckCircle, Clock, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function MyItemsPage() {
  const router = useRouter()
  const [items, setItems] = React.useState<ItemCardType[]>([])
  const [loading, setLoading] = React.useState(true)
  const [lostRecovering, setLostRecovering] = React.useState<{
    id: string
    title: string
  } | null>(null)
  const [foundClaimant, setFoundClaimant] = React.useState<{
    id: string
    title: string
  } | null>(null)
  const [completingItemId, setCompletingItemId] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      // Use getSession() instead of getUser() for faster loads
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.user) {
        router.push('/login') // Redirect if not logged in
        return
      }

      const user = session.user

      const { data, error } = await supabase
        .from('items')
        .select(`
          id, type, title, description, category, image_url, location_text,
          pickup_method, status, created_at, expires_at,
          poster:users!posted_by(
            id,
            display_name,
            avatar_url,
            reputation_score
          )
        `)
        .eq('posted_by', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching items:', error)
        setLoading(false)
        return
      }

      // Map DB response to ItemCardType
      const mappedItems: ItemCardType[] = (data || [])
        .filter((item: any) => item.poster) // Filter out items without poster data
        .map((item: any) => {
          return {
            id: item.id,
            type: item.type,
            title: item.title,
            description: item.description,
            category: item.category,
            imageUrl: item.image_url,
            locationText: item.location_text,
            pickupMethod:
              item.pickup_method === 'office' || item.pickup_method === 'meetup'
                ? item.pickup_method
                : null,
            status: item.status,
            createdAt: item.created_at,
            expiresAt: item.expires_at,
            poster: {
              id: item.poster.id,
              displayName: item.poster.display_name,
              avatarUrl: item.poster.avatar_url,
              reputationScore: item.poster.reputation_score
            }
          }
        })
      setItems(mappedItems)
      setLoading(false)
    }

    fetchData()
  }, [router])

  const handleDelete = async (id: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      setItems(items.filter(item => item.id !== id))
    } catch (error) {
      console.error('Error deleting item:', error)
      alert('Failed to delete item')
    }
  }

  const handleCompleteLost = async (id: string, helperId?: string) => {
    const snapshot = items
    setCompletingItemId(id)
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, status: 'completed' as const } : item
      )
    )
    try {
      const body: Record<string, unknown> = {}
      if (helperId) body.helper_user_id = helperId

      const response = await fetch(`/api/items/${id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to mark item as completed')
      }
    } catch (error) {
      console.error('Error completing item:', error)
      setItems(snapshot)
      throw error
    } finally {
      setCompletingItemId(null)
    }
  }

  const handleCompleteFound = async (
    id: string,
    claimant: { name: string; studentId: string | null }
  ) => {
    const snapshot = items
    setCompletingItemId(id)
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, status: 'completed' as const } : item
      )
    )
    try {
      const response = await fetch(`/api/items/${id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          claimantName: claimant.name,
          claimantStudentId: claimant.studentId,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to mark item as completed')
      }
    } catch (error) {
      console.error('Error completing item:', error)
      setItems(snapshot)
      throw error
    } finally {
      setCompletingItemId(null)
    }
  }

  const handleCompleteAction = async (item: ItemCardType) => {
    if (item.type === 'lost') {
      setLostRecovering({ id: item.id, title: item.title })
      return
    }

    setFoundClaimant({ id: item.id, title: item.title })
  }

  const handleExtend = async (id: string) => {
    try {
      const response = await fetch(`/api/items/${id}/extend`, {
        method: 'POST',
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to extend item')
      }

      setItems(items.map(i => 
        i.id === id ? { ...i, expiresAt: result.newExpiresAt, status: 'active' } : i
      ))
      
      alert(`Item extended by 90 days! ${result.extensionsRemaining} extensions remaining.`)
    } catch (error) {
      console.error('Error extending item:', error)
      alert(error instanceof Error ? error.message : 'Failed to extend item')
    }
  }

  // Filter items by status, including checking for expired items based on expires_at date
  const now = new Date()
  const activeItems = items.filter(i => i.status === 'active' && (!i.expiresAt || new Date(i.expiresAt) > now))
  const completedItems = items.filter(i => i.status === 'completed')
  const expiredItems = items.filter(i => 
    i.status === 'expired' || (i.status === 'active' && i.expiresAt && new Date(i.expiresAt) <= now)
  )

  if (loading) {
    return (
      <div className="container py-8 max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <ItemCardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">My Items</h1>
        <Button asChild>
          <Link href="/post">Post New Item</Link>
        </Button>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="active">Active ({activeItems.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedItems.length})</TabsTrigger>
          <TabsTrigger value="expired">Expired ({expiredItems.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          {activeItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              You have no active items.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeItems.map(item => (
                <ItemCard 
                  key={item.id} 
                  item={item} 
                  showActions
                  actions={
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/item/${item.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                        disabled={completingItemId === item.id}
                        onClick={() => void handleCompleteAction(item)}
                      >
                        {completingItemId === item.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Completing…
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Complete
                          </>
                        )}
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Item?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this item? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleDelete(item.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-6">
          {completedItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No completed items yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedItems.map(item => (
                <ItemCard 
                  key={item.id} 
                  item={item} 
                  showActions
                  actions={
                     <div className="flex items-center justify-end w-full">
                       <span className="text-sm text-muted-foreground flex items-center">
                         <CheckCircle className="mr-1 h-3 w-3" />
                         Completed
                       </span>
                     </div>
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="expired" className="space-y-6">
          {expiredItems.length === 0 ? (
             <div className="text-center py-12 text-muted-foreground">
              No expired items.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {expiredItems.map(item => (
                <ItemCard 
                  key={item.id} 
                  item={item} 
                  showActions
                  actions={
                    <div className="flex items-center justify-between w-full">
                       <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">Expired</Badge>
                       <Button variant="outline" size="sm" onClick={() => handleExtend(item.id)}>
                         <Clock className="mr-2 h-4 w-4" />
                         Extend (90 Days)
                       </Button>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {lostRecovering && (
        <RecoveryModal
          isOpen
          onClose={() => setLostRecovering(null)}
          itemTitle={lostRecovering.title}
          onComplete={async (helperId) => {
            try {
              await handleCompleteLost(lostRecovering.id, helperId)
            } catch (error) {
              console.error('Error completing lost item:', error)
              alert(
                error instanceof Error ? error.message : 'Failed to mark item as completed'
              )
              throw error
            }
            setLostRecovering(null)
          }}
        />
      )}

      {foundClaimant && (
        <OfficeClaimantModal
          open
          onClose={() => setFoundClaimant(null)}
          itemTitle={foundClaimant.title}
          onConfirm={async (name, studentId) => {
            try {
              await handleCompleteFound(foundClaimant.id, { name, studentId })
            } catch (error) {
              console.error('Error completing found item:', error)
              alert(
                error instanceof Error ? error.message : 'Failed to mark item as completed'
              )
              throw error
            }
            setFoundClaimant(null)
          }}
        />
      )}
    </div>
  )
}
