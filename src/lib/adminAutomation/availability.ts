export function isAdminAutomationEnabled(
  env: Record<string, string | undefined> = process.env
) {
  return (
    env.ADMIN_AUTOMATION_ENABLED === 'true' ||
    env.NEXT_PUBLIC_ADMIN_AUTOMATION_ENABLED === 'true'
  )
}

export function getAdminAutomationPausedMessage() {
  return 'Admin automation is temporarily paused.'
}
