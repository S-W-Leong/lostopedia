import { Suspense } from 'react'
import { AuthCodeHandler } from '@/components/auth/AuthCodeHandler'
import { HomeHero } from '@/components/home/HomeHero'
import { HomeFeaturesSection } from '@/components/home/HomeFeaturesSection'
import { HomeHowItWorksSection } from '@/components/home/HomeHowItWorksSection'
import { HomeCTASection } from '@/components/home/HomeCTASection'
import { HomeLandingFooter } from '@/components/home/HomeLandingFooter'
import { AccountDeletedNotification } from '@/components/home/AccountDeletedNotification'
import { getPublicStats } from '@/lib/home/public-stats'
import {
  WebsiteStructuredData,
  OrganizationStructuredData,
} from '@/components/seo/StructuredData'

export default async function Home() {
  const stats = await getPublicStats()
  return (
    <Suspense fallback={null}>
      <AuthCodeHandler>
    <div className="min-h-screen bg-bg-base">
      <WebsiteStructuredData />
      <OrganizationStructuredData />
      <AccountDeletedNotification />
      <HomeHero stats={stats} />
      <HomeFeaturesSection />
      <HomeHowItWorksSection />
      <HomeCTASection />

      <HomeLandingFooter />
    </div>
    </AuthCodeHandler>
    </Suspense>
  )
}
