import React from "react";
import { formatBytes } from "../lib/utils";

const DEFAULT_WINDOW = 60;

export interface BandwidthSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  strokeColor?: string;
  fillStartColor?: string;
  fillEndColor?: string;
  labelSuffix?: string;
  maxWindow?: number;
}

export const BandwidthSparkline: React.FC<BandwidthSparklineProps> = ({
  data,
  width = 140,
  height = 38,
  strokeColor = "#059669",
  fillStartColor = "rgba(16,185,129,0.45)",
  fillEndColor = "rgba(16,185,129,0.02)",
  labelSuffix = "/s",
  maxWindow = DEFAULT_WINDOW,
}) => {
  const series = (data || []).slice(-maxWindow);
  while (series.length < maxWindow) series.unshift(0);
  const len = series.length;
  const last = series[len - 1] ?? 0;
  const max = Math.max(1, ...series);

  const padY = 2;
  const innerW = Math.max(1, width - 2);
  const innerH = Math.max(4, height - padY * 2);

  const points = series.map((v, i) => {
    const x = (i / Math.max(1, len - 1)) * innerW;
    const y = innerH + padY - (v / max) * innerH;
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L ${innerW.toFixed(2)} ${(innerH + padY).toFixed(2)} L 0 ${(innerH + padY).toFixed(2)} Z`;
  const id = React.useId();

  return (
    <div className="flex flex-col gap-1" style={{ width }}>
      <div className="flex items-center justify-between text-[10px] font-mono">
        <span className="text-slate-500 dark:text-slate-400">60s history</span>
        <span className="font-semibold text-slate-800 dark:text-slate-100">{formatBytes(last)}{labelSuffix}</span>
      </div>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Bandwidth sparkline last ${len} seconds, current ${formatBytes(last)} per second`}>
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillStartColor} />
            <stop offset="100%" stopColor={fillEndColor} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${id}-fill)`} />
        <path d={linePath} fill="none" stroke={strokeColor} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        {points.length > 0 && (
          <circle cx={points[len - 1].x} cy={points[len - 1].y} r={2} fill={strokeColor} />
        )}
      </svg>
    </div>
  );
};

export default BandwidthSparkline;
