/**
 * Determines if a viewer has permission to view claimant details (name and student ID).
 * Only the item poster (owner) and admins can view claimant details.
 */
export function canViewClaimantDetails(
  viewerId: string | null | undefined,
  isViewerAdmin: boolean,
  postedBy: string | null | undefined
): boolean {
  if (!viewerId) return false
  if (isViewerAdmin) return true
  return viewerId === postedBy
}
