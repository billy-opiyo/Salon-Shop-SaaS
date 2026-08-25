"use client";

import { useEffect } from "react";
import { signIn, signOut } from "next-auth/react";

import { registerAccount } from "@/app/signup/actions";

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

function getConfiguredWhatsAppUrl(): string {
  const social = window.CLIENT_CONFIG?.social;
  if (typeof social === "object" && social !== null && "whatsapp" in social) {
    const value = social.whatsapp;
    if (typeof value === "string" && value.startsWith("https://")) return value;
  }
  return "https://wa.me/254740470381";
}

function openReferenceWhatsAppOrder(serviceName: string, price: string): void {
  const text = "Hello, I would like to order " + serviceName +
    (price ? " (" + price + ")" : "") + ".";
  const baseUrl = getConfiguredWhatsAppUrl();
  const separator = baseUrl.includes("?") ? "&" : "?";
  window.open(baseUrl + separator + "text=" + encodeURIComponent(text), "_blank", "noopener,noreferrer");
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

interface SessionUser {
  readonly name?: string | null;
  readonly email?: string | null;
}

function readSessionUser(payload: unknown): SessionUser | null {
  if (typeof payload !== "object" || payload === null || !("user" in payload)) {
    return null;
  }
  const user = payload.user;
  if (typeof user !== "object" || user === null) return null;
  const name = "name" in user && typeof user.name === "string" ? user.name : null;
  const email = "email" in user && typeof user.email === "string" ? user.email : null;
  return name || email ? { name, email } : null;
}

function setAuthMessage(message: string, type: "error" | "success"): void {
  const element = document.getElementById("authMessage");
  if (!element) return;
  element.textContent = message;
  element.classList.remove("error", "success");
  if (message) element.classList.add(type);
}

function updateReferenceAuthUi(user: SessionUser | null): void {
  const loginButton = document.getElementById("openAuthModalBtn");
  const profileMenu = document.getElementById("authProfileMenu");
  const profileInitial = document.getElementById("authProfileInitial");
  const profileName = document.getElementById("authProfileName");
  const dashboardLink = document.getElementById("navDashboardLink");
  const dashboard = document.getElementById("clientDashboard");
  const dashboardAuthButton = document.getElementById("dashboardAuthBtn");
  const dashboardName = document.getElementById("dashboardProfileName");
  const dashboardEmail = document.getElementById("dashboardProfileEmail");

  const signedIn = Boolean(user);
  loginButton?.classList.toggle("hidden", signedIn);
  profileMenu?.classList.toggle("hidden", !signedIn);
  dashboardLink?.classList.toggle("hidden", !signedIn);
  dashboard?.classList.toggle("hidden", !signedIn);
  dashboardAuthButton?.classList.toggle("hidden", signedIn);

  const displayName = user?.name || user?.email || "Client";
  if (profileInitial) profileInitial.textContent = displayName.charAt(0).toUpperCase();
  if (profileName) profileName.textContent = user ? "Welcome, " + displayName : "Welcome back";
  if (dashboardName) dashboardName.textContent = user?.name || "Not provided";
  if (dashboardEmail) dashboardEmail.textContent = user?.email || "Not signed in";
}

async function refreshReferenceAuthUi(tenantSlug = ""): Promise<void> {
  try {
    const response = await fetch("/api/auth/session", {
      cache: "no-store",
      credentials: "same-origin",
    });
    const payload: unknown = await response.json();
    const user = readSessionUser(payload);
    updateReferenceAuthUi(user);
    if (user && tenantSlug) await loadReferenceDashboardData(tenantSlug);
  } catch {
    updateReferenceAuthUi(null);
  }
}

interface ClientAccountSnapshotPayload {
  readonly profile: {
    readonly name: string | null;
    readonly email: string;
    readonly phone: string | null;
    readonly image: string | null;
  };
  readonly bookings: readonly {
    readonly id: string;
    readonly serviceName: string;
    readonly appointmentDate: string;
    readonly timeLabel: string;
    readonly status: string;
    readonly stylistName: string | null;
    readonly specialRequests: string | null;
  }[];
  readonly reviews: readonly {
    readonly id: string;
    readonly serviceName: string | null;
    readonly rating: number;
    readonly text: string;
    readonly status: string;
    readonly createdAt: string;
  }[];
  readonly favorites: readonly {
    readonly id: string;
    readonly styleName: string;
    readonly imageUrl: string;
    readonly category: string | null;
  }[];
  readonly loginHistory: readonly {
    readonly id: string;
    readonly provider: string;
    readonly status: string;
    readonly riskLevel: string | null;
    readonly userAgent: string | null;
    readonly country: string | null;
    readonly createdAt: string;
  }[];
}

function escapeClientHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setDashboardMessage(message: string, type: "error" | "success"): void {
  const element = document.getElementById("dashboardMessage");
  if (!element) return;
  element.textContent = message;
  element.classList.remove("error", "success");
  if (message) element.classList.add(type);
}

function setDashboardList(
  elementId: string,
  html: string,
  emptyText: string,
): void {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.innerHTML = html || "<li>" + escapeClientHtml(emptyText) + "</li>";
}

function renderReferenceDashboard(snapshot: ClientAccountSnapshotPayload): void {
  const bookingsHtml = snapshot.bookings
    .map((booking) => {
      const status = escapeClientHtml(booking.status);
      return (
        '<li class="dashboard-booking-row">' +
        "<strong>" + escapeClientHtml(booking.serviceName) + "</strong>" +
        "<span>" + escapeClientHtml(booking.appointmentDate) + " at " +
        escapeClientHtml(booking.timeLabel) + "</span>" +
        "<span>Stylist: " +
        escapeClientHtml(booking.stylistName || "Any Available") + "</span>" +
        '<span class="dashboard-booking-status-line">Status: ' + status + "</span>" +
        (booking.specialRequests
          ? "<span>Notes: " + escapeClientHtml(booking.specialRequests) + "</span>"
          : "") +
        "</li>"
      );
    })
    .join("");
  setDashboardList("dashboardBookingsList", bookingsHtml, "No appointments yet.");

  const reviewsHtml = snapshot.reviews
    .map(
      (review) =>
        '<li class="dashboard-review-row">' +
        "<strong>" + escapeClientHtml(review.serviceName || "Salon review") + "</strong>" +
        "<span>" + "★".repeat(Math.max(0, Math.min(5, review.rating))) + "</span>" +
        "<p>" + escapeClientHtml(review.text) + "</p>" +
        "<small>Status: " + escapeClientHtml(review.status) + "</small>" +
        "</li>",
    )
    .join("");
  setDashboardList("dashboardReviewsList", reviewsHtml, "No reviews yet.");

  const favoritesHtml = snapshot.favorites
    .map(
      (favorite) =>
        '<li class="dashboard-favorite-card"><div class="dashboard-favorite-item">' +
        '<div class="dashboard-favorite-media">' +
        '<img src="' + escapeClientHtml(favorite.imageUrl) + '" alt="' +
        escapeClientHtml(favorite.styleName) +
        '" loading="lazy" decoding="async" /></div>' +
        '<div class="dashboard-favorite-content"><strong>' +
        escapeClientHtml(favorite.styleName) +
        "</strong><p>" +
        escapeClientHtml(favorite.category || "Salon style") +
        "</p></div></div></li>",
    )
    .join("");
  setDashboardList("dashboardFavoritesList", favoritesHtml, "No favorite styles yet.");

  const historyHtml = snapshot.loginHistory
    .map(
      (item) =>
        '<li class="dashboard-login-history-row"><strong>' +
        escapeClientHtml(item.provider) +
        "</strong><span>" +
        escapeClientHtml(item.status) +
        " · " +
        escapeClientHtml(item.riskLevel || "standard") +
        "</span><small>" +
        escapeClientHtml(item.country || "Unknown location") +
        "</small></li>",
    )
    .join("");
  setDashboardList("dashboardLoginHistoryList", historyHtml, "No login history yet.");

  const favoriteCount = document.getElementById("dashboardFavoritesCount");
  const historyCount = document.getElementById("dashboardLoginHistoryCount");
  if (favoriteCount) favoriteCount.textContent = String(snapshot.favorites.length);
  if (historyCount) historyCount.textContent = String(snapshot.loginHistory.length);
  setDashboardMessage("", "success");
}

async function loadReferenceDashboardData(tenantSlug: string): Promise<void> {
  try {
    const response = await fetch(
      "/api/account?tenantSlug=" + encodeURIComponent(tenantSlug),
      { cache: "no-store", credentials: "same-origin" },
    );
    if (!response.ok) {
      if (response.status !== 401) {
        setDashboardMessage("Your dashboard data could not be loaded.", "error");
      }
      return;
    }
    const snapshot = (await response.json()) as ClientAccountSnapshotPayload;
    renderReferenceDashboard(snapshot);
  } catch {
    setDashboardMessage("Your dashboard data could not be loaded.", "error");
  }
}
function bindAuthAdapter(tenantSlug = "", turnstileSiteKey = ""): () => void {
  const form = document.getElementById("emailAuthForm");
  const logoutButton = document.getElementById("logoutBtn");
  const guestButton = document.getElementById("continueAsGuestBtn");
  if (!(form instanceof HTMLFormElement)) return () => undefined;

  ensureTurnstile(form, turnstileSiteKey);

  const submit = async (event: Event): Promise<void> => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const emailInput = document.getElementById("authEmail");
    const passwordInput = document.getElementById("authPassword");
    const nameInput = document.getElementById("authName");
    const submitButton = document.getElementById("emailAuthSubmit");
    const nameGroup = document.getElementById("authNameGroup");
    if (
      !(emailInput instanceof HTMLInputElement) ||
      !(passwordInput instanceof HTMLInputElement) ||
      !(submitButton instanceof HTMLButtonElement)
    ) {
      return;
    }

    const isSignup =
      nameGroup instanceof HTMLElement &&
      nameGroup.style.display !== "none" &&
      !nameGroup.classList.contains("hidden");
    submitButton.disabled = true;
    submitButton.setAttribute("aria-busy", "true");
    setAuthMessage("", "success");

    try {
      if (isSignup) {
        const formData = new FormData();
        formData.set("name", nameInput instanceof HTMLInputElement ? nameInput.value : "");
        formData.set("email", emailInput.value);
        formData.set("password", passwordInput.value);
        formData.set("turnstileToken", getTurnstileToken(form));
        const registration = await registerAccount(formData);
        if (!registration.ok) {
          setAuthMessage(registration.message, "error");
          return;
        }
        setAuthMessage(
          "Account created. Verify your email before signing in.",
          "success",
        );
        if (nameGroup) nameGroup.style.display = "none";
        submitButton.textContent = "Log In";
        return;
      }

      const result = await signIn("credentials", {
        email: emailInput.value,
        password: passwordInput.value,
        redirect: false,
      });
      if (result?.error) {
        setAuthMessage(
          "Sign-in failed. Check your details and verify your email.",
          "error",
        );
        return;
      }

      await refreshReferenceAuthUi(tenantSlug);
      document.getElementById("authModal")?.setAttribute("aria-hidden", "true");
      setAuthMessage("", "success");
    } catch {
      setAuthMessage("Authentication is temporarily unavailable. Please try again.", "error");
    } finally {
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");
    }
  };

  const logout = async (event: Event): Promise<void> => {
    event.preventDefault();
    event.stopImmediatePropagation();
    await signOut({ redirect: false });
    updateReferenceAuthUi(null);
  };

  const continueAsGuest = (event: Event): void => {
    event.preventDefault();
    event.stopImmediatePropagation();
    document.getElementById("authModal")?.setAttribute("aria-hidden", "true");
    setAuthMessage("You can continue booking as a guest.", "success");
  };

  form.addEventListener("submit", submit, true);
  logoutButton?.addEventListener("click", logout, true);
  guestButton?.addEventListener("click", continueAsGuest, true);
  void refreshReferenceAuthUi(tenantSlug);

  return () => {
    form.removeEventListener("submit", submit, true);
    logoutButton?.removeEventListener("click", logout, true);
    guestButton?.removeEventListener("click", continueAsGuest, true);
  };
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
    const serviceSelect = document.getElementById("serviceSelect");
    const selectedOption =
      serviceSelect instanceof HTMLSelectElement
        ? serviceSelect.options[serviceSelect.selectedIndex]
        : undefined;
    if (selectedOption?.dataset.orderOnly === "true") {
      openReferenceWhatsAppOrder(
        serviceName,
        selectedOption.textContent?.match(/\(([^)]+)\)/)?.[1] ?? "",
      );
      return;
    }
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
          const removeBooking = bindBookingAdapter(tenantSlug ?? "", turnstileSiteKey ?? "");
          const removeAuth = bindAuthAdapter(
            tenantSlug ?? "",
            turnstileSiteKey ?? "",
          );
          removeBookingAdapter = () => {
            removeBooking();
            removeAuth();
          };
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
