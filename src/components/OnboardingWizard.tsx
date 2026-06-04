"use client";

import { FormEvent, useMemo, useState } from "react";
import { PlannerProfile, PlannerSettings } from "@/lib/types";

type OnboardingDraft = PlannerProfile & PlannerSettings;

interface OnboardingWizardProps {
  seedProfile: PlannerProfile;
  seedSettings: PlannerSettings;
  onComplete: (payload: { profile: PlannerProfile; settings: PlannerSettings }) => void;
}

const steps = ["Planner profile", "Planning preferences"];

function sanitizeCurrency(value: string) {
  return value.trim().toUpperCase();
}

export default function OnboardingWizard({
  seedProfile,
  seedSettings,
  onComplete
}: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>({
    ...seedProfile,
    ...seedSettings
  });

  const progress = ((step + 1) / steps.length) * 100;

  const currencyHints = useMemo(() => {
    const allCurrencies = [
      seedSettings.baseCurrency,
      seedSettings.bookingCurrency,
      seedSettings.displayCurrency,
      "INR",
      "GBP",
      "MAD",
      "JPY",
      "EUR",
      "USD"
    ]
      .map((value) => sanitizeCurrency(value ?? ""))
      .filter(Boolean);

    return [...new Set(allCurrencies)];
  }, [seedSettings.baseCurrency, seedSettings.bookingCurrency, seedSettings.displayCurrency]);

  function update<K extends keyof OnboardingDraft>(field: K, value: OnboardingDraft[K]) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const profile = {
      name: draft.name,
      email: draft.email,
      businessName: draft.businessName
    };
    const settings: PlannerSettings = {
      baseCurrency: draft.baseCurrency,
      bookingCurrency: draft.bookingCurrency,
      displayCurrency: draft.displayCurrency,
      timezone: draft.timezone,
      locale: draft.locale,
      dateFormat: draft.dateFormat,
      timeFormat: draft.timeFormat,
      distanceUnit: draft.distanceUnit,
      weightUnit: draft.weightUnit,
      taxMode: draft.taxMode,
      taxRatePercent: draft.taxRatePercent,
      defaultLeadTimeDays: draft.defaultLeadTimeDays,
      rsvpReminderOffset: draft.rsvpReminderOffset,
      syncMode: draft.syncMode
    };
    onComplete({ profile, settings });
  }

  return (
    <main className="onboard">
      <section className="onboarding-panel">
        <div className="onboarding-hero">
          <div>
            <p className="kicker">Bliss Planner setup</p>
            <h1>Create your planner workspace</h1>
            <p>Set your business identity, currencies, region, and continuity choices before first launch.</p>
          </div>
          <div className="setup-card">
            <span>Global defaults</span>
            <strong>{draft.displayCurrency} · {draft.timezone}</strong>
            <p>{draft.syncMode.replace("_", " ").toLowerCase()}</p>
          </div>
        </div>

        <div className="progress-steps" role="presentation">
          {steps.map((label, index) => (
            <span key={label} className={`progress-step ${index === step ? "active" : ""}`}>
              {label}
            </span>
          ))}
        </div>

        <div className="progress-track">
          <div style={{ width: `${progress}%` }} />
        </div>

        <form onSubmit={handleSubmit} className="stack">
          {step === 0 && (
            <div className="setup-section-grid">
              <fieldset className="setup-fieldset">
                <legend>Planner identity</legend>
                <div className="grid two">
                  <label>
                    Planner name
                    <input
                      aria-label="Planner Name"
                      data-field="planner-name"
                      value={draft.name}
                      onChange={(e) => update("name", e.target.value)}
                      placeholder="Alex Planner"
                      required
                    />
                  </label>
                  <label>
                    Planner email
                    <input
                      aria-label="Planner Email"
                      data-field="planner-email"
                      value={draft.email}
                      type="email"
                      onChange={(e) => update("email", e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Business / Studio
                    <input
                      aria-label="Business / Studio"
                      data-field="business-studio"
                      value={draft.businessName}
                      onChange={(e) => update("businessName", e.target.value)}
                      required
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset className="setup-fieldset">
                <legend>Money and continuity</legend>
                <div className="grid two">
                  <label>
                    Base currency
                    <input
                      aria-label="Base Currency"
                      data-field="base-currency"
                      value={draft.baseCurrency}
                      list="currencies"
                      onChange={(e) => update("baseCurrency", sanitizeCurrency(e.target.value))}
                      required
                    />
                  </label>
                  <label>
                    Reporting currency
                    <input
                      aria-label="Reporting Currency"
                      data-field="reporting-currency"
                      value={draft.displayCurrency}
                      list="currencies"
                      onChange={(e) => update("displayCurrency", sanitizeCurrency(e.target.value))}
                      required
                    />
                  </label>
                  <label>
                    Booking currency
                    <input
                      aria-label="Booking Currency"
                      data-field="booking-currency"
                      value={draft.bookingCurrency}
                      list="currencies"
                      onChange={(e) => update("bookingCurrency", sanitizeCurrency(e.target.value))}
                      required
                    />
                  </label>
                  <label>
                    Sync data mode
                    <select
                      aria-label="Sync Data Mode"
                      data-field="sync-mode"
                      value={draft.syncMode}
                      onChange={(e) => update("syncMode", e.target.value as PlannerSettings["syncMode"])}
                    >
                      <option value="LOCAL_ONLY">Local only</option>
                      <option value="LOCAL_FIRST">Local-first, opt-in sync</option>
                      <option value="OPT_IN_SYNC">Cloud sync mirror</option>
                    </select>
                  </label>
                  <label>
                    Tax mode
                    <select
                      aria-label="Tax Mode"
                      data-field="tax-mode"
                      value={draft.taxMode}
                      onChange={(e) => update("taxMode", e.target.value as PlannerSettings["taxMode"]) }
                    >
                      <option value="INCLUSIVE">Tax inclusive</option>
                      <option value="EXCLUSIVE">Tax exclusive</option>
                    </select>
                  </label>
                  <label>
                    Tax rate (%)
                    <input
                      aria-label="Tax Rate (%)"
                      data-field="tax-rate"
                      type="number"
                      value={draft.taxRatePercent}
                      min={0}
                      max={99}
                      step={0.1}
                      onChange={(e) => update("taxRatePercent", Number(e.target.value))}
                    />
                  </label>
                </div>
              </fieldset>
            </div>
          )}

          {step === 1 && (
            <div className="setup-section-grid">
              <fieldset className="setup-fieldset">
                <legend>Region and formats</legend>
                <div className="grid two">
                  <label>
                    Timezone
                    <input
                      aria-label="Timezone"
                      data-field="timezone"
                      value={draft.timezone}
                      onChange={(e) => update("timezone", e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Locale
                    <input
                      aria-label="Locale"
                      data-field="locale"
                      value={draft.locale}
                      onChange={(e) => update("locale", e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Date format
                    <input
                      aria-label="Date Format"
                      data-field="date-format"
                      value={draft.dateFormat}
                      onChange={(e) => update("dateFormat", e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Time format
                    <select
                      aria-label="Time Format"
                      data-field="time-format"
                      value={draft.timeFormat}
                      onChange={(e) => update("timeFormat", e.target.value as "12h" | "24h")}
                    >
                      <option value="24h">24-hour</option>
                      <option value="12h">12-hour</option>
                    </select>
                  </label>
                </div>
              </fieldset>

              <fieldset className="setup-fieldset">
                <legend>Operations defaults</legend>
                <div className="grid two">
                  <label>
                    Distance unit
                    <select
                      aria-label="Distance Unit"
                      data-field="distance-unit"
                      value={draft.distanceUnit}
                      onChange={(e) => update("distanceUnit", e.target.value as PlannerSettings["distanceUnit"]) }
                    >
                      <option value="km">kilometres</option>
                      <option value="mi">miles</option>
                    </select>
                  </label>
                  <label>
                    Weight unit
                    <select
                      aria-label="Weight Unit"
                      data-field="weight-unit"
                      value={draft.weightUnit}
                      onChange={(e) => update("weightUnit", e.target.value as PlannerSettings["weightUnit"]) }
                    >
                      <option value="kg">kilograms</option>
                      <option value="lb">pounds</option>
                    </select>
                  </label>
                  <label>
                    RSVP reminder offset (days)
                    <input
                      aria-label="RSVP reminder offset (days)"
                      data-field="rsvp-reminder-offset"
                      type="number"
                      min={1}
                      max={30}
                      value={draft.rsvpReminderOffset}
                      onChange={(e) => update("rsvpReminderOffset", Number(e.target.value))}
                    />
                  </label>
                  <label>
                    Default lead-time (days)
                    <input
                      aria-label="Default lead-time (days)"
                      data-field="default-lead-time"
                      type="number"
                      min={3}
                      max={45}
                      value={draft.defaultLeadTimeDays}
                      onChange={(e) => update("defaultLeadTimeDays", Number(e.target.value))}
                    />
                  </label>
                </div>
              </fieldset>
            </div>
          )}

          <datalist id="currencies">
            {currencyHints.map((c, index) => (
              <option key={`${c}-${index}`} value={c} />
            ))}
          </datalist>

          <div className="row-actions">
            {step > 0 ? (
              <button type="button" onClick={() => setStep(0)}>
                Back
              </button>
            ) : null}
            {step < 1 && (
              <button type="button" className="btn btn-primary" onClick={() => setStep(1)}>
                Continue
              </button>
            )}
            {step === 1 && (
              <button type="submit" className="btn btn-primary">
                Create Planner Workspace
              </button>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}
