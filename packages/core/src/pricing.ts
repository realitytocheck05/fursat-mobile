import { roundPaise, type Paise } from "./money";

export interface PricedLine {
  itemId: string;
  name: string;
  unitPaise: Paise;
  qty: number;
  note?: string;
}

export interface TaxSettings {
  /** GST rate in basis points. Restaurant service = 500 (5%). Confirm with the client's accountant. */
  gstBps: number;
  /** true = intra-state (CGST + SGST halves). Telangana restaurant billing a guest in Telangana = true. */
  intraState: boolean;
}

export interface BillTotals {
  subtotal: Paise;
  cgst: Paise;
  sgst: Paise;
  igst: Paise;
  tax: Paise;
  total: Paise;
  /** Always 0. Mandatory service charge is unlawful in India (CCPA guidelines, Delhi HC 28 Mar 2025). */
  serviceCharge: 0;
}

export const DEFAULT_TAX: TaxSettings = { gstBps: 500, intraState: true };

export function lineTotal(line: PricedLine): Paise {
  if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > 50) throw new RangeError(`Invalid quantity ${line.qty} for ${line.name}`);
  if (!Number.isInteger(line.unitPaise) || line.unitPaise < 0) throw new RangeError(`Invalid price for ${line.name}`);
  return line.unitPaise * line.qty;
}

/** GST on the bill subtotal, split into CGST/SGST halves (each rounded) or IGST. */
export function billTotals(lines: PricedLine[], tax: TaxSettings = DEFAULT_TAX): BillTotals {
  if (!Number.isInteger(tax.gstBps) || tax.gstBps < 0 || tax.gstBps > 2800) throw new RangeError("gstBps must be 0..2800");
  const subtotal = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  let cgst = 0,
    sgst = 0,
    igst = 0;
  if (tax.intraState) {
    const half = roundPaise((subtotal * tax.gstBps) / 2 / 10000);
    cgst = half;
    sgst = half;
  } else {
    igst = roundPaise((subtotal * tax.gstBps) / 10000);
  }
  const taxAmt = cgst + sgst + igst;
  return { subtotal, cgst, sgst, igst, tax: taxAmt, total: subtotal + taxAmt, serviceCharge: 0 };
}
