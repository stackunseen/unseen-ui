import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { featuredApp } from '../lib/first-release';

export function HomeAppExample() {
  return (
    <section className="home-template-section" aria-labelledby="home-app-title">
      <div className="home-section-heading">
        <div>
          <p className="web-eyebrow">Put the pieces together</p>
          <h2 id="home-app-title">Explore a working admin app.</h2>
        </div>
        <Link prefetch={false} className="web-text-link" href={featuredApp.href}>
          Open {featuredApp.name} <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </div>
      <figure className="home-template-figure">
        <Link prefetch={false} href={featuredApp.href} aria-label="Open the SaaS admin example">
          {(['light', 'dark'] as const).map((appearance) => (
            <Image
              key={appearance}
              className={`home-template-${appearance}`}
              src={`/previews/saas-admin-${appearance}.png`}
              alt={`SaaS admin local demo with customer records and organization navigation in ${appearance} mode`}
              width={1376}
              height={1096}
              unoptimized
            />
          ))}
        </Link>
        <figcaption>
          <p className="home-template-note">
            Screenshot in the sample theme. Open the app to try your colors and borders.
          </p>
          <p>
            Search and edit customers, manage sample roles and save settings. Changes stay in a
            local demo and reset on reload.
          </p>
          <Link prefetch={false} className="web-text-link" href={featuredApp.href}>
            Try the app <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </figcaption>
      </figure>
    </section>
  );
}
