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
