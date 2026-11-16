/** All money is integer paise. Never use floats for amounts. */
export type Paise = number;

export const rupeesToPaise = (rupees: number): Paise => {
  if (!Number.isFinite(rupees) || rupees < 0) throw new RangeError(`Invalid rupee amount: ${rupees}`);
  return Math.round(rupees * 100);
};

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 0 });
const inrExact = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "₹1,250" for whole rupees, "₹1,250.50" otherwise. */
export const formatINR = (paise: Paise): string => (paise % 100 === 0 ? inr.format(paise / 100) : inrExact.format(paise / 100));

/** Round half up to whole paise (GST rounding on a bill). */
export const roundPaise = (value: number): Paise => Math.floor(value + 0.5);
