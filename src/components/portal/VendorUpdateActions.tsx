"use client";

import { useState } from "react";

type Props = {
  vendorId?: string;
};

export function VendorUpdateActions({ vendorId }: Props) {
  const [updateType, setUpdateType] = useState("Scope confirmation");
  const [message, setMessage] = useState("We are ready to confirm the current scope once guest counts are locked.");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!vendorId) {
      setStatus("No vendor record is available for this portal user.");
      return;
    }
    setSaving(true);
    setStatus("");
    const response = await fetch("/api/portal/vendor", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        vendorId,
        update: {
          type: updateType,
          message
        }
      })
    });
    const body = await response.json().catch(() => ({}));
    setSaving(false);
    setStatus(response.ok ? "Vendor update submitted to the planner." : body?.error || "Could not submit the update.");
  }

  return (
    <form className="portal-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <label>
        Update type
        <select value={updateType} onChange={(event) => setUpdateType(event.target.value)}>
          <option value="Scope confirmation">Scope confirmation</option>
          <option value="Quote or payment update">Quote or payment update</option>
          <option value="Risk or blocker">Risk or blocker</option>
        </select>
      </label>
      <label>
        Message to planner
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} />
      </label>
      <button className="btn btn-primary" type="submit" disabled={saving}>
        Submit vendor update
      </button>
      {status ? <p className="note">{status}</p> : null}
    </form>
  );
}
