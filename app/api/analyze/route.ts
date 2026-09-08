import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { ledgerSchema } from "@/lib/schema";
import { presetInstruction } from "@/lib/style";
import { NextResponse } from "next/server";

export const maxDuration = 300;
export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are "The Ledger" — a meticulous IFRS tutor for South African accounting students.

Your job: take a single business transaction and produce a complete teaching worked answer in the JSON shape required by the schema.

Rules of the house:
1. Apply IFRS as endorsed in South Africa (IAS, IFRS, Interpretations) for all accounting treatment.
2. Apply the South African Income Tax Act, the VAT Act and (where relevant) the Eighth Schedule for tax. Default company tax rate is 27%, VAT is 15%, CGT inclusion for companies is 80%.
3. Show double entry that always balances. Use proper account names ("Property, plant and equipment", not "PPE"). Round monetary amounts to two decimals.
4. For each journal entry, write a short 'explanation' field that teaches WHY the entry is recorded that way — this is the most important field for the student.
5. Use 'SoFP', 'P&L', 'OCI / Equity', 'SoCE', or 'SoCF' for the 'statement' field on each journal line.
6. For 'financialStatementImpact', describe net movement on each statement. Use 'increase' / 'decrease' for SoFP/P&L/SoCE, and 'inflow' / 'outflow' for SoCF. Use '—' when there is no effect. Amounts must be formatted as 'R 12 345.67' with a non-breaking space and thin spaces.
7. List ALL material assumptions you had to make (rate not given, useful life assumed, vendor status, etc.) — students must see what was assumed.
8. Disclosures must cite the exact paragraph number where possible (e.g. 'IAS 16.73(e)', 'IFRS 15.116'). Each must include illustrative wording plugging the figures from THIS transaction into a real note.
9. Deferred tax: always state carrying amount vs tax base, the temporary difference, and whether it's a deferred tax asset or liability. If on capital account, use the effective CGT rate (27% × 80% = 21.6%).
10. Teaching notes: 2–4 sentences on the trap students commonly fall into for this kind of transaction.
11. MULTI-PERIOD VIEW: If the transaction's effects unfold over more than one reporting period (depreciation over an asset's life, an impairment and a later reversal, a lease right-of-use asset, a loan measured at amortised cost, deferred tax unwinding), fill 'periods' with each period-end label (e.g. '31 Dec 20X1', '31 Dec 20X2', …) and build 'periodTables' as a textbook multi-column layout:
   - One table titled 'Financial statement extracts' with 'section' rows ('Statement of financial position', then 'Statement of comprehensive income'), 'subheading' rows where useful ('Non-current assets'), and 'line' rows for each affected item across the years.
   - One table titled 'Notes to the financial statements' with the relevant note roll-forward — for PPE: 'Cost', 'Accumulated depreciation and impairment', and a 'total' row 'Net carrying amount'.
   Each 'line'/'total' row's 'values' array MUST line up one-to-one with 'periods' (same order, same length). Show expenses/negatives in (brackets) and nil as '-'. If the transaction only touches ONE period, leave BOTH 'periods' and 'periodTables' as empty arrays.
12. SPECIFIC QUESTIONS: If the user supplies specific questions (a required/asked list, often lettered a), b), c) or numbered), you MUST answer every one of them in 'questionAnswers', in the order asked, one array entry per question — never merge two questions into one entry and never skip one. Restate each question verbatim in 'question'. Put the answer a student should write in 'answer', and every supporting calculation in 'workings' as separate strings ('W1: …', 'W2: …'). If the question carries a mark allocation, record it in 'marks' and scale the depth of the answer to those marks. Answer the question that was actually asked — if it says "discuss", discuss; if it says "calculate", show the calculation; if it says "prepare the journal entries", set the entries out IN FULL inside the 'answer' itself (each account with Dr/Cr and the amount, and the date), never merely refer the reader elsewhere. Every 'answer' must stand on its own as a complete response to that question. Still complete every other field of the schema (journal entries, statement impact, notes, tax) as supporting work. If no specific questions were asked, leave 'questionAnswers' as an empty array.

Always answer as if the entity is a South African company unless told otherwise.`;

type Body = {
  description?: string;
  policies?: string;
  yearEnd?: string;
  reportingDate?: string;
  vendor?: boolean;
  taxRate?: number;
  notes?: string;
  questions?: string;
  stylePreset?: string;
  houseStyle?: string;
};

/** Cap free-text the client controls so a huge paste can't blow up the prompt. */
const clamp = (s: string | undefined, max: number) =>
  typeof s === "string" ? s.slice(0, max) : "";

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.description || body.description.trim().length < 10) {
    return NextResponse.json(
      { error: "Please describe the transaction in at least a sentence or two." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "GOOGLE_GENERATIVE_AI_API_KEY is not set on the server. Add it in Vercel project settings (or .env.local for dev).",
      },
      { status: 500 },
    );
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GEMINI_API_KEY) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY;
  }

  const questions = clamp(body.questions, 8000).trim();
  const houseStyle = clamp(body.houseStyle, 2000).trim();
  const styleRule = presetInstruction(body.stylePreset);

  const userPrompt = [
    "## Scenario / transaction to work",
    body.description,
    "",
    questions
      ? "## Specific questions you must answer\nAnswer EVERY question below, in this order, in 'questionAnswers' — one array entry per question:\n\n" +
        questions
      : "",
    body.policies ? "## Accounting policy choices stated by the user\n" + body.policies : "",
    body.yearEnd ? "## Financial year-end\n" + body.yearEnd : "",
    body.reportingDate ? "## Reporting date for this transaction\n" + body.reportingDate : "",
    typeof body.vendor === "boolean"
      ? "## VAT status\n" + (body.vendor ? "The entity IS a registered VAT vendor." : "The entity is NOT a registered VAT vendor.")
      : "",
    typeof body.taxRate === "number" && !Number.isNaN(body.taxRate)
      ? "## Company tax rate to use\n" + body.taxRate + "%"
      : "",
    body.notes ? "## Additional notes / facts\n" + body.notes : "",
    "",
    "Produce the full teaching answer in the required JSON shape. Be precise with figures and standard references.",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const { object } = await generateObject({
      model: google(process.env.GEMINI_MODEL || "gemini-flash-latest"),
      schema: ledgerSchema,
      schemaName: "LedgerOutput",
      schemaDescription:
        "A complete IFRS teaching answer for one South African accounting transaction.",
      system: [SYSTEM_PROMPT, styleRule, houseStyle ? "House style set by the student — follow it closely:\n" + houseStyle : ""]
        .filter(Boolean)
        .join("\n\n---\n\n"),
      prompt: userPrompt,
      temperature: 0.2,
    });

    return NextResponse.json(object);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Gemini error:", message);

    // Gemini's free tier regularly returns transient capacity / rate-limit errors.
    // Those say nothing about the user's scenario, so tell them to just retry.
    const transient =
      /high demand|overloaded|unavailable|try again|rate.?limit|quota|resource.?exhausted|429|503/i.test(
        message,
      );

    return NextResponse.json(
      {
        error: transient
          ? "Gemini is busy right now — this is a temporary capacity limit on the free tier, not a problem with your scenario. Press the button again in a few seconds."
          : "The model couldn't return a structured answer. Try rewording the scenario, or splitting a very long one into fewer questions.",
        detail: message,
      },
      { status: transient ? 503 : 502 },
    );
  }
}
