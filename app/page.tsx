"use client";

import { useEffect, useState } from "react";
import type { LedgerOutput } from "@/lib/schema";
import { STYLE_PRESETS, DEFAULT_PRESET } from "@/lib/style";
import {
  PERSPECTIVES,
  ACCOUNTING_TAX_OPTIONS,
  resolveView,
  type AccountingTax,
  type Perspective,
  type ViewSpec,
} from "@/lib/perspective";
import Result from "@/components/Result";

type Mode = "transaction" | "scenario";

const STYLE_KEY = "ledger.style.v1";

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
  const [mode, setMode] = useState<Mode>("transaction");
  const [perspective, setPerspective] = useState<Perspective>("both");
  const [accountingTax, setAccountingTax] = useState<AccountingTax>("with-vat");
  const [vat, setVat] = useState(true);
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState("");
  const [policies, setPolicies] = useState("");
  const [yearEnd, setYearEnd] = useState("");
  const [reportingDate, setReportingDate] = useState("");
  const [vendor, setVendor] = useState(true);
  const [taxRate, setTaxRate] = useState<number>(27);
  const [notes, setNotes] = useState("");

  const [stylePreset, setStylePreset] = useState<string>(DEFAULT_PRESET);
  const [houseStyle, setHouseStyle] = useState("");
  const [styleOpen, setStyleOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LedgerOutput | null>(null);
  // The view the displayed result was produced under, so changing the controls
  // afterwards doesn't re-shape an answer that was generated differently.
  const [resultView, setResultView] = useState<ViewSpec | null>(null);

  const view = resolveView(perspective, accountingTax, vat);

  // Restore the saved house style on this device.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STYLE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { stylePreset?: string; houseStyle?: string };
      if (typeof saved.stylePreset === "string") setStylePreset(saved.stylePreset);
      if (typeof saved.houseStyle === "string") setHouseStyle(saved.houseStyle);
    } catch {
      /* ignore unreadable/blocked storage */
    }
  }, []);

  // Persist it whenever it changes.
  useEffect(() => {
    try {
      localStorage.setItem(STYLE_KEY, JSON.stringify({ stylePreset, houseStyle }));
    } catch {
      /* ignore blocked storage */
    }
  }, [stylePreset, houseStyle]);

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
          questions: mode === "scenario" ? questions : "",
          policies,
          yearEnd,
          reportingDate,
          vendor,
          taxRate,
          notes,
          stylePreset,
          houseStyle,
          perspective,
          accountingTax,
          vat,
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
      setResultView(view);
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

      <p className="selabel">What are you working?</p>
      <div className="modes" role="tablist" aria-label="Mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "transaction"}
          className={"mode-btn" + (mode === "transaction" ? " active" : "")}
          onClick={() => setMode("transaction")}
        >
          <span className="mode-t">A single transaction</span>
          <span className="mode-d">Work one transaction end to end.</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "scenario"}
          className={"mode-btn" + (mode === "scenario" ? " active" : "")}
          onClick={() => setMode("scenario")}
        >
          <span className="mode-t">Scenario &amp; questions</span>
          <span className="mode-d">
            Paste a long scenario plus the questions you were asked — it answers each one.
          </span>
        </button>
      </div>

      <p className="selabel">Through which lens?</p>
      <div className="tier2">
        {PERSPECTIVES.map((p) => (
          <button
            type="button"
            key={p.id}
            className={"persp-btn" + (perspective === p.id ? " active" : "")}
            onClick={() => setPerspective(p.id)}
            aria-pressed={perspective === p.id}
          >
            <span className="persp-t">{p.label}</span>
            <span className="persp-d">{p.blurb}</span>
          </button>
        ))}
      </div>

      <div className="tier3">
        <span className="tier3-lab">
          {perspective === "accounting" ? "Tax implications" : "VAT"}
        </span>
        {perspective === "accounting" ? (
          <div className="tier3-opts">
            {ACCOUNTING_TAX_OPTIONS.map((o) => (
              <button
                type="button"
                key={o.id}
                className={"lvl3-btn" + (accountingTax === o.id ? " active" : "")}
                onClick={() => setAccountingTax(o.id)}
                aria-pressed={accountingTax === o.id}
                title={o.blurb}
              >
                {o.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="tier3-opts">
            <button
              type="button"
              className={"lvl3-btn" + (vat ? " active" : "")}
              onClick={() => setVat(true)}
              aria-pressed={vat}
            >
              With VAT
            </button>
            <button
              type="button"
              className={"lvl3-btn" + (!vat ? " active" : "")}
              onClick={() => setVat(false)}
              aria-pressed={!vat}
            >
              Without VAT
            </button>
          </div>
        )}
        <span className="tier3-hint">
          {perspective === "accounting"
            ? ACCOUNTING_TAX_OPTIONS.find((o) => o.id === accountingTax)?.blurb
            : vat
              ? "Input / output VAT is raised on the entries."
              : "Every amount is treated as excluding VAT."}
        </span>
      </div>

      {mode === "transaction" && (
        <>
          <p className="selabel">Try a worked example</p>
          <div className="examples">
            {EXAMPLES.map((e, i) => (
              <button className="example" type="button" key={i} onClick={() => pickExample(i)}>
                {e.title}
              </button>
            ))}
          </div>
        </>
      )}

      <section className="panel">
        <h2>{mode === "scenario" ? "The scenario" : "The transaction"}</h2>
        <p className="lead">
          {mode === "scenario"
            ? "Paste the whole scenario as it was given to you, then the questions underneath. You still get the full ledger treatment — plus a written answer to every question."
            : "Describe what happened in plain English, with the figures. Then add any facts about the entity that affect the answer."}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 18 }}>
          <div className="fld">
            <label htmlFor="desc">
              {mode === "scenario" ? "The scenario" : "Transaction description"}
              <span className="hint">
                {mode === "scenario"
                  ? "Paste the full scenario exactly as given — all the background, dates and figures."
                  : "e.g. dates, amounts, parties, what was exchanged — be specific."}
              </span>
            </label>
            <textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                mode === "scenario"
                  ? "Entity A is a manufacturing company with a 31 December year-end. On 1 January 20X1 it acquired plant for R 100 000…"
                  : "On 1 January 2024 the company bought a delivery vehicle for R 500 000 (excl. VAT) cash. Useful life 5 years, residual nil. Year-end 31 December 2024."
              }
              className={error && description.trim().length < 10 ? "bad" : ""}
              style={mode === "scenario" ? { minHeight: 220 } : undefined}
            />
          </div>

          {mode === "scenario" && (
            <div className="fld">
              <label htmlFor="qs">
                The questions you were asked
                <span className="hint">
                  Paste them as they appear — keep the a) b) c) numbering and any mark allocations.
                  Each one gets its own written answer.
                </span>
              </label>
              <textarea
                id="qs"
                value={questions}
                onChange={(e) => setQuestions(e.target.value)}
                placeholder={
                  "a) Prepare the journal entries for the year ended 31 December 20X1. (8 marks)\n" +
                  "b) Discuss whether the plant should be impaired at 31 December 20X3. (6 marks)\n" +
                  "c) Calculate the deferred tax balance at 31 December 20X3. (5 marks)"
                }
                style={{ minHeight: 160 }}
              />
            </div>
          )}

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

          {view.includeVat && (
            <div className="fld check">
              <input
                id="vendor"
                type="checkbox"
                checked={vendor}
                onChange={(e) => setVendor(e.target.checked)}
              />
              <label htmlFor="vendor">
                The entity is a registered VAT vendor (input VAT claimable)
              </label>
            </div>
          )}

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

        <div className="style-box">
          <button
            type="button"
            className="style-toggle"
            aria-expanded={styleOpen}
            onClick={() => setStyleOpen((v) => !v)}
          >
            <span className="style-caret">{styleOpen ? "▾" : "▸"}</span>
            How the answers are written
            <span className="style-current">
              {STYLE_PRESETS.find((p) => p.id === stylePreset)?.label ?? "Balanced"}
              {houseStyle.trim() ? " · custom" : ""}
            </span>
          </button>

          {styleOpen && (
            <div className="style-body">
              <div className="style-presets">
                {STYLE_PRESETS.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    className={"style-chip" + (stylePreset === p.id ? " active" : "")}
                    onClick={() => setStylePreset(p.id)}
                    title={p.blurb}
                  >
                    <span className="sc-l">{p.label}</span>
                    <span className="sc-b">{p.blurb}</span>
                  </button>
                ))}
              </div>

              <div className="fld" style={{ marginTop: 16 }}>
                <label htmlFor="hs">
                  Your own instructions
                  <span className="hint">
                    Anything about how you want answers worded — your lecturer&apos;s layout, terms
                    to use or avoid, how much working to show. Saved on this device.
                  </span>
                </label>
                <textarea
                  id="hs"
                  value={houseStyle}
                  onChange={(e) => setHouseStyle(e.target.value)}
                  placeholder={
                    "e.g. State the principle from the standard first, then apply it to the facts, then conclude.\n" +
                    "Always show the deferred tax as a table of carrying amount / tax base / temporary difference.\n" +
                    "Use “statement of financial position”, never “balance sheet”."
                  }
                  style={{ minHeight: 120 }}
                />
              </div>

              {(houseStyle.trim() || stylePreset !== DEFAULT_PRESET) && (
                <button
                  type="button"
                  className="style-reset"
                  onClick={() => {
                    setHouseStyle("");
                    setStylePreset(DEFAULT_PRESET);
                  }}
                >
                  Reset to default
                </button>
              )}
            </div>
          )}
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
                <span className="spinner" />{" "}
                {mode === "scenario" ? "Working the scenario…" : "Working the transaction…"}
              </>
            ) : (
              <>
                <span className="font-mono">✎</span>{" "}
                {mode === "scenario" ? "Work it and answer the questions" : "Work the transaction"}
              </>
            )}
          </button>
          {loading && <span className="hint-inline">This can take up to a minute.</span>}
          {error && <span className="warn">{error}</span>}
        </div>
      </section>

      <section id="out">{data && <Result data={data} view={resultView} />}</section>

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
