import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export default function GraphWidget({
  className = "",
  ringHeight = 176,
  sparkHeight = 176,
}) {
  const [range, setRange] = useState("7d");

  const dataByRange = useMemo(
    () => ({
      today: {
        minutes: 186,
        goal: 240,
        change: 12.4,
        line: [
          { name: "8 AM", value: 5 },
          { name: "9 AM", value: 8 },
          { name: "10 AM", value: 12 },
          { name: "11 AM", value: 10 },
          { name: "12 PM", value: 4 },
          { name: "1 PM", value: 16 },
          { name: "2 PM", value: 20 },
          { name: "3 PM", value: 14 },
        ],
      },
      "7d": {
        minutes: 665,
        goal: 840,
        change: 8.1,
        line: [
          { name: "Mon", value: 90 },
          { name: "Tue", value: 75 },
          { name: "Wed", value: 110 },
          { name: "Thu", value: 82 },
          { name: "Fri", value: 96 },
          { name: "Sat", value: 140 },
          { name: "Sun", value: 72 },
        ],
      },
      "30d": {
        minutes: 2580,
        goal: 3600,
        change: 5.6,
        line: Array.from({ length: 30 }, (_, i) => ({
          name: `D${i + 1}`,
          value: Math.round(60 + Math.random() * 40),
        })),
      },
    }),
    []
  );

  const { minutes, goal, change, line } = dataByRange[range];
  const progress = Math.min(100, Math.round((minutes / goal) * 100));
  const radialData = [{ name: "Progress", value: progress }];

  const ranges = [
    { key: "today", label: "Today" },
    { key: "7d", label: "7D" },
    { key: "30d", label: "30D" },
  ];

  const formatMinutes = (min) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h ? `${h}h ${m}m` : `${m}m`;
  };
  const formatCompact = (n) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;

  return (
    <div
      className={`w-full min-w-0 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-white">
            Learning Progress ( Comming soon )
          </h2>
          <p className="text-xs text-zinc-300/80">
            Track study time{" "}
            {range === "today"
              ? "today"
              : range === "7d"
              ? "this week"
              : "this month"}
          </p>
        </div>
        <div className="flex items-center rounded-full bg-white/10 p-1">
          {ranges.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-2.5 py-1 text-xs rounded-full transition ${
                range === r.key
                  ? "bg-black/40 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                  : "text-zinc-300 hover:text-white"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Radial clock ring */}
        <div className="relative" style={{ height: ringHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="72%"
              outerRadius="90%"
              startAngle={90}
              endAngle={-270}
              data={radialData}
            >
              <defs>
                <linearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#F43F5E" />
                  <stop offset="100%" stopColor="#EF4444" />
                </linearGradient>
              </defs>
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar
                dataKey="value"
                background
                fill="url(#ringGradient)"
                cornerRadius={16}
              />
            </RadialBarChart>
          </ResponsiveContainer>

          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-2xl font-bold text-white">
              {formatMinutes(minutes)}
            </div>
            <div className="text-xs text-zinc-300">
              of {formatMinutes(goal)} goal
            </div>
            <div
              className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${
                change >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              <span>{change >= 0 ? "▲" : "▼"}</span>
              <span>{Math.abs(change).toFixed(1)}%</span>
              <span className="text-zinc-400">vs prev</span>
            </div>
          </div>
        </div>

        {/* Trend sparkline */}
        <div className="min-w-0" style={{ height: sparkHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={line}
              margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#F43F5E" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#F43F5E" />
                  <stop offset="100%" stopColor="#EF4444" />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.07)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#D4D4D8", fontSize: 12 }}
                height={20}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(17,24,39,0.95)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 10,
                  color: "white",
                  padding: "8px 10px",
                }}
                labelStyle={{ color: "#9CA3AF" }}
                formatter={(value) => [`${value} min`, "Time"]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="none"
                fill="url(#areaGradient)"
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="url(#lineGradient)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom stats */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-white/10 p-3 bg-white/5">
          <div className="text-[11px] text-zinc-300">Goal</div>
          <div className="text-sm font-semibold text-white">
            {formatMinutes(goal)}
          </div>
        </div>
        <div className="rounded-lg border border-white/10 p-3 bg-white/5">
          <div className="text-[11px] text-zinc-300">Progress</div>
          <div className="text-sm font-semibold text-white">{progress}%</div>
        </div>
        <div className="rounded-lg border border-white/10 p-3 bg-white/5">
          <div className="text-[11px] text-zinc-300">Total</div>
          <div className="text-sm font-semibold text-white">
            {formatCompact(minutes)} min
          </div>
        </div>
      </div>
    </div>
  );
}
