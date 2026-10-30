// Public, build-time switches. Intake is opt-in; marketing-only always wins.
export const marketingOnly = import.meta.env.VITE_MARKETING_ONLY === 'true';
export const earlyAccessEnabled = !marketingOnly && import.meta.env.VITE_EARLY_ACCESS_ENABLED === 'true';
