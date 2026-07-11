import Link from "next/link";

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1
          className="text-[28px] text-[#F4F5F7] sm:text-[32px]"
          style={{ fontWeight: 560, letterSpacing: "-0.038em" }}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-[56ch] text-[14px] leading-relaxed text-white/60">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function AdminMetricCard({
  label,
  value,
  href,
  hint,
}: {
  label: string;
  value: number | string;
  href: string;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[14px] border border-white/[0.1] bg-gradient-to-b from-[#0E1118] to-[#0A0C11] px-4 py-4 transition-[border-color,transform,background] duration-150 hover:-translate-y-px hover:border-white/22"
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/55">
        {label}
      </p>
      <p
        className="mt-2.5 text-[34px] leading-none tabular-nums text-white"
        style={{ fontWeight: 560, letterSpacing: "-0.04em" }}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-2 text-[12px] text-white/40 transition-colors group-hover:text-white/55">
          {hint}
        </p>
      ) : null}
    </Link>
  );
}

export function AdminPanel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[16px] border border-white/[0.1] bg-[#0A0C11] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/55">
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function AdminEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] border border-dashed border-white/12 bg-white/[0.015] px-4 py-10 text-center text-[13px] leading-relaxed text-white/55">
      {children}
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  new: "bg-[#3B5BFF]/15 text-[#A8B4FF] ring-[#3B5BFF]/25",
  reviewing: "bg-[#8B5CF6]/15 text-[#C4B5FD] ring-[#8B5CF6]/25",
  contacted: "bg-[#06B6D4]/15 text-[#67E8F9] ring-[#06B6D4]/25",
  qualified: "bg-[#06B6D4]/15 text-[#67E8F9] ring-[#06B6D4]/25",
  approved: "bg-[#10B981]/15 text-[#6EE7B7] ring-[#10B981]/25",
  needs_information: "bg-[#F59E0B]/15 text-[#FCD34D] ring-[#F59E0B]/25",
  rejected: "bg-[#F43F5E]/15 text-[#FDA4AF] ring-[#F43F5E]/25",
  archived: "bg-white/5 text-white/50 ring-white/10",
  pending: "bg-[#F59E0B]/15 text-[#FCD34D] ring-[#F59E0B]/25",
  sent: "bg-[#10B981]/15 text-[#6EE7B7] ring-[#10B981]/25",
  failed: "bg-[#F43F5E]/15 text-[#FDA4AF] ring-[#F43F5E]/25",
  bounced: "bg-[#F43F5E]/15 text-[#FDA4AF] ring-[#F43F5E]/25",
};

export function AdminStatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] || "bg-white/5 text-white/65 ring-white/10";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ring-1 ring-inset ${tone}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function AdminPrimaryButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C] transition-[filter,transform] hover:-translate-y-px hover:brightness-[0.97]"
    >
      {children}
    </Link>
  );
}

export function AdminTextLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="text-[12px] text-white/65 transition-colors hover:text-white">
      {children}
    </Link>
  );
}
