"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { PERFORMANCE_TREND } from "@/lib/site-data";

export default function HiringSignalChart() {
  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={PERFORMANCE_TREND} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(124,92,255,0.45)" />
              <stop offset="100%" stopColor="rgba(124,92,255,0)" />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "rgba(148,163,184,0.6)", fontSize: 10 }}
          />
          <YAxis
            domain={[60, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "rgba(148,163,184,0.5)", fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              background: "#0b1020",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              fontSize: 11
            }}
          />
          <Area type="monotone" dataKey="score" stroke="#7c5cff" strokeWidth={2} fill="url(#scoreGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
