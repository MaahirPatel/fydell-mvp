"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface Props {
  options: { id: string; name: string }[];
  current: string | null;
}

export default function CompareSelect({ options, current }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function onSelect(value: string) {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set("compare", value);
    else sp.delete("compare");
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <select
      value={current ?? ""}
      onChange={(e) => onSelect(e.target.value)}
      className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-navy outline-none transition-colors focus:border-blue"
    >
      <option value="">Compare with...</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}
