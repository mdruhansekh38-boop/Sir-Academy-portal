interface LineChartProps {
  data: { label: string; value: number }[]; // value is a percentage 0..100
  height?: number;
}

export default function ProgressLineChart({ data, height = 160 }: LineChartProps) {
  const width = 320;
  const padding = { top: 18, right: 14, bottom: 28, left: 14 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = data.map((d, i) => {
    const x =
      padding.left +
      (data.length === 1 ? chartW / 2 : (chartW / (data.length - 1)) * i);
    const y = padding.top + chartH * (1 - d.value / 100);
    return { x, y, ...d };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  const areaD =
    `${pathD} L ${points[points.length - 1].x} ${padding.top + chartH}` +
    ` L ${points[0].x} ${padding.top + chartH} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
      <defs>
        <linearGradient id="pline-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E85A2A" stopOpacity={0.28} />
          <stop offset="100%" stopColor="#E85A2A" stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* gridlines */}
      {[0, 0.5, 1].map((t) => {
        const y = padding.top + chartH * (1 - t);
        return (
          <line
            key={t}
            x1={padding.left}
            x2={width - padding.right}
            y1={y}
            y2={y}
            stroke="#F3F4F6"
            strokeWidth={1}
          />
        );
      })}

      {/* area + line */}
      {points.length > 1 && <path d={areaD} fill="url(#pline-area)" />}
      {points.length > 1 && (
        <path
          d={pathD}
          fill="none"
          stroke="#E85A2A"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* points + labels */}
      {points.map((p) => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y} r={4} fill="#E85A2A" />
          <circle cx={p.x} cy={p.y} r={2} fill="#fff" />
          <text
            x={p.x}
            y={p.y - 9}
            textAnchor="middle"
            fontSize={10}
            fontWeight={700}
            fill="#1F2937"
            fontFamily="Arial, sans-serif"
          >
            {p.value}%
          </text>
          <text
            x={p.x}
            y={height - 8}
            textAnchor="middle"
            fontSize={9}
            fontWeight={600}
            fill="#6B7280"
            fontFamily="Arial, sans-serif"
          >
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
