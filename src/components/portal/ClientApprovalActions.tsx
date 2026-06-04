"use client";

import { useState } from "react";
import { ClientApprovalState } from "@/lib/types";

type Props = {
  approvalId: string;
  initialState: ClientApprovalState;
};

export function ClientApprovalActions({ approvalId, initialState }: Props) {
  const [state, setState] = useState(initialState);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(nextState: ClientApprovalState) {
    setSaving(true);
    setStatus("");
    const response = await fetch("/api/portal/client", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ approvalId, state: nextState, note })
    });
    const body = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setStatus(body?.error || "Could not save the decision.");
      return;
    }
    setState(nextState);
    setStatus(nextState === "APPROVED" ? "Approved and sent to planner." : "Change request sent to planner.");
  }

  return (
    <div className="portal-decision-box">
      <textarea
        aria-label="Decision note"
        placeholder="Add a short note for the planner"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <div className="row-actions">
        <button className="btn btn-primary" type="button" disabled={saving || state === "APPROVED"} onClick={() => void submit("APPROVED")}>
          Approve
        </button>
        <button className="btn btn-soft" type="button" disabled={saving} onClick={() => void submit("ESCALATION")}>
          Request changes
        </button>
      </div>
      {status ? <p className="note">{status}</p> : null}
    </div>
  );
}
