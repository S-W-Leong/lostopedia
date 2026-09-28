import 'server-only'
import { createClient } from './server'
import { createAdminClient } from './admin'

export interface ClaimantDetails {
  claimantName: string | null
  claimantStudentId: string | null
  claimantRecordedBy: string | null
}

const hiddenClaimant: ClaimantDetails = {
  claimantName: null,
  claimantStudentId: null,
  claimantRecordedBy: null,
}

/** Re-checks the session and ownership before a service-role claimant read. */
export async function getAuthorizedClaimant(itemId: string): Promise<ClaimantDetails> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return hiddenClaimant

  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('posted_by')
    .eq('id', itemId)
    .single()
  if (itemError || !item) return hiddenClaimant

  if (item.posted_by !== user.id) {
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    if (profileError || !profile?.is_admin) return hiddenClaimant
  }

  const { data, error } = await createAdminClient()
    .from('items')
    .select('claimant_name, claimant_student_id, claimant_recorded_by')
    .eq('id', itemId)
    .single()
  if (error || !data) return hiddenClaimant

  return {
    claimantName: data.claimant_name,
    claimantStudentId: data.claimant_student_id,
    claimantRecordedBy: data.claimant_recorded_by,
  }
}
