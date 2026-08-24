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
  const tenant = await getTenantStorefront(tenantSlug);

  if (!tenant) return { title: "Salon store not found" };

  return {
    title: `${tenant.businessName} | Salon Store`,
    description: tenant.shortDescription,
  };
}

export default async function TenantStorefront({ params }: TenantPageProps) {
  const { tenantSlug } = await params;
  const tenant = await getTenantStorefront(tenantSlug);

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
          <div className="tenant-gallery">{tenant.gallery.map((item) => <article className={`tenant-gallery__item ${item.tone}`} key={item.title}><span>{item.category}</span><strong>{item.title}</strong></article>)}</div>
        </section>

        <section className="tenant-section tenant-section--split" id="services" aria-labelledby="services-title">
          <div><p className="eyebrow">Services</p><h2 id="services-title">Thoughtful services, clearly presented.</h2><p>Choose an appointment, or message us about salon products that are available for WhatsApp ordering.</p></div>
          <div className="service-list">{tenant.services.map((service) => <article className="service-list__item" key={service.name}><div><span className="eyebrow">{service.category}</span><h3>{service.name}</h3><p>{service.description}</p></div><strong>{service.isCosmeticProduct ? <a href={tenant.actionLinks.whatsappUrl}>Order</a> : service.priceLabel}<small>{service.durationMinutes > 0 ? `${service.durationMinutes} min` : "Cosmetics"}</small></strong></article>)}</div>
        </section>

        <section className="tenant-section tenant-section--booking" id="booking" aria-labelledby="booking-title">
          <div className="booking-panel"><div><p className="eyebrow">Booking</p><h2 id="booking-title">Reserve your next appointment.</h2><p>Choose a service and preferred time. Your final slot confirmation is handled securely in the booking flow.</p></div><div className="tenant-hero__actions"><Link className="button button--primary" href="#client-dashboard">Start booking</Link><a className="button button--outline" href={tenant.actionLinks.whatsappUrl}>Ask on WhatsApp</a></div></div>
        </section>

        <section className="tenant-section tenant-section--split" id="client-dashboard" aria-labelledby="dashboard-title">
          <div><p className="eyebrow">Client dashboard</p><h2 id="dashboard-title">Keep your salon plans in one place.</h2></div>
          <div className="dashboard-preview"><p>Sign in to review appointments, favorites, messages, and account security.</p><div className="preview-stat-grid"><div><strong>01</strong><span>Upcoming visit</span></div><div><strong>04</strong><span>Saved looks</span></div><div><strong>24/7</strong><span>Account access</span></div></div><Link className="button button--outline" href="/login">Client sign in</Link></div>
        </section>

        <section className="tenant-section" id="reviews" aria-labelledby="reviews-title">
          <p className="eyebrow">Reviews</p><h2 id="reviews-title">Loved by clients who value the details.</h2>
          <div className="review-grid">{tenant.reviews.map((review) => <article className="review-card" key={review.author}><div className="review-card__stars" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}</div><p>“{review.text}”</p><strong>{review.author}</strong></article>)}</div>
        </section>

        <section className="tenant-section" id="blog" aria-labelledby="blog-title">
          <p className="eyebrow">Journal</p><h2 id="blog-title">Notes for your next look.</h2>
          <div className="blog-grid">{tenant.blogPosts.map((post) => <article className="blog-card" key={post.title}><span className="eyebrow">{post.category}</span><h3>{post.title}</h3><p>{post.excerpt}</p><Link href="#contact">Read the guide <span aria-hidden="true">→</span></Link></article>)}</div>
        </section>

        <section className="tenant-section tenant-section--split" id="contact" aria-labelledby="contact-title">
          <div><p className="eyebrow">Contact</p><h2 id="contact-title">Let’s plan your next visit.</h2><p>Questions about a service, your appointment, or a cosmetic product? We are happy to help.</p></div>
          <div className="contact-card"><strong>{tenant.locationLabel}</strong><p>Open Tuesday–Saturday · 9:00–18:00</p><div className="tenant-hero__actions"><a className="button button--primary" href={tenant.actionLinks.phoneUrl}>Call the salon</a><a className="button button--outline" href={tenant.actionLinks.whatsappUrl}>Message us</a></div></div>
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
