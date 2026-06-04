"use client";

import { useState } from "react";
import type { LedgerOutput } from "@/lib/schema";
import Result from "@/components/Result";

const EXAMPLES: Array<{ title: string; description: string }> = [
  {
    title: "PPE purchase + depreciation",
    description:
      "On 1 January 2024 the company bought a delivery vehicle for R 500 000 (excl. VAT) cash. The company is a registered VAT vendor. Useful life is 5 years, nil residual value. SARS allows a 20% straight-line wear-and-tear allowance under s11(e), apportioned for time. Year-end is 31 December 2024.",
  },
  {
    title: "Land revaluation",
    description:
      "Land carried at a cost of R 2 000 000 is revalued to its fair value of R 2 500 000 at year-end by an independent valuer. This is the first revaluation. The company uses the revaluation model for land. Tax rate 27%, CGT inclusion 80%.",
  },
  {
    title: "Inventory write-down to NRV",
    description:
      "At year-end, inventory costing R 180 000 has a net realisable value of only R 140 000 due to obsolescence. SARS does not grant a diminution allowance under s22(1) this year. The entity uses the weighted-average cost formula.",
  },
  {
    title: "Income received in advance",
    description:
      "On 1 October 2024 the company (a VAT vendor) received R 138 000 cash for a 12-month service contract starting that day. The amount includes VAT. The service is rendered evenly. Year-end is 31 December 2024. No s24C allowance is claimed.",
  },
  {
    title: "Bank loan",
    description:
      "On 1 July 2024 the company raised a R 1 000 000 loan from FNB at 11% per annum, interest payable annually in arrears. There were no transaction costs. Year-end is 31 December 2024.",
  },
  {
    title: "Lease (right-of-use asset)",
    description:
      "On 1 January 2024 the company signed a 5-year lease for office space. Annual lease payments of R 240 000 are payable in arrears. The implicit rate is not readily determinable; the incremental borrowing rate is 10%. There are no incentives or initial direct costs. Year-end is 31 December 2024.",
  },
  {
    title: "PPE — impairment & reversal (multi-year)",
    description:
      "Entity A buys equipment for R 100 000 on 1 January 20X1, depreciated straight-line over 5 years to a nil residual. At 31 December 20X3 it is impaired by R 4 000. At 31 December 20X4 the recoverable amount recovers and an impairment reversal of R 2 000 is recognised (capped at the depreciated historical cost). Show each year-end from 20X1 to 20X4 (cost model). Tax rate 27%.",
  },
];

export default function Home() {
  const [description, setDescription] = useState("");
  const [policies, setPolicies] = useState("");
  const [yearEnd, setYearEnd] = useState("");
  const [reportingDate, setReportingDate] = useState("");
  const [vendor, setVendor] = useState(true);
  const [taxRate, setTaxRate] = useState<number>(27);
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LedgerOutput | null>(null);

  async function onWork() {
    setError(null);
    if (description.trim().length < 10) {
      setError("Please describe the transaction in at least a sentence or two.");
      return;
    }
    setLoading(true);
    setData(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          policies,
          yearEnd,
          reportingDate,
          vendor,
          taxRate,
          notes,
        }),
      });

      // Read the body as text first and parse defensively: a platform timeout
      // or crash returns a plain-text page ("An error occurred…"), not JSON, and
      // calling res.json() on that throws "Unexpected token 'A'… is not valid JSON".
      const raw = await res.text();
      let json: (LedgerOutput & { error?: string; detail?: string }) | null = null;
      try {
        json = raw ? JSON.parse(raw) : null;
      } catch {
        json = null;
      }

      if (!res.ok || !json) {
        const timedOut = res.status === 504 || res.status === 408 || res.status === 524;
        const msg = timedOut
          ? "The model took too long and the request timed out. Multi-year transactions are heavier — please try again; it usually works on the second attempt."
          : !json
            ? `The server returned an unexpected response (HTTP ${res.status}). This is usually a temporary timeout — please try again in a moment.`
            : json.error || `Request failed (${res.status})`;
        throw new Error(msg);
      }

      setData(json as LedgerOutput);
      setTimeout(() => {
        document.getElementById("out")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function pickExample(idx: number) {
    setDescription(EXAMPLES[idx].description);
    setError(null);
  }

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 90px 24px" }}>
      <header className="mast">
        <p className="kicker">Double-Entry · A Teaching Ledger</p>
        <h1>
          The <em>Ledger</em>
        </h1>
        <p className="sub">
          Describe any transaction and a few facts. The Ledger works the journal entries, the
          effect on each financial statement, the accounting policy note, the disclosures, and the
          South African tax treatment — for IFRS as applied to South African companies.
        </p>
        <div className="tags">
          <span className="tag">South Africa</span>
          <span className="tag">IFRS · IAS</span>
          <span className="tag">Deferred Tax</span>
          <span className="tag">VAT</span>
          <span className="tag">Powered by Gemini</span>
        </div>
      </header>

      <p className="selabel">Try a worked example</p>
      <div className="examples">
        {EXAMPLES.map((e, i) => (
          <button className="example" type="button" key={i} onClick={() => pickExample(i)}>
            {e.title}
          </button>
        ))}
      </div>

      <section className="panel">
        <h2>The transaction</h2>
        <p className="lead">
          Describe what happened in plain English, with the figures. Then add any facts about the
          entity that affect the answer.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 18 }}>
          <div className="fld">
            <label htmlFor="desc">
              Transaction description
              <span className="hint">
                e.g. dates, amounts, parties, what was exchanged — be specific.
              </span>
            </label>
            <textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="On 1 January 2024 the company bought a delivery vehicle for R 500 000 (excl. VAT) cash. Useful life 5 years, residual nil. Year-end 31 December 2024."
              className={error && description.trim().length < 10 ? "bad" : ""}
            />
          </div>

          <div className="fld">
            <label htmlFor="pol">
              Accounting policies in use
              <span className="hint">
                e.g. cost model vs revaluation, FIFO vs weighted average, useful life, depreciation
                method.
              </span>
            </label>
            <textarea
              id="pol"
              value={policies}
              onChange={(e) => setPolicies(e.target.value)}
              placeholder="PPE is carried at cost less accumulated depreciation. Depreciation is straight-line over the useful life."
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 18,
            }}
          >
            <div className="fld">
              <label htmlFor="ye">Year-end date</label>
              <input
                id="ye"
                type="date"
                value={yearEnd}
                onChange={(e) => setYearEnd(e.target.value)}
              />
            </div>
            <div className="fld">
              <label htmlFor="rd">Transaction / reporting date</label>
              <input
                id="rd"
                type="date"
                value={reportingDate}
                onChange={(e) => setReportingDate(e.target.value)}
              />
            </div>
            <div className="fld">
              <label htmlFor="tr">
                Income tax rate (%)
                <span className="hint">Company rate. Default 27%.</span>
              </label>
              <input
                id="tr"
                type="number"
                step="any"
                inputMode="decimal"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div className="fld check">
            <input
              id="vendor"
              type="checkbox"
              checked={vendor}
              onChange={(e) => setVendor(e.target.checked)}
            />
            <label htmlFor="vendor">The entity is a registered VAT vendor (input VAT claimable)</label>
          </div>

          <div className="fld">
            <label htmlFor="notes">
              Anything else
              <span className="hint">
                Other facts the marker needs — s24C claimed, lease terms, fair value source,
                impairment indicators, etc.
              </span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional: include any further assumptions or context."
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            marginTop: 26,
          }}
        >
          <button className="calc" onClick={onWork} disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" /> Working the transaction…
              </>
            ) : (
              <>
                <span className="font-mono">✎</span> Work the transaction
              </>
            )}
          </button>
          {error && <span className="warn">{error}</span>}
        </div>
      </section>

      <section id="out">{data && <Result data={data} />}</section>

      <footer className="fine">
        <b>A teaching aid, not advice.</b> The Ledger illustrates how each transaction flows through
        the records under IFRS as applied in South Africa, with common SARS income-tax,
        deferred-tax and VAT outcomes. Answers are generated by Google&apos;s Gemini model and rest
        on the stated assumptions — always check against the standards, the Income Tax Act and the
        VAT Act, and your lecturer&apos;s guidance.
      </footer>
    </div>
  );
}
