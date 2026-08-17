import { Link } from 'react-router-dom';

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-10">
      <Link to="/" className="text-sm text-gold hover:underline">
        ← Back to heroes
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-gold sm:text-3xl">Terms of Service</h1>
      <p className="mt-1 text-sm text-gray-500">Last updated: August 18, 2026</p>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-gray-300">
        <p>
          By using Dota 2 Pick Helper ("the app"), you agree to these terms. If you don't agree,
          please don't use the app.
        </p>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">What this is</h2>
          <p>
            This is a free, entertainment-focused, fan-made project built for Dota 2 players. It
            is not affiliated with, endorsed by, or sponsored by Valve Corporation. Dota 2, all
            hero names, and all associated artwork are trademarks and/or copyrighted property of
            Valve Corporation, used here for non-commercial, informational fan purposes only.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">Informational purposes only</h2>
          <p>
            Hero role recommendations, win-rate statistics, and AI-generated summaries are
            provided for entertainment and general information only. They are derived from
            third-party data sources and automated analysis, may be incomplete, delayed, or
            wrong, and should not be treated as authoritative or professional advice. Use your
            own judgment.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">No warranty</h2>
          <p>
            The app is provided "as is," without warranty of any kind, express or implied,
            including but not limited to accuracy, availability, or fitness for a particular
            purpose. The app may be changed, interrupted, or discontinued at any time without
            notice.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">Limitation of liability</h2>
          <p>
            To the fullest extent permitted by law, the app's operator is not liable for any
            damages or losses arising from your use of, or inability to use, the app.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">Acceptable use</h2>
          <p>
            Please don't use the app in a way that disrupts the service (e.g. automated scraping
            at high volume) or attempt to gain unauthorized access to any part of it.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">Changes to these terms</h2>
          <p>
            These terms may be updated from time to time; continued use of the app after a change
            means you accept the updated terms.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">Contact</h2>
          <p>
            Questions about these terms can be sent to{' '}
            <a href="mailto:mustafaguner235@gmail.com" className="text-gold hover:underline">
              mustafaguner235@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
