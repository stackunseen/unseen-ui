import Image from 'next/image';
import Link from 'next/link';
import { featuredApp } from '../lib/first-release';

export function HomeAppExample() {
  return (
    <section className="home-template-section" aria-labelledby="home-app-title">
      <div className="home-section-heading">
        <div>
          <h2 id="home-app-title">See a full app built with them.</h2>
        </div>
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
          <p>
            Search and edit customers, manage sample roles and save settings. Changes stay in a
            local demo and reset on reload.
          </p>
          <Link prefetch={false} className="web-text-link" href={featuredApp.href}>
            Try the app
          </Link>
        </figcaption>
      </figure>
    </section>
  );
}
