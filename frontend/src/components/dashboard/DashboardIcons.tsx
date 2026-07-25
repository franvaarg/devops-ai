export type IconProps = {
  className?: string;
};

export function ChartIcon({
  className = "h-5 w-5",
}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 19V9m6 10V5m6 14v-7m4 7H2"
      />
    </svg>
  );
}

export function AlertIcon({
  className = "h-5 w-5",
}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v4m0 4h.01M10.3 3.8 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z"
      />
    </svg>
  );
}

export function GaugeIcon({
  className = "h-5 w-5",
}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 14 16 9m4.5 10a9 9 0 1 0-17 0h17ZM7 16h.01M17 16h.01"
      />
    </svg>
  );
}

export function ClockIcon({
  className = "h-5 w-5",
}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 7v5l3 2"
      />
    </svg>
  );
}