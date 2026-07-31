interface StarRatingProps {
  score: number;
  size?: number;
}

export default function StarRating({ score, size = 20 }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((pos) => {
        const fill = Math.min(Math.max(score - (pos - 1), 0), 1);
        const clipId = `star-clip-${pos}-${score}-${size}`;
        return (
          <svg
            key={pos}
            viewBox="0 0 20 20"
            width={size}
            height={size}
            className="shrink-0"
          >
            <defs>
              <clipPath id={clipId}>
                <rect x="0" y="0" width={`${fill * 20}`} height="20" />
              </clipPath>
            </defs>
            <path
              d="M10 1.5l2.47 5 5.53.8-4 3.9.94 5.5L10 14.3l-4.94 2.4.94-5.5-4-3.9 5.53-.8z"
              fill="#E5E7EB"
            />
            <path
              d="M10 1.5l2.47 5 5.53.8-4 3.9.94 5.5L10 14.3l-4.94 2.4.94-5.5-4-3.9 5.53-.8z"
              fill="#F59E0B"
              clipPath={`url(#${clipId})`}
            />
          </svg>
        );
      })}
    </div>
  );
}
