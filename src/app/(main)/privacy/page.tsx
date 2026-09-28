import Link from 'next/link'
import { CONTACT_EMAIL } from '@/lib/constants'
import { organization } from '@/lib/organization/config'

export const metadata = {
  title: 'Privacy Policy',
  description: `Privacy Policy for ${organization.name} – how we collect, use, and protect your data.`,
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-bg-base">
      <div className="container mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <header className="mb-12">
          <h1 className="text-display text-3xl font-bold text-text-primary sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-2 text-text-secondary">
            Last updated: February 2025
          </p>
        </header>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-12 text-text-secondary">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-text-primary">1. Introduction</h2>
            <p>
              {organization.name} (&quot;we,&quot; &quot;our,&quot; or &quot;the Platform&quot;) is committed to protecting your privacy. This Privacy Policy explains what information we collect, how we use it, and how we safeguard it when you use our lost and found service. By using {organization.name}, you agree to the practices described in this policy.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-text-primary">2. Information We Collect</h2>
            <p>
              We collect information you provide directly and information that is generated when you use the Platform.
            </p>
            <p className="font-medium text-text-primary">Information you provide</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account data:</strong> email address, display name, and password (stored securely and hashed)</li>
              <li><strong>Profile data:</strong> optional profile information and avatar if you choose to add them</li>
              <li><strong>Item listings:</strong> titles, descriptions, categories, locations (including optional map coordinates), dates, and photos you upload for lost or found items</li>
              <li><strong>Messages:</strong> content of messages you send through the in-app messaging system</li>
              <li><strong>Reports:</strong> if you flag content or report an issue, we store the reason and any description you provide</li>
            </ul>
            <p className="font-medium text-text-primary mt-4">Information we collect automatically</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Usage data:</strong> how you use the Platform (e.g. pages visited, features used) to improve the service</li>
              <li><strong>Device and browser information:</strong> such as IP address, browser type, and device type, for security and compatibility</li>
              <li><strong>Cookies and similar technologies:</strong> we use session and preference cookies to keep you logged in and to remember your settings</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-text-primary">3. How We Use Your Information</h2>
            <p>
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, maintain, and improve the Platform (including search, matching, and messaging)</li>
              <li>Authenticate your account and manage your profile</li>
              <li>Display your item listings and messages to other users as intended (e.g. to potential finders or owners)</li>
              <li>Send you notifications (e.g. new messages, item expiry) if you have opted in</li>
              <li>Moderate content, investigate reports, and enforce our Terms of Service</li>
              <li>Protect against abuse, fraud, and security incidents</li>
              <li>Comply with legal obligations and respond to lawful requests</li>
              <li>Analyze usage in an aggregated, non-personally-identifying way to improve our service</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-text-primary">4. How We Share Your Information</h2>
            <p>
              We do not sell your personal information. We may share information in these limited circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>With other users:</strong> your display name, item listings, and messages are visible to other users as part of the service (e.g. when you post an item or send a message)</li>
              <li><strong>Service providers:</strong> we use third-party services (e.g. hosting, email, analytics) that process data on our behalf under strict agreements to protect your data</li>
              <li><strong>Legal and safety:</strong> we may disclose information if required by law, to protect our rights or the safety of users, or to respond to valid legal process</li>
              <li><strong>With your consent:</strong> we may share information for other purposes when you have given clear consent</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-text-primary">5. Data Storage and Security</h2>
            <p>
              Your data is stored on secure servers with encryption at rest. We use industry-standard practices to protect your account and data from unauthorized access. Passwords are hashed and never stored in plain text. While we take reasonable measures to protect your information, no system is completely secure; you are responsible for keeping your password confidential.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-text-primary">6. Data Retention</h2>
            <p>
              We retain your account and profile data for as long as your account is active. Item listings may be automatically archived after recovery or after a set period (e.g. 90 days) as described in our product; extended retention may apply for moderation or legal purposes. Messages are retained to support the messaging feature and dispute resolution. When you delete your account, we delete or anonymize your personal data in accordance with our data lifecycle policy, except where we must retain data for legal or safety reasons.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-text-primary">7. Your Rights and Choices</h2>
            <p>
              Depending on your location, you may have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> request a copy of the personal data we hold about you</li>
              <li><strong>Correction:</strong> request correction of inaccurate or incomplete data (you can also update your profile and listings in the app)</li>
              <li><strong>Deletion:</strong> request deletion of your personal data, including by deleting your account</li>
              <li><strong>Object or restrict processing:</strong> object to certain uses of your data or request that we limit how we use it</li>
              <li><strong>Data portability:</strong> request your data in a structured, machine-readable format where applicable</li>
            </ul>
            <p>
              To exercise these rights, contact us at the email below. We will respond within a reasonable time and in accordance with applicable law. You may also have the right to lodge a complaint with a supervisory authority in your jurisdiction.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-text-primary">8. Cookies and Similar Technologies</h2>
            <p>
              We use cookies and similar technologies to keep you signed in, remember your preferences, and understand how the Platform is used. You can control cookies through your browser settings; disabling certain cookies may affect your ability to use some features (e.g. staying logged in).
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-text-primary">9. Children</h2>
            <p>
              {organization.name} is not intended for users under 18 (or the age of majority in your jurisdiction). We do not knowingly collect personal information from children. If you believe we have collected such information, please contact us so we can delete it.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-text-primary">10. International Transfers</h2>
            <p>
              Your data may be processed in countries other than your own. We ensure appropriate safeguards are in place so that your data remains protected in line with this policy and applicable law.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-text-primary">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will post the updated policy on this page and update the &quot;Last updated&quot; date. For material changes, we may provide additional notice (e.g. by email or a notice on the Platform). Your continued use of {organization.name} after changes are posted constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-text-primary">12. Contact Us</h2>
            <p>
              For privacy-related questions, to exercise your rights, or to report a concern, please contact us at{' '}
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
