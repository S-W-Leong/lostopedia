import Link from 'next/link'
import { CONTACT_EMAIL } from '@/lib/constants'
import { organization } from '@/lib/organization/config'

export const metadata = {
  title: 'Terms of Service',
  description: `Terms of Service for ${organization.name}.`,
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-bg-base">
      <div className="container mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <header className="mb-12">
          <h1 className="text-display text-3xl font-bold text-text-primary sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-2 text-text-secondary">
            Last updated: February 2025
          </p>
        </header>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-12 text-text-secondary">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-text-primary">1. Acceptance of Terms</h2>
            <p>
              By creating an account or using {organization.name} (&quot;the Platform&quot;), you agree to be bound by these Terms of Service. The Platform connects people who have found items with those searching for lost belongings. If you do not agree to these terms, please do not use the Platform.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-text-primary">2. Eligibility</h2>
            <p>
              You must be at least 18 years of age (or the age of majority in your jurisdiction) to use the Platform. By using {organization.name}, you represent that you meet this requirement. The Platform is intended for members of {organization.organizationName}.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-text-primary">3. Account Responsibilities</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You agree to provide accurate and current information when registering and to update it as needed. You must not share your account with others or use the Platform for any illegal or unauthorized purpose.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-text-primary">4. Acceptable Use</h2>
            <p>
              You agree to use the Platform in a lawful, respectful, and honest manner. You must not:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Post false, misleading, or fraudulent lost or found items</li>
              <li>Harass, abuse, or threaten other users</li>
              <li>Use the Platform for commercial advertising or spam</li>
              <li>Impersonate others or misrepresent your identity</li>
              <li>Attempt to obtain payment for returning items except for legitimate out-of-pocket costs</li>
              <li>Circumvent security features, abuse APIs, or attempt unauthorized access to systems or data</li>
            </ul>
            <p>
              Violations may result in content removal, suspension, or permanent ban from the Platform, and we may report serious misconduct to relevant authorities.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-text-primary">5. Items and Recovery</h2>
            <p>
              When you post a lost or found item, you are responsible for the accuracy of the description, location, and images. {organization.name} does not verify ownership or the condition of items. Arrangements to return or collect items are made solely between users; the Platform is not a party to those transactions and is not responsible for any loss, damage, or dispute arising from them.
            </p>
            <p>
              You are encouraged to meet in safe, public places when returning items and to follow any campus or local guidelines. Use of the in-app messaging system helps protect your privacy until you choose to share contact details.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-text-primary">6. Content You Post</h2>
            <p>
              You retain ownership of content you submit (e.g. photos, descriptions). By posting, you grant {organization.name} a non-exclusive, royalty-free license to use, store, display, and process that content as needed to operate the Platform (including matching, search, and moderation). Do not post content that infringes others&apos; intellectual property or that contains sensitive personal data (e.g. full IDs, payment details).
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-text-primary">7. Disclaimers</h2>
            <p>
              The Platform is provided &quot;as is&quot; and &quot;as available.&quot; We do not guarantee that {organization.name} will be uninterrupted, error-free, or that matches or search results are complete or accurate. We are not liable for any decisions you make based on information on the Platform or for any loss or harm arising from your use of the service or from interactions with other users.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-text-primary">8. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, {organization.name} and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss of profits, data, or goodwill, arising from your use of the Platform. Our total liability for any claims related to the Platform shall not exceed the amount you have paid to us in the twelve months preceding the claim (if any), or one hundred dollars, whichever is greater.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-text-primary">9. Termination</h2>
            <p>
              We may suspend or terminate your account if you breach these terms or for other operational or safety reasons. You may delete your account at any time through your profile or account settings. Upon termination, your right to use the Platform ceases immediately; provisions that by their nature should survive (including disclaimers and limitations of liability) will remain in effect.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-text-primary">10. Changes to the Terms</h2>
            <p>
              We may update these Terms of Service from time to time. We will notify you of material changes by posting the updated terms on this page and updating the &quot;Last updated&quot; date. Your continued use of the Platform after such changes constitutes acceptance of the revised terms. We encourage you to review this page periodically.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-text-primary">11. Contact</h2>
            <p>
              For questions about these Terms of Service, please contact us at{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-accent hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>

        <footer className="mt-16 pt-8 border-t border-border">
          <Link
            href="/"
            className="text-accent hover:underline"
          >
            ← Back to {organization.name}
          </Link>
        </footer>
      </div>
    </div>
  )
}
