export const formatRM = (n: number) => `RM ${n.toLocaleString("en-MY")}`;

/** "1,052,000" -> "RM 1.05m" for compact labels */
export const formatRMShort = (n: number) => `RM ${(n / 1_000_000).toFixed(2)}m`;
