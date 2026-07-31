interface BarChartProps {
  data: { label: string; value: number; max: number; color: string }[];
  height?: number;
}

export default function BarChart({ data, height = 180 }: BarChartProps) {
  const width = 320;
  const padding = { top: 16, right: 12, bottom: 32, left: 12 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const barCount = data.length;
  const slot = chartW / barCount;
  const barW = Math.min(slot * 0.55, 38);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      className="overflow-visible"
    >
      {/* gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = padding.top + chartH * (1 - t);
        return (
          <g key={t}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke="#F3F4F6"
              strokeWidth={1}
            />
            <text
              x={padding.left}
              y={y - 3}
              fontSize={9}
              fill="#9CA3AF"
              fontFamily="Arial, sans-serif"
            >
              {Math.round(t * 100)}%
            </text>
          </g>
        );
      })}

      {/* bars */}
      {data.map((d, i) => {
        const pct = Math.min(d.value / d.max, 1);
        const h = chartH * pct;
        const x = padding.left + slot * i + (slot - barW) / 2;
        const y = padding.top + chartH - h;
        const id = `bargrad-${i}`;
        return (
          <g key={d.label}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={d.color} stopOpacity={1} />
                <stop offset="100%" stopColor={d.color} stopOpacity={0.55} />
              </linearGradient>
            </defs>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={6}
              fill={`url(#${id})`}
            />
            {/* value label */}
            <text
              x={x + barW / 2}
              y={y - 6}
              textAnchor="middle"
              fontSize={10}
              fontWeight={700}
              fill="#1F2937"
              fontFamily="Arial, sans-serif"
            >
              {Math.round(pct * 100)}
            </text>
            {/* x label */}
            <text
              x={x + barW / 2}
              y={height - 12}
              textAnchor="middle"
              fontSize={10}
              fontWeight={600}
              fill="#6B7280"
              fontFamily="Arial, sans-serif"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
