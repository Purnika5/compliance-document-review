/**
 * DOCU: Institutional Multi-Series Compliance Velocity & Turnaround Line Chart.
 * Displays interactive multi-line curves for Submissions, Pending, Revisions, and Approvals,
 * with real time-series date points, gridlines, axis labels, and hover crosshair tooltips.
 * Dynamically reacts to selected date filter presets and calendar days.
 * Last Updated Date: September 20, 2026
 * @author Keith
 */
"use client";

import React, { useState, useId } from "react";
import { cn } from "@/lib/utils";
import type { MetricTrendData } from "../utils/metric-trend.util";
import { Calendar, TrendingUp } from "lucide-react";

export interface ComplianceTrendChartProps {
  trendData: MetricTrendData;
  activePresetTitle: string;
  className?: string;
}

export function ComplianceTrendChart({
  trendData,
  activePresetTitle,
  className,
}: ComplianceTrendChartProps) {
  const reactId = useId().replace(/:/g, "_");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Series visibility toggles
  const [visibleSeries, setVisibleSeries] = useState({
    total: true,
    pending: true,
    needsRevision: true,
    approved: true,
  });

  const toggleSeries = (series: keyof typeof visibleSeries) => {
    setVisibleSeries((prev) => ({ ...prev, [series]: !prev[series] }));
  };

  const { labels, total, pending, needsRevision, approved } = trendData;

  // Layout dimensions
  const width = 800;
  const height = 240;
  const padLeft = 45;
  const padRight = 25;
  const padTop = 20;
  const padBottom = 40;

  const usableWidth = width - padLeft - padRight;
  const usableHeight = height - padTop - padBottom;

  // Determine max value across all visible series
  const allValues: number[] = [];
  if (visibleSeries.total) allValues.push(...total);
  if (visibleSeries.pending) allValues.push(...pending);
  if (visibleSeries.needsRevision) allValues.push(...needsRevision);
  if (visibleSeries.approved) allValues.push(...approved);

  const rawMax = allValues.length ? Math.max(...allValues) : 5;
  const maxVal = Math.max(rawMax, 4);
  const minVal = 0;

  // Y-axis grid ticks (4 intervals)
  const yTicks = [0, Math.ceil(maxVal * 0.33), Math.ceil(maxVal * 0.66), maxVal];

  interface LinePathResult {
    path: string;
    points: { x: number; y: number; val: number }[];
  }

  // Helper to construct spline path
  const constructLinePath = (dataArr: number[]): LinePathResult => {
    if (!dataArr.length) return { path: "", points: [] };
    const points = dataArr.map((val, idx) => {
      const x = padLeft + (idx / (dataArr.length - 1)) * usableWidth;
      const norm = maxVal === minVal ? 0 : (val - minVal) / (maxVal - minVal);
      const y = padTop + usableHeight - norm * usableHeight;
      return { x, y, val };
    });

    let path = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) * 0.42;
      const cp1y = p0.y;
      const cp2x = p1.x - (p1.x - p0.x) * 0.42;
      const cp2y = p1.y;
      path += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
    }
    return { path, points };
  };

  const totalPath = constructLinePath(total);
  const pendingPath = constructLinePath(pending);
  const revisionPath = constructLinePath(needsRevision);
  const approvedPath = constructLinePath(approved);

  const seriesMeta = [
    {
      key: "total" as const,
      label: "Total Submissions",
      color: "#0284c7",
      fillOpacity: "0.08",
      data: total,
      pathObj: totalPath,
    },
    {
      key: "pending" as const,
      label: "Pending Evaluation",
      color: "#d97706",
      fillOpacity: "0.05",
      data: pending,
      pathObj: pendingPath,
    },
    {
      key: "needsRevision" as const,
      label: "Action Required (Revisions)",
      color: "#ea580c",
      fillOpacity: "0.05",
      data: needsRevision,
      pathObj: revisionPath,
    },
    {
      key: "approved" as const,
      label: "Approved & Verified",
      color: "#16a34a",
      fillOpacity: "0.05",
      data: approved,
      pathObj: approvedPath,
    },
  ];

  return (
    <div
      className={cn(
        "bg-[#FAFBFB] rounded-2xl p-4 sm:p-5 border border-[#E6E8E7] flex flex-col gap-4",
        className
      )}
    >
      {/* Chart Sub-header and interactive series legend */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E6E8E7] pb-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-[#C5E86C]/30 text-[#183028] flex items-center justify-center font-bold">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#183028] tracking-tight">
              Compliance Filing &amp; Review Velocity Timeline
            </h4>
            <p className="text-[11px] text-[#183028]/60">
              Active Date Range: <span className="font-semibold text-[#183028]">{activePresetTitle}</span>
            </p>
          </div>
        </div>

        {/* Legend Chips (clickable to toggle line visibility) */}
        <div className="flex items-center gap-2 flex-wrap">
          {seriesMeta.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => toggleSeries(s.key)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border",
                visibleSeries[s.key]
                  ? "bg-white border-[#E6E8E7] shadow-2xs text-[#183028]"
                  : "bg-transparent border-transparent text-[#183028]/40 line-through"
              )}
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: visibleSeries[s.key] ? s.color : "#9ca3af" }}
              />
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* SVG Canvas */}
      <div
        className="w-full relative select-none"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
        >
          <defs>
            {seriesMeta.map((s) => (
              <linearGradient
                key={`grad-${s.key}-${reactId}`}
                id={`grad-${s.key}-${reactId}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={s.color} stopOpacity={s.fillOpacity} />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {/* Horizontal Gridlines & Y-Axis Labels */}
          {yTicks.map((tickVal, i) => {
            const norm = maxVal === minVal ? 0 : (tickVal - minVal) / (maxVal - minVal);
            const y = padTop + usableHeight - norm * usableHeight;
            return (
              <g key={`ytick-${i}`}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#E6E8E7"
                  strokeWidth="1"
                  strokeDasharray={i === 0 ? "none" : "3 3"}
                />
                <text
                  x={padLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="text-[10px] font-mono fill-[#183028]/50"
                >
                  {tickVal}
                </text>
              </g>
            );
          })}

          {/* X-Axis Labels & Vertical Ticks */}
          {labels.map((label, idx) => {
            const x = padLeft + (idx / (labels.length - 1)) * usableWidth;
            return (
              <g key={`xlabel-${idx}`}>
                <text
                  x={x}
                  y={height - padBottom + 18}
                  textAnchor="middle"
                  className={cn(
                    "text-[10px] font-medium fill-[#183028]/60 transition-colors",
                    hoveredIdx === idx && "fill-[#183028] font-bold"
                  )}
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Vertical Hover Crosshair Line */}
          {hoveredIdx !== null && (
            <line
              x1={padLeft + (hoveredIdx / (labels.length - 1)) * usableWidth}
              y1={padTop}
              x2={padLeft + (hoveredIdx / (labels.length - 1)) * usableWidth}
              y2={height - padBottom}
              stroke="#183028"
              strokeOpacity="0.25"
              strokeWidth="1.2"
              strokeDasharray="2 2"
            />
          )}

          {/* Render Active Series Lines and Shaded Areas */}
          {seriesMeta.map((s) => {
            if (!visibleSeries[s.key] || !s.pathObj) return null;
            const { path, points } = s.pathObj;
            const firstP = points[0];
            const lastP = points[points.length - 1];
            const areaD = `${path} L ${lastP.x.toFixed(1)},${height - padBottom} L ${firstP.x.toFixed(1)},${height - padBottom} Z`;

            return (
              <g key={`series-render-${s.key}`}>
                {/* Area Fill */}
                <path d={areaD} fill={`url(#grad-${s.key}-${reactId})`} />

                {/* Line Path */}
                <path
                  d={path}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />

                {/* Vertex Dots */}
                {points.map((p, idx) => (
                  <circle
                    key={`dot-${s.key}-${idx}`}
                    cx={p.x}
                    cy={p.y}
                    r={hoveredIdx === idx ? 4.5 : 2.5}
                    fill={hoveredIdx === idx ? "#FFFFFF" : s.color}
                    stroke={s.color}
                    strokeWidth={hoveredIdx === idx ? 2.5 : 1}
                    className="transition-all duration-150"
                  />
                ))}
              </g>
            );
          })}

          {/* Interactive Hover Columns (Hitboxes) */}
          {labels.map((_, idx) => {
            const colWidth = usableWidth / (labels.length - 1);
            const x = idx === 0 ? padLeft - colWidth / 2 : padLeft + idx * colWidth - colWidth / 2;
            return (
              <rect
                key={`col-${idx}`}
                x={x}
                y={padTop}
                width={colWidth}
                height={usableHeight}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoveredIdx(idx)}
              />
            );
          })}
        </svg>

        {/* Hover Tooltip Popup */}
        {hoveredIdx !== null && (
          <div
            className="absolute z-40 pointer-events-none p-2.5 rounded-xl bg-[#183028] text-white shadow-xl border border-white/10 text-xs flex flex-col gap-1.5 transition-all transform -translate-x-1/2 -top-4"
            style={{
              left: `${(((padLeft + (hoveredIdx / (labels.length - 1)) * usableWidth) / width) * 100).toFixed(1)}%`,
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/15 pb-1 font-mono text-[10px] text-white/70">
              <span>{labels[hoveredIdx]}</span>
              <span>Checkpoint #{hoveredIdx + 1}</span>
            </div>
            <div className="space-y-1 text-[11px]">
              {seriesMeta.map((s) => (
                <div key={`tooltip-${s.key}`} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-white/80">{s.label}:</span>
                  </div>
                  <span className="font-bold font-mono">{s.data[hoveredIdx]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
