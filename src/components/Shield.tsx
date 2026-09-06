export function Shield({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="32"
      height="36"
      viewBox="0 0 32 36"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M16 2 29 7v10c0 8-7 14-13 17C10 31 3 25 3 17V7L16 2Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="m16 8 7 3v6c0 5-4 9-7 11-3-2-7-6-7-11v-6l7-3Z"
        fill="currentColor"
        fillOpacity=".12"
      />
      <path
        d="m13 14-3 3 3 3m6-6 3 3-3 3m-2-8-2 10"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
