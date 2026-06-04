import { z } from "zod";

const journalLine = z.object({
  account: z.string().describe("The exact account name, e.g. 'Property, plant and equipment'."),
  debit: z
    .union([z.number(), z.null()])
    .describe("Debit amount in rand, or null if this line is a credit."),
  credit: z
    .union([z.number(), z.null()])
    .describe("Credit amount in rand, or null if this line is a debit."),
  statement: z
    .enum(["SoFP", "P&L", "OCI / Equity", "SoCE", "SoCF"])
    .describe("Which primary statement this account belongs to."),
});

const journalEntry = z.object({
  date: z.string().describe("Effective date (YYYY-MM-DD) or short label like 'Year-end'."),
  narration: z.string().describe("Short narrative of the entry, e.g. 'Acquisition of the asset'."),
  lines: z.array(journalLine).min(2),
  explanation: z
    .string()
    .describe("Plain-English reason this entry is recorded the way it is — the teaching note."),
});

const fsItem = z.object({
  line: z.string(),
  effect: z
    .string()
    .describe(
      "One of: 'increase', 'decrease', 'inflow', 'outflow', '—'. Mention 'expense' or 'income' in brackets where useful.",
    ),
  amount: z
    .string()
    .describe("Pre-formatted amount like 'R 500 000.00', or empty string if no figure."),
});

const periodRow = z.object({
  label: z
    .string()
    .describe(
      "Row label, e.g. 'Property, plant and equipment', 'Depreciation', 'Cost', 'Net carrying amount'. For heading rows, the statement or note name.",
    ),
  values: z
    .array(z.string())
    .describe(
      "One pre-formatted value per period, positionally aligned to `periods` (same order, same length). Use '-' for nil and (brackets) for negatives/expenses, e.g. '(20 000)'. For heading rows leave this an empty array.",
    ),
  kind: z
    .enum(["section", "subheading", "line", "total"])
    .describe(
      "'section' = a statement caption like 'Statement of financial position' (no figures); 'subheading' = a grouping like 'Non-current assets' or 'Note x: Property, plant and equipment' (no figures); 'line' = a normal line item with one figure per period; 'total' = a subtotal/total shown in bold with a rule above, e.g. 'Net carrying amount'.",
    ),
});

const periodTable = z.object({
  title: z
    .string()
    .describe(
      "Caption above this table, e.g. 'Financial statement extracts' or 'Notes to the financial statements'.",
    ),
  rows: z.array(periodRow),
});

const disclosure = z.object({
  standard: z
    .string()
    .describe("Reference, e.g. 'IAS 16.73(e)' or 'IFRS 15.116'. Be specific where you can."),
  requirement: z.string().describe("What the standard requires the entity to disclose."),
  example: z
    .string()
    .describe(
      "Illustrative wording the student could put in the notes, plugging in the figures from this transaction.",
    ),
});

export const ledgerSchema = z.object({
  transactionSummary: z
    .string()
    .describe("One-paragraph summary of what economically happened, with figures."),
  classification: z
    .string()
    .describe("How this transaction is classified under IFRS, e.g. 'Financial liability at amortised cost'."),
  relevantStandards: z
    .array(z.string())
    .describe("IFRS / IAS / Interpretations / SA Acts directly relevant — e.g. 'IAS 16', 'IAS 12', 'VAT Act'."),
  assumptions: z
    .array(z.string())
    .describe("Material assumptions the student should know were made to reach this answer."),
  journalEntries: z.array(journalEntry).min(1),
  financialStatementImpact: z.object({
    statementOfFinancialPosition: z.array(fsItem),
    statementOfProfitOrLoss: z.array(fsItem),
    statementOfChangesInEquity: z.array(fsItem),
    statementOfCashFlows: z.array(fsItem),
  }),
  periods: z
    .array(z.string())
    .describe(
      "Column headers ONLY when this transaction's effects span more than one reporting period (depreciation over an asset's life, an impairment and later reversal, a lease, loan amortisation, deferred-tax unwinding). Each is a period-end label like '31 Dec 20X1'. Empty array for a single-period transaction.",
    ),
  periodTables: z
    .array(periodTable)
    .describe(
      "Multi-year worked tables aligned to `periods`: typically one table of financial-statement extracts (a Statement of financial position section and a Statement of comprehensive income section) and one table of note reconciliations (e.g. a PPE roll-forward of Cost / Accumulated depreciation and impairment / Net carrying amount). Every 'line' or 'total' row's `values` array MUST have exactly one entry per period in `periods`, in the same order. Empty array for a single-period transaction.",
    ),
  accountingPolicyNote: z
    .string()
    .describe(
      "Illustrative accounting policy note in formal IFRS language, ready to drop into the financial statements.",
    ),
  disclosures: z.array(disclosure),
  tax: z.object({
    incomeTax: z
      .string()
      .describe("South African income tax (SARS) treatment — sections of the Income Tax Act where relevant."),
    deferredTax: z
      .string()
      .describe("Deferred tax workings (carrying amount vs tax base, temporary difference, rate)."),
    vat: z.string().describe("VAT treatment (input/output/exempt/zero-rated) under the VAT Act."),
  }),
  teachingNotes: z
    .string()
    .describe("The exam tip — the one or two things students typically miss on this kind of transaction."),
});

export type LedgerOutput = z.infer<typeof ledgerSchema>;
