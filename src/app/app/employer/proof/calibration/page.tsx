"use client";

import { useEffect, useState } from "react";

export default function CalibrationPage() {
  const [form, setForm] = useState({
    common_tasks: "",
    stakeholders: "",
    expensive_mistakes: "",
    top_performer: "",
    work_environment: "",
  });
  const [saved, setSaved] = useState("");
  useEffect(() => {
    void fetch("/api/proof/calibration")
      .then((r) => r.json())
      .then((json: { calibration?: Record<string, string> }) => {
        if (json.calibration) {
          setForm({
            common_tasks: json.calibration.common_tasks || "",
            stakeholders: json.calibration.stakeholders || "",
            expensive_mistakes: json.calibration.expensive_mistakes || "",
            top_performer: json.calibration.top_performer || "",
            work_environment: json.calibration.work_environment || "",
          });
        }
      });
  }, []);
  return (
    <form
      className="mx-auto max-w-[640px] space-y-4 px-6 py-10"
      onSubmit={(e) => {
        e.preventDefault();
        void fetch("/api/proof/calibration", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(form),
        }).then(() => setSaved("Calibration saved. Founder still approves publication."));
      }}
    >
      <h1 className="text-app-page">Role calibration</h1>
      <p className="text-[14px] text-[var(--text-secondary)]">Observable job behavior, not culture scores.</p>
      {(Object.keys(form) as Array<keyof typeof form>).map((key) => (
        <label key={key} className="block">
          <span className="text-[13px] font-medium text-[var(--text-secondary)]">{key.replaceAll("_", " ")}</span>
          <textarea className="mt-1 w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-panel)] p-2" rows={3} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
        </label>
      ))}
      <button type="submit" className="rounded-full bg-[var(--surface-paper)] px-4 py-2 text-[13px] text-[#111]">Save</button>
      {saved ? <p className="text-[13px] text-[var(--text-secondary)]">{saved}</p> : null}
    </form>
  );
}
