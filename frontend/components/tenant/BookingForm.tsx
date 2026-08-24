"use client";

import { FormEvent, useMemo, useState } from "react";

import type { TenantService } from "@shared/types/tenant";

import { TurnstileWidget } from "@/components/shared/TurnstileWidget";

interface BookingFormProps {
  readonly tenantSlug: string;
  readonly services: readonly TenantService[];
}

const TIME_OPTIONS = ["09:00", "10:30", "12:00", "13:30", "15:00", "16:30"] as const;

export function BookingForm({ tenantSlug, services }: BookingFormProps) {
  const [turnstileToken, setTurnstileToken] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState(false);
  const minDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const bookableServices = services.filter((service) => !service.isCosmeticProduct);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSuccessful(false);
    if (!turnstileToken) {
      setMessage("Complete the security verification before booking.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const selectedService = bookableServices.find((service) => (service.id ?? service.name) === form.get("serviceKey"));
    if (!selectedService) {
      setMessage("Choose an available service.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenantSlug,
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          email: form.get("email"),
          phone: form.get("phone"),
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          appointmentDate: form.get("appointmentDate"),
          timeLabel: form.get("timeLabel"),
          specialRequests: form.get("specialRequests") || undefined,
          turnstileToken,
        }),
      });
      const result: unknown = await response.json();
      const errorMessage = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string" ? result.error : "The booking could not be created.";
      if (!response.ok) {
        setMessage(errorMessage);
        return;
      }
      setIsSuccessful(true);
      setMessage("Your booking request was received. We will confirm the slot shortly.");
      event.currentTarget.reset();
      setTurnstileToken("");
    } catch {
      setMessage("We could not reach the booking service. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="booking-form" onSubmit={handleSubmit}>
      <div className="booking-form__grid">
        <label>First name<input name="firstName" required maxLength={80} autoComplete="given-name" /></label>
        <label>Last name<input name="lastName" required maxLength={80} autoComplete="family-name" /></label>
        <label>Email<input name="email" type="email" required maxLength={320} autoComplete="email" /></label>
        <label>Phone<input name="phone" type="tel" required maxLength={32} autoComplete="tel" /></label>
        <label>Service<select name="serviceKey" required defaultValue=""><option value="" disabled>Select a service</option>{bookableServices.map((service) => <option key={service.id ?? service.name} value={service.id ?? service.name}>{service.name} · {service.priceLabel}</option>)}</select></label>
        <label>Date<input name="appointmentDate" type="date" required min={minDate} /></label>
        <label>Preferred time<select name="timeLabel" required defaultValue=""><option value="" disabled>Select a time</option>{TIME_OPTIONS.map((time) => <option key={time} value={time}>{time}</option>)}</select></label>
        <label className="booking-form__wide">Special requests<textarea name="specialRequests" rows={3} maxLength={2000} placeholder="Anything your stylist should know?" /></label>
      </div>
      <TurnstileWidget onToken={setTurnstileToken} />
      <button className="button button--primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Sending request…" : "Request appointment"}</button>
      {message && <p className={`form-message ${isSuccessful ? "form-message--success" : ""}`} role={isSuccessful ? "status" : "alert"}>{message}</p>}
    </form>
  );
}
