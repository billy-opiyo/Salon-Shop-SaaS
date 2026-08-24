"use client";

import { useEffect } from "react";

export interface ReferenceSalonRuntimeProps {
  readonly markup: string;
  readonly bodyClassName: string;
  readonly headStyles?: readonly string[];
  readonly tenantSlug?: string;
  readonly turnstileSiteKey?: string;
  readonly clientConfig: Readonly<Record<string, unknown>>;
  readonly loadSalonRuntime?: boolean;
  readonly runtimeKind?: "salon" | "admin" | "none";
}

declare global {
  interface Window {
    APP_CONFIG?: Record<string, unknown>;
    CLIENT_CONFIG?: Record<string, unknown>;
    __referenceSalonRuntimeLoaded?: boolean;
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          readonly sitekey: string;
          readonly callback: (token: string) => void;
          readonly "expired-callback": () => void;
          readonly "error-callback": () => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const REFERENCE_SCRIPTS = [
  "/reference/JS/splash.js?v=20260602-splash-controller",
  "/reference/JS/apply-client-config.js",
  "/reference/JS/theme-preset-preview.js",
  "/reference/JS/script.js?v=20260531-waitlist-joined-feedback-mobile-time-picker-fix",
] as const;

function loadClassicScript(source: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const selector = "script[data-reference-src=\"" + source + "\"]";
    if (document.querySelector(selector)) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = source;
    script.async = false;
    script.dataset.referenceSrc = source;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Reference script failed to load: " + source));
    document.head.appendChild(script);
  });
}

function getFormValue(form: HTMLFormElement, name: string): string {
  const value = new FormData(form).get(name);
  return typeof value === "string" ? value.trim() : "";
}

function setBookingMessage(message: string, type: "error" | "success"): void {
  const element = document.getElementById("bookingMessage");
  if (!element) return;
  element.textContent = message;
  element.classList.remove("error", "success");
  element.classList.add(type);
}

function setBookingLoading(button: HTMLButtonElement, loading: boolean): void {
  button.disabled = loading;
  button.setAttribute("aria-busy", String(loading));
  button.textContent = loading ? "Processing..." : "Confirm Booking";
}

function showBookingSuccess(): void {
  const form = document.getElementById("bookingForm");
  const success = document.getElementById("bookingSuccess");
  if (!(form instanceof HTMLElement) || !(success instanceof HTMLElement)) return;

  form.style.display = "none";
  success.style.display = "block";
  success.setAttribute("tabindex", "-1");
  success.scrollIntoView({ behavior: "smooth", block: "center" });
  success.focus({ preventScroll: true });
}

function getTurnstileToken(form: HTMLFormElement): string {
  const input = form.querySelector<HTMLInputElement>(
    "input[name=\"turnstileToken\"]",
  );
  return input?.value.trim() ?? "";
}

function ensureTurnstile(form: HTMLFormElement, siteKey: string): void {
  if (!siteKey || form.querySelector("[data-saas-turnstile]")) return;

  const container = document.createElement("div");
  container.dataset.saasTurnstile = "true";
  container.className = "form-group full";
  container.setAttribute("aria-live", "polite");
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = "turnstileToken";
  container.appendChild(input);
  form.appendChild(container);

  const render = () => {
    if (!window.turnstile || container.dataset.saasTurnstileRendered === "true") return;
    container.dataset.saasTurnstileRendered = "true";
    window.turnstile.render(container, {
      sitekey: siteKey,
      callback: (token) => {
        input.value = token;
      },
      "expired-callback": () => {
        input.value = "";
      },
      "error-callback": () => {
        input.value = "";
      },
    });
  };

  if (window.turnstile) {
    render();
    return;
  }

  const existingScript = document.querySelector<HTMLScriptElement>(
    'script[data-turnstile="true"]',
  );
  const script = existingScript ?? document.createElement("script");
  if (!existingScript) {
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.turnstile = "true";
    document.head.appendChild(script);
  }
  script.addEventListener("load", render, { once: true });
}

function bindBookingAdapter(tenantSlug: string, turnstileSiteKey: string): () => void {
  const form = document.getElementById("bookingForm");
  if (!(form instanceof HTMLFormElement)) return () => undefined;

  ensureTurnstile(form, turnstileSiteKey);

  const submit = async (event: Event): Promise<void> => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const firstName = getFormValue(form, "firstName");
    const lastName = getFormValue(form, "lastName");
    const email = getFormValue(form, "email");
    const phone = getFormValue(form, "phone");
    const serviceName = getFormValue(form, "service");
    const customService = getFormValue(form, "customService");
    const appointmentDate = getFormValue(form, "date");
    const timeLabel = getFormValue(form, "time");
    const specialRequests = getFormValue(form, "notes");
    const turnstileToken = getTurnstileToken(form);
    const button = document.getElementById("submitBtn");

    if (!(button instanceof HTMLButtonElement)) return;
    if (!turnstileToken) {
      setBookingMessage(
        "Security verification is required before submitting your booking.",
        "error",
      );
      return;
    }

    setBookingLoading(button, true);
    setBookingMessage("", "success");

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenantSlug,
          firstName,
          lastName,
          email,
          phone,
          serviceName: customService || serviceName,
          customService: customService || undefined,
          appointmentDate,
          timeLabel,
          specialRequests: specialRequests || undefined,
          turnstileToken,
        }),
      });

      const payload: unknown = await response.json().catch(() => ({}));
      const error =
        typeof payload === "object" &&
        payload !== null &&
        "error" in payload &&
        typeof payload.error === "string"
          ? payload.error
          : "The booking could not be created. Please try again.";

      if (!response.ok) {
        setBookingMessage(error, "error");
        return;
      }

      setBookingMessage(
        "Booking request received. We will confirm your appointment shortly.",
        "success",
      );
      showBookingSuccess();
    } catch {
      setBookingMessage(
        "The booking service could not be reached. Please try again.",
        "error",
      );
    } finally {
      setBookingLoading(button, false);
    }
  };

  const waitlistButton = document.getElementById("joinWaitlistBtn");
  const joinWaitlist = async (event: Event): Promise<void> => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!(waitlistButton instanceof HTMLButtonElement)) return;

    const turnstileToken = getTurnstileToken(form);
    if (!turnstileToken) {
      setBookingMessage(
        "Security verification is required before joining the waitlist.",
        "error",
      );
      return;
    }

    const name = [
      getFormValue(form, "firstName"),
      getFormValue(form, "lastName"),
    ]
      .filter(Boolean)
      .join(" ");
    const preferredTimeElement = document.getElementById("waitlistTimeSelect");
    const preferredTime =
      preferredTimeElement instanceof HTMLSelectElement
        ? preferredTimeElement.value.trim()
        : "";

    waitlistButton.disabled = true;
    waitlistButton.setAttribute("aria-busy", "true");
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenantSlug,
          name,
          email: getFormValue(form, "email"),
          phone: getFormValue(form, "phone"),
          serviceName:
            getFormValue(form, "customService") ||
            getFormValue(form, "service"),
          preferredDate: getFormValue(form, "date") || undefined,
          preferredTime: preferredTime || getFormValue(form, "time") || undefined,
          preferredStylist: getFormValue(form, "stylist") || undefined,
          turnstileToken,
        }),
      });
      const payload: unknown = await response.json().catch(() => ({}));
      const error =
        typeof payload === "object" &&
        payload !== null &&
        "error" in payload &&
        typeof payload.error === "string"
          ? payload.error
          : "The waitlist request could not be saved.";

      if (!response.ok) {
        setBookingMessage(error, "error");
        return;
      }

      setBookingMessage(
        "You have been added to the waitlist. We will notify you if the time opens.",
        "success",
      );
    } catch {
      setBookingMessage(
        "The waitlist service could not be reached. Please try again.",
        "error",
      );
    } finally {
      waitlistButton.disabled = false;
      waitlistButton.removeAttribute("aria-busy");
    }
  };

  form.addEventListener("submit", submit, true);
  waitlistButton?.addEventListener("click", joinWaitlist, true);
  return () => {
    form.removeEventListener("submit", submit, true);
    waitlistButton?.removeEventListener("click", joinWaitlist, true);
  };
}

export function ReferenceSalonRuntime({
  markup,
  bodyClassName,
  headStyles,
  tenantSlug,
  turnstileSiteKey,
  clientConfig,
  loadSalonRuntime,
  runtimeKind,
}: ReferenceSalonRuntimeProps) {
  useEffect(() => {
    window.CLIENT_CONFIG = { ...clientConfig };
    window.APP_CONFIG = { ...(window.APP_CONFIG ?? {}), firebase: {} };

    const originalBodyClassName = document.body.className;
    bodyClassName
      .split(/\s+/)
      .filter(Boolean)
      .forEach((className) => document.body.classList.add(className));

    const activeRuntime = runtimeKind ?? (loadSalonRuntime === false ? "none" : "salon");
    if (activeRuntime === "none") return () => { document.body.className = originalBodyClassName; };

    if (window.__referenceSalonRuntimeLoaded) {
      return () => {
        document.body.className = originalBodyClassName;
      };
    }

    window.__referenceSalonRuntimeLoaded = true;
    let removeBookingAdapter: () => void = () => undefined;

    const runtimeScripts = activeRuntime === "admin" ? [
      "/reference/JS/apply-client-config.js",
      "/reference/JS/theme-preset-preview.js",
      "/reference/JS/admin.js",
    ] : REFERENCE_SCRIPTS;

    void runtimeScripts.reduce(
      (chain, source) => chain.then(() => loadClassicScript(source)),
      Promise.resolve(),
    )
      .then(() => {
        if (activeRuntime === "salon") {
          removeBookingAdapter = bindBookingAdapter(tenantSlug ?? "", turnstileSiteKey ?? "");
        }
      })
      .catch((error: unknown) => {
        console.error("Reference salon runtime failed to initialize.", error);
      });

    return () => {
      removeBookingAdapter();
      document.body.className = originalBodyClassName;
    };
  }, [bodyClassName, clientConfig, tenantSlug, turnstileSiteKey, loadSalonRuntime, runtimeKind]);

  return (
    <>
      {headStyles?.map((style, index) => (
        <style key={"reference-head-style-" + index} dangerouslySetInnerHTML={{ __html: style }} />
      ))}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://www.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />
      <link rel="stylesheet" href="/reference/CSS/style.css" />
      <div
        className="reference-salon-root"
        dangerouslySetInnerHTML={{ __html: markup }}
      />
    </>
  );
}








