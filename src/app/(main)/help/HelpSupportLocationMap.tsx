import { MapPin } from 'lucide-react'
import { organization } from '@/lib/organization/config'
import { HELP_LOST_FOUND_OFFICE_ANCHOR } from '@/lib/campus/lost-found-office'
import { OfficePickupDetails } from '@/components/office/OfficePickupDetails'

export function HelpSupportLocationMap() {
  const { office } = organization
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const embedSrc = office.mapsUrl && office.address && apiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(office.address)}&zoom=17`
    : null

  return (
    <section
      id={HELP_LOST_FOUND_OFFICE_ANCHOR}
      className="mt-12 sm:mt-14 scroll-mt-24 rounded-xl border border-border bg-bg-elevated p-5 sm:p-6"
      aria-labelledby="help-location-heading"
    >
      <div className="mb-4 flex items-start gap-3">
        <MapPin className="h-5 w-5 shrink-0 text-accent mt-0.5" aria-hidden />
        <div>
          <h2 id="help-location-heading" className="text-lg font-semibold text-text-primary">
            Lost and Found Office
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Collection details for items held by {office.name}.
          </p>
        </div>
      </div>
      <OfficePickupDetails variant="full" showHelpLink={false} />
      {embedSrc && (
        <div className="relative mt-4 w-full overflow-hidden rounded-lg border border-border bg-bg-base aspect-[16/10] min-h-[220px] sm:min-h-[280px]">
          <iframe
            title={`${office.name} location on Google Maps`}
            src={embedSrc}
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      )}
    </section>
  )
}
