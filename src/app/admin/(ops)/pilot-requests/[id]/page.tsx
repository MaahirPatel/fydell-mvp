import Link from "next/link";
import { notFound } from "next/navigation";
import { getPilotRequest } from "@/lib/ops/pilot-requests";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import PilotRequestActions from "@/components/admin/PilotRequestActions";

export const dynamic = "force-dynamic";

export default async function AdminPilotRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getPilotRequest(id);
  if (!row) notFound();

  let events: Array<{
    id: string;
    event_type: string;
    description: string | null;
    created_at: string;
    old_status: string | null;
    new_status: string | null;
  }> = [];
  let notes: Array<{
    id: string;
    body: string;
    author_email: string | null;
    created_at: string;
  }> = [];
  let emails: Array<{
    id: string;
    template_key: string;
    recipient_email: string;
    status: string;
    last_error: string | null;
    sent_at: string | null;
    created_at: string;
  }> = [];

  if (isSupabaseConfigured() && "id" in row) {
    const admin = getSupabaseAdmin();
    const [{ data: ev }, { data: nt }, { data: em }] = await Promise.all([
      admin
        .from("pilot_request_events")
        .select("id, event_type, description, created_at, old_status, new_status")
        .eq("pilot_request_id", id)
        .order("created_at", { ascending: false }),
      admin
        .from("pilot_request_notes")
        .select("id, body, author_email, created_at")
        .eq("pilot_request_id", id)
        .order("created_at", { ascending: false }),
      admin
        .from("email_outbox")
        .select("id, template_key, recipient_email, status, last_error, sent_at, created_at")
        .eq("related_entity_id", id)
        .order("created_at", { ascending: false }),
    ]);
    events = ev || [];
    notes = nt || [];
    emails = em || [];
  }

  const r = row as Record<string, unknown>;

  return (
    <div>
      <Link
        href="/admin/pilot-requests"
        className="text-[13px] text-[rgba(244,245,247,0.62)] hover:text-[#F4F5F7]"
      >
        ← All requests
      </Link>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[12px] tabular-nums text-[rgba(244,245,247,0.4)]">
            {String(r.public_reference || "")}
          </p>
          <h1 className="mt-1 text-[28px]" style={{ fontWeight: 540, letterSpacing: "-0.035em" }}>
            {String(r.company_name || r.company || "")}
          </h1>
          <p className="mt-2 text-[14px] text-[rgba(244,245,247,0.62)]">
            {String(r.full_name || r.name || "")} · {String(r.work_email || r.email || "")}
          </p>
        </div>
        <div className="rounded-[8px] border border-[rgba(255,255,255,0.1)] px-3 py-2 text-[13px] capitalize">
          {String(r.status || "new")}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-[14px] border border-[rgba(255,255,255,0.095)] p-5">
          <h2 className="text-[13px] uppercase tracking-[0.05em] text-[rgba(244,245,247,0.4)]">
            Hiring request
          </h2>
          <dl className="mt-4 space-y-3 text-[14px]">
            <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-2">
              <dt className="text-[rgba(244,245,247,0.4)]">Role</dt>
              <dd>{String(r.role_being_hired || r.role_title || "")}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-2">
              <dt className="text-[rgba(244,245,247,0.4)]">Candidates</dt>
              <dd>{String(r.number_of_candidates || r.candidate_volume || "—")}</dd>
            </div>
            <div className="border-b border-white/[0.05] pb-2">
              <dt className="text-[rgba(244,245,247,0.4)]">Message</dt>
              <dd className="mt-1 text-[rgba(244,245,247,0.72)]">
                {String(r.message || r.note || "—")}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[rgba(244,245,247,0.4)]">Submitted</dt>
              <dd className="tabular-nums">{new Date(String(r.created_at)).toLocaleString()}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-[14px] border border-[rgba(255,255,255,0.095)] p-5">
          <h2 className="text-[13px] uppercase tracking-[0.05em] text-[rgba(244,245,247,0.4)]">
            Actions
          </h2>
          <div className="mt-4">
            <PilotRequestActions
              id={id}
              currentStatus={String(r.status || "new")}
              convertedOrganizationId={
                typeof r.converted_organization_id === "string"
                  ? r.converted_organization_id
                  : null
              }
            />
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-[14px] border border-[rgba(255,255,255,0.095)] p-5">
        <h2 className="text-[13px] uppercase tracking-[0.05em] text-[rgba(244,245,247,0.4)]">
          Email delivery
        </h2>
        <div className="mt-4 space-y-3">
          {emails.length === 0 ? (
            <p className="text-[13px] text-[rgba(244,245,247,0.5)]">No email outbox rows yet.</p>
          ) : (
            emails.map((email) => (
              <div
                key={email.id}
                className="flex flex-wrap items-start justify-between gap-2 border-b border-white/[0.05] pb-3 text-[13px]"
              >
                <div>
                  <p style={{ fontWeight: 520 }}>{email.template_key}</p>
                  <p className="text-[rgba(244,245,247,0.5)]">{email.recipient_email}</p>
                  {email.last_error ? (
                    <p className="mt-1 text-[#F26B82]">{email.last_error}</p>
                  ) : null}
                </div>
                <p className="capitalize text-[rgba(244,245,247,0.62)]">{email.status}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-6 rounded-[14px] border border-[rgba(255,255,255,0.095)] p-5">
        <h2 className="text-[13px] uppercase tracking-[0.05em] text-[rgba(244,245,247,0.4)]">
          Timeline
        </h2>
        <ol className="mt-4 space-y-3">
          {events.length === 0 ? (
            <li className="text-[13px] text-[rgba(244,245,247,0.5)]">No events yet.</li>
          ) : (
            events.map((event) => (
              <li key={event.id} className="border-b border-white/[0.05] pb-3 text-[13px]">
                <p style={{ fontWeight: 520 }}>{event.event_type}</p>
                <p className="text-[rgba(244,245,247,0.62)]">
                  {event.description || `${event.old_status || ""} → ${event.new_status || ""}`}
                </p>
                <p className="mt-1 tabular-nums text-[12px] text-[rgba(244,245,247,0.4)]">
                  {new Date(event.created_at).toLocaleString()}
                </p>
              </li>
            ))
          )}
        </ol>
      </section>

      <section className="mt-6 rounded-[14px] border border-[rgba(255,255,255,0.095)] p-5">
        <h2 className="text-[13px] uppercase tracking-[0.05em] text-[rgba(244,245,247,0.4)]">
          Internal notes
        </h2>
        <div className="mt-4 space-y-3">
          {notes.length === 0 ? (
            <p className="text-[13px] text-[rgba(244,245,247,0.5)]">No notes yet.</p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="border-b border-white/[0.05] pb-3 text-[13px]">
                <p className="text-[rgba(244,245,247,0.72)]">{note.body}</p>
                <p className="mt-1 text-[12px] text-[rgba(244,245,247,0.4)]">
                  {note.author_email || "admin"} · {new Date(note.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
