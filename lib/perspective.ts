/** Level 2 — which framework the student wants to look through. */
export type Perspective = "accounting" | "tax" | "both";

/** Level 3 on the Accounting branch. */
export type AccountingTax = "none" | "without-vat" | "with-vat";

/** What the two lower tiers resolve to once combined. */
export type ViewSpec = {
  perspective: Perspective;
  includeTax: boolean;
  includeVat: boolean;
};

export const PERSPECTIVES: Array<{ id: Perspective; label: string; blurb: string }> = [
  { id: "accounting", label: "Accounting", blurb: "IFRS / IAS treatment — recognition, measurement, disclosure." },
  { id: "tax", label: "Tax", blurb: "The SARS view — Income Tax Act, allowances, taxable income." },
  { id: "both", label: "Both", blurb: "The full picture, and how the two interact." },
];

export const ACCOUNTING_TAX_OPTIONS: Array<{ id: AccountingTax; label: string; blurb: string }> = [
  { id: "none", label: "No tax", blurb: "Pure IFRS. No deferred tax, no VAT." },
  { id: "without-vat", label: "Tax, without VAT", blurb: "Deferred and current tax, but no VAT lines." },
  { id: "with-vat", label: "Tax, with VAT", blurb: "Deferred and current tax, plus input/output VAT." },
];

/**
 * Collapse the Level 2 + Level 3 choices into the flags the prompt cares about.
 * Tax and Both always carry a tax treatment — VAT is their only switch — so the
 * three-way control only applies on the Accounting branch.
 */
export function resolveView(
  perspective: Perspective,
  accountingTax: AccountingTax,
  vatToggle: boolean,
): ViewSpec {
  if (perspective === "accounting") {
    return {
      perspective,
      includeTax: accountingTax !== "none",
      includeVat: accountingTax === "with-vat",
    };
  }
  return { perspective, includeTax: true, includeVat: vatToggle };
}

/** The instruction block appended to the system prompt for this view. */
export function viewInstruction(v: ViewSpec): string {
  const parts: string[] = [];

  if (v.perspective === "accounting") {
    parts.push(
      "PERSPECTIVE — ACCOUNTING: Answer from the IFRS financial-reporting perspective. Give the full accounting treatment — recognition, measurement, the journal entries, the effect on each financial statement, the accounting policy note and the IFRS note disclosures.",
    );
  } else if (v.perspective === "tax") {
    parts.push(
      "PERSPECTIVE — TAX: Answer from the South African tax perspective (SARS). Focus on gross income, deductions, capital allowances and the effect on taxable income, citing the relevant sections of the Income Tax Act. Limit journal entries to those that actually matter for tax (the current and deferred tax entries, and VAT entries if VAT is in scope). This view is NOT about IFRS presentation — the student has explicitly asked not to see it. You MUST set 'accountingPolicyNote' to an empty string (\"\") and return 'disclosures' as an empty array ([]). Do not write an accounting policy note. Do not list any IAS/IFRS note disclosures.",
    );
  } else {
    parts.push(
      "PERSPECTIVE — BOTH: Give the full picture — the IFRS accounting treatment AND the South African tax treatment — and make the interaction between them explicit (especially where the accounting carrying amount and the tax base diverge).",
    );
  }

  if (!v.includeTax) {
    parts.push(
      "TAX — EXCLUDE ENTIRELY: Do not deal with tax at all. No current tax, no deferred tax, no tax journal entries and no tax line items in the statement impact. This INCLUDES VAT: treat every amount given as already excluding VAT, and raise NO 'VAT input', 'VAT output' or any other VAT line in any journal entry — the bank/payable leg equals the VAT-exclusive amount. Set every field of the 'tax' object ('incomeTax', 'deferredTax', 'vat') to an empty string (\"\").",
    );
  } else if (!v.includeVat) {
    parts.push(
      "VAT — EXCLUDE: Ignore VAT completely. Treat every amount given as already excluding VAT, raise no input or output VAT lines in any journal entry, and set 'tax.vat' to an empty string.",
    );
  } else {
    parts.push(
      "VAT — INCLUDE: Deal with VAT explicitly — raise input/output VAT on the journal entries where applicable, and explain the VAT treatment in 'tax.vat'.",
    );
  }

  return parts.join("\n\n");
}
