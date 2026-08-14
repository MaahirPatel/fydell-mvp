export function PageIntro({
  eyebrow,
  title,
  lead,
}: {
  eyebrow?: string;
  title: string;
  lead: string;
}) {
  return (
    <section className="pb-12 pt-[128px] sm:pt-[144px]">
      <div className="mkt-content">
        {eyebrow ? <p className="section-eyebrow">{eyebrow}</p> : null}
        <h1 className={`page-display ${eyebrow ? "mt-4" : ""}`}>{title}</h1>
        <p className="page-lead">{lead}</p>
      </div>
    </section>
  );
}
