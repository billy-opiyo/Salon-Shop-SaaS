import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getTenantStorefront } from "@backend/services/tenantDirectory";
import { ExperienceSplash } from "@/components/shared/ExperienceSplash";

interface TenantPageProps {
  readonly params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: TenantPageProps): Promise<Metadata> {
  const { tenantSlug } = await params;
  const tenant = getTenantStorefront(tenantSlug);

  if (!tenant) return { title: "Salon store not found" };

  return {
    title: `${tenant.businessName} | Salon Store`,
    description: tenant.shortDescription,
  };
}

export default async function TenantStorefront({ params }: TenantPageProps) {
  const { tenantSlug } = await params;
  const tenant = getTenantStorefront(tenantSlug);

  if (!tenant) notFound();

  const tenantStyle = { "--tenant-primary": tenant.theme.primaryColor } as CSSProperties;

  return (
    <>
      <ExperienceSplash
        eyebrow="Welcome to your salon experience"
        brandName={tenant.businessName}
        description="Preparing your salon storefront"
      />
      <main className="tenant-store" style={tenantStyle}>
        <header className="tenant-header">
          <Link className="brand-mark" href={`/${tenant.slug}`} aria-label={`${tenant.businessName} home`}>
            <span className="brand-mark__dot" aria-hidden="true" />
            {tenant.businessName}
          </Link>
          <nav className="tenant-nav" aria-label="Salon navigation">
            <Link href="#gallery">Gallery</Link>
            <Link href="#services">Services</Link>
            <Link href="#booking">Booking</Link>
            <Link href="#visit">Visit us</Link>
          </nav>
          <Link className="button button--small button--primary" href={tenant.actionLinks.bookingPath}>Book now</Link>
        </header>

        <section className="tenant-hero" aria-labelledby="tenant-title">
          <div>
            <p className="eyebrow">{tenant.locationLabel} · {tenant.planTier} storefront fixture</p>
            <h1 id="tenant-title">Your signature look starts here.</h1>
            <p>{tenant.shortDescription}</p>
            <div className="tenant-hero__actions">
              <Link className="button button--primary" href={tenant.actionLinks.bookingPath}>Explore booking</Link>
              <Link className="button button--ghost" href="#gallery">See the gallery <span aria-hidden="true">→</span></Link>
            </div>
          </div>
          <div className="tenant-hero__card">
            <span className="eyebrow">The storefront foundation</span>
            <strong>Brand-led. Tenant-scoped. Ready to grow.</strong>
            <p>This route is fixture-backed today. Its data boundary is prepared for Neon and Prisma.</p>
          </div>
        </section>

        <section className="tenant-section" id="gallery" aria-labelledby="gallery-title">
          <p className="eyebrow">Gallery</p><h2 id="gallery-title">A preview of your signature work.</h2>
          <div className="gallery-placeholder"><span>Gallery content will be rebuilt from the reference experience.</span></div>
        </section>

        <section className="tenant-section tenant-section--split" id="services" aria-labelledby="services-title">
          <div><p className="eyebrow">Services</p><h2 id="services-title">Thoughtful services, clearly presented.</h2></div>
          <p>The complete service catalog, categories, cosmetics ordering, and booking rules will be ported in the public parity phase.</p>
        </section>

        <section className="tenant-section tenant-section--booking" id="booking" aria-labelledby="booking-title">
          <p className="eyebrow">Booking</p><h2 id="booking-title">Reserve your next appointment.</h2>
          <Link className="button button--primary" href={tenant.actionLinks.whatsappUrl}>Continue on WhatsApp</Link>
        </section>

        <footer className="tenant-footer" id="visit">
          <div><strong>{tenant.businessName}</strong><span>{tenant.locationLabel}</span></div>
          <div className="mobile-action-links" aria-label="Salon quick actions">
            <Link href={tenant.actionLinks.bookingPath} aria-label="Book an appointment">▣ <span>Book</span></Link>
            <a href={tenant.actionLinks.whatsappUrl} aria-label="Contact salon on WhatsApp">◌ <span>WhatsApp</span></a>
            <a href={tenant.actionLinks.phoneUrl} aria-label="Call salon">◉ <span>Call</span></a>
            <Link href={tenant.actionLinks.directionsUrl} aria-label="View salon location">⌖ <span>Visit</span></Link>
          </div>
        </footer>
      </main>
    </>
  );
}
