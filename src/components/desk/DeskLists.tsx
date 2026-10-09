import { ButtonLink } from "@/components/ui/Button";
import { Status } from "@/components/ui/report";
import { LocalDate } from "@/components/eng/LocalTime";
import type { DeskInvitation, DeskTask } from "@/lib/desk/data";
import AcceptSimInvitation from "./AcceptSimInvitation";

export function DeskSection({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="grid gap-3">
      <h2 className="flex items-baseline gap-2 text-app-section font-semibold text-[var(--text-primary)]">
        {title}
        {typeof count === "number" ? <span className="text-app-meta font-medium tabular-nums text-[var(--text-tertiary)]">{count}</span> : null}
      </h2>
      {children}
    </section>
  );
}

const LIST = "divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-raised)]";

export function InvitationList({ invitations }: { invitations: DeskInvitation[] }) {
  return (
    <ul className={LIST}>
      {invitations.map((inv) => (
        <li key={inv.key} id={inv.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="text-app-body font-medium text-[var(--text-primary)] [overflow-wrap:anywhere]">{inv.title}</p>
            <p className="text-app-meta text-[var(--text-tertiary)]">
              {[inv.organization, inv.kind === "engineering" ? "Engineering task" : "Simulation", inv.minutes ? `${inv.minutes} minutes` : null].filter(Boolean).join(", ")}
              {". Expires "}
              <LocalDate iso={inv.expiresAt} />
            </p>
          </div>
          {inv.href ? (
            <ButtonLink href={inv.href} variant="primary" size="sm">
              Review invitation
            </ButtonLink>
          ) : (
            <AcceptSimInvitation invitationId={inv.id} />
          )}
        </li>
      ))}
    </ul>
  );
}

export function TaskList({ tasks }: { tasks: DeskTask[] }) {
  return (
    <ul className={LIST}>
      {tasks.map((t) => (
        <li key={t.key} className="grid gap-x-4 gap-y-2 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
          <div className="min-w-0">
            <p className="text-app-body font-medium text-[var(--text-primary)] [overflow-wrap:anywhere]">{t.title}</p>
            <p className="text-app-meta text-[var(--text-tertiary)]">
              {[t.organization, t.kind === "engineering" ? "Engineering task" : "Simulation"].filter(Boolean).join(", ")}
              {t.date ? (
                <>
                  {`. ${t.dateLabel} `}
                  <LocalDate iso={t.date} />
                </>
              ) : null}
            </p>
          </div>
          <Status kind={t.tone} className="justify-self-start">
            {t.status}
          </Status>
          <ButtonLink href={t.href} variant={t.open ? "primary" : "secondary"} size="sm">
            {t.action}
          </ButtonLink>
        </li>
      ))}
    </ul>
  );
}
