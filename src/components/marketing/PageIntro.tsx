export function PageIntro({
  title,
  lead,
}: {
  title: string;
  lead: string;
}) {
  return (
    <section className="pb-12 pt-[128px] sm:pt-[144px]">
      <div className="mkt-content">
        <h1 className="page-display">{title}</h1>
        <p className="page-lead">{lead}</p>
      </div>
    </section>
  );
}
