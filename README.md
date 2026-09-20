# The Ledger — IFRS calculator (South Africa)

A teaching ledger for South African accounting students. Describe a transaction in plain English, add the policy choices the entity uses, and The Ledger works through:

- **Journal entries** — properly balanced double entry, each line tagged with the statement it lands on, with a plain-English "why" under every entry.
- **Effect on the financial statements** — what moves on the SoFP, P&L, SoCE, and SoCF.
- **Accounting policy note** — ready-to-paste IFRS wording.
- **Disclosures** — referenced to the exact IAS/IFRS paragraph, with illustrative wording using the figures from this transaction.
- **South African tax treatment** — income tax (Income Tax Act), deferred tax (IAS 12, with the CGT rate where relevant), and VAT.
- **Teaching notes** — the trap students fall into for this kind of transaction.

Built on Next.js 16 (App Router) with Google's Gemini behind the AI SDK for structured-output reasoning.

## Choosing what you get

Three tiers of controls narrow the answer to what you actually need:

**1 · Mode — what are you working?**

| | |
|---|---|
| **A single transaction** | Work one transaction end to end. |
| **Scenario & questions** | Paste a long scenario plus the questions you were asked. You get the full treatment *and* a written answer to every question, with marks and workings. |

**2 · Perspective — through which lens?**

| | |
|---|---|
| **Accounting** | IFRS / IAS treatment: recognition, measurement, policy note, disclosures. |
| **Tax** | The SARS view: allowances, taxable income, Income Tax Act sections. Drops the IFRS policy note and note disclosures. |
| **Both** *(default)* | The full picture, and how the two interact. |

**3 · Detail** — depends on the lens:

- **Tax** or **Both** → *With VAT* / *Without VAT*.
- **Accounting** → *No tax* (pure IFRS, no deferred tax, no VAT) · *Tax, without VAT* · *Tax, with VAT*.

Choosing "Without VAT" or "No tax" doesn't just hide VAT — amounts are treated as VAT-exclusive and no VAT lines are raised at all.

## Run it locally

```bash
cp .env.example .env.local           # then add your Gemini API key
npm install
npm run dev
```

Get a Gemini API key at <https://aistudio.google.com/apikey>.

Open <http://localhost:3000>.

> **Note on the model.** Free-tier Gemini keys can only call **Flash** models — Pro
> models (`gemini-pro-latest`, `gemini-3.x-pro`) return a `limit: 0` quota error.
>
> Because free-tier Flash models regularly return *"This model is currently
> experiencing high demand"*, the app doesn't depend on any single one. It tries a
> chain and fails over automatically:
>
> | order | model | role |
> |---|---|---|
> | 1 | `gemini-2.5-flash` | Workhorse — reliable, fullest answers |
> | 2 | `gemini-flash-latest` | Most capable when it has capacity |
> | 3 | `gemini-3.5-flash-lite` | Fast backstop; thinner answers, but always up |
>
> Only if all three fail does the app return an error, and it then says the models are
> busy rather than blaming your scenario. The model that answered is returned in the
> `x-ledger-model` response header.
>
> Set `GEMINI_MODEL` to put a model of your choice first (the chain still backs it up).

## Deploy on Vercel

```bash
vercel link
vercel env add GOOGLE_GENERATIVE_AI_API_KEY production
vercel --prod
```

## Architecture

```
app/
  page.tsx            The form + result page (client)
  layout.tsx          Fonts (Fraunces / Newsreader / JetBrains Mono) and metadata
  globals.css         The "paper" aesthetic — ruled background, oxblood margin
  api/analyze/route.ts  POSTs the transaction + facts to Gemini, returns structured JSON
components/
  Result.tsx          Renders the journal entries, statement effects, notes, tax cards
lib/
  schema.ts           Zod schema that Gemini must conform to (the contract)
```

The model is constrained to produce output that matches a Zod schema (`generateObject` from the AI SDK), so the UI can render confidently — every transaction comes back with the same shape.

## Disclaimer

A teaching aid, not advice. The Ledger illustrates how each transaction flows through the records under IFRS as applied in South Africa with common SARS outcomes. Answers are AI-generated and rest on the stated assumptions — always check against the standards, the Income Tax Act and the VAT Act, and your lecturer's guidance.
