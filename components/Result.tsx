"use client";

import type { LedgerOutput } from "@/lib/schema";

function esc(s: string | undefined | null) {
  return s ?? "";
}

function classifyEffect(effect: string): { cls: string; arrow: string } {
  const e = (effect || "").toLowerCase();
  if (/incr|inflow/.test(e)) return { cls: "up", arrow: "▲ " };
  if (/decr|outflow/.test(e)) return { cls: "down", arrow: "▼ " };
  return { cls: "", arrow: "" };
}

function fmtAmount(n: number | null | undefined): string {
  if (n === null || n === undefined) return "";
  const v = Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  return "R " + v.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function Result({ data }: { data: LedgerOutput }) {
  let delay = 0;
  const nextDelay = () => (delay += 0.09).toFixed(2);

  const fsMap: Array<[keyof LedgerOutput["financialStatementImpact"], string]> = [
    ["statementOfFinancialPosition", "Statement of financial position"],
    ["statementOfProfitOrLoss", "Statement of profit or loss & OCI"],
    ["statementOfChangesInEquity", "Statement of changes in equity"],
    ["statementOfCashFlows", "Statement of cash flows"],
  ];

  return (
    <section>
      {/* Transaction summary */}
      <div className="sec" style={{ animationDelay: nextDelay() + "s" }}>
        <h3>The transaction, classified</h3>
        <div className="rule"></div>
        <div className="summary-card">
          {data.classification && <div className="cls">{esc(data.classification)}</div>}
          <p>{esc(data.transactionSummary)}</p>
        </div>
        {data.relevantStandards?.length > 0 && (
          <div className="std-chips">
            {data.relevantStandards.map((s, i) => (
              <span className="std-chip" key={i}>
                {esc(s)}
              </span>
            ))}
          </div>
        )}
        {data.assumptions?.length > 0 && (
          <div className="assump">
            <b>Assumptions</b>
            {data.assumptions.map(esc).join(" · ")}
          </div>
        )}
      </div>

      {/* Journal entries */}
      {data.journalEntries?.length > 0 && (
        <div className="sec" style={{ animationDelay: nextDelay() + "s" }}>
          <h3>Journal entries</h3>
          <div className="rule"></div>
          <h4>The double entry</h4>
          {data.journalEntries.map((je, idx) => {
            let dT = 0;
            let cT = 0;
            return (
              <div className="je" key={idx}>
                <div className="je-head">
                  <span className="je-narr">{esc(je.narration)}</span>
                  {je.date && <span className="je-date">{esc(je.date)}</span>}
                </div>
                <table className="ledger">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th className="num">Debit</th>
                      <th className="num">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {je.lines.map((l, i) => {
                      const isC = l.credit !== null && l.credit !== undefined;
                      if (typeof l.debit === "number") dT += l.debit;
                      if (typeof l.credit === "number") cT += l.credit;
                      return (
                        <tr key={i}>
                          <td className={"acct" + (isC ? " credit-acct" : "")}>
                            {esc(l.account)}
                            {l.statement && (
                              <span className="stmt">{esc(l.statement)}</span>
                            )}
                          </td>
                          <td className="num debit">{fmtAmount(l.debit)}</td>
                          <td className="num credit">{fmtAmount(l.credit)}</td>
                        </tr>
                      );
                    })}
                    {(dT > 0 || cT > 0) && (
                      <tr className="total">
                        <td className="acct">Total</td>
                        <td className="num debit">{fmtAmount(dT)}</td>
                        <td className="num credit">{fmtAmount(cT)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {je.explanation && (
                  <div className="je-exp">
                    <b>Why</b>
                    {esc(je.explanation)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Financial statement impact */}
      {(() => {
        const blocks = fsMap
          .map(([key, title]) => {
            const arr = data.financialStatementImpact[key];
            if (!arr || arr.length === 0) return null;
            return (
              <div className="fs-block" key={key}>
                <p className="fs-title">{title}</p>
                <table className="fs">
                  <tbody>
                    {arr.map((r, i) => {
                      const { cls, arrow } = classifyEffect(r.effect);
                      return (
                        <tr key={i}>
                          <td className="line">{esc(r.line)}</td>
                          <td className="eff">
                            <span className={cls}>
                              <span className="arrow">{arrow}</span>
                              {esc(r.effect)}
                            </span>
                          </td>
                          <td className="amt">{esc(r.amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })
          .filter(Boolean);
        if (blocks.length === 0) return null;
        return (
          <div className="sec" style={{ animationDelay: nextDelay() + "s" }}>
            <h3>Effect on the financial statements</h3>
            <div className="rule"></div>
            <h4>Where it lands</h4>
            {blocks}
          </div>
        );
      })()}

      {/* Year-by-year view (multi-period transactions only) */}
      {data.periods?.length > 0 && data.periodTables?.length > 0 && (
        <div className="sec" style={{ animationDelay: nextDelay() + "s" }}>
          <h3>Year by year</h3>
          <div className="rule"></div>
          <h4>Across the reporting periods</h4>
          {data.periodTables.map((t, ti) => (
            <div className="year-block" key={ti}>
              {t.title && <p className="fs-title">{esc(t.title)}</p>}
              <div className="year-scroll">
                <table className="yeartable">
                  <thead>
                    <tr>
                      <th className="rowhead"></th>
                      {data.periods.map((p, pi) => (
                        <th className="num" key={pi}>
                          {esc(p)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows.map((r, ri) => {
                      const isHeading = r.kind === "section" || r.kind === "subheading";
                      return (
                        <tr key={ri} className={r.kind}>
                          <td className="rowhead">{esc(r.label)}</td>
                          {data.periods.map((_, pi) => (
                            <td className="num" key={pi}>
                              {isHeading ? "" : esc(r.values?.[pi])}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Accounting policy note */}
      {data.accountingPolicyNote && (
        <div className="sec" style={{ animationDelay: nextDelay() + "s" }}>
          <h3>Accounting policy note</h3>
          <div className="rule"></div>
          <div className="policy-note prose">
            <p>{esc(data.accountingPolicyNote)}</p>
          </div>
        </div>
      )}

      {/* Disclosures */}
      {data.disclosures?.length > 0 && (
        <div className="sec" style={{ animationDelay: nextDelay() + "s" }}>
          <h3>Notes &amp; disclosures required</h3>
          <div className="rule"></div>
          <h4>What must be disclosed</h4>
          {data.disclosures.map((d, i) => (
            <div className="disc" key={i}>
              <div className="d-head">
                <span className="d-std">{esc(d.standard)}</span>
                <span className="d-req">{esc(d.requirement)}</span>
              </div>
              {d.example && (
                <div className="d-ex">
                  <b>Illustrative wording</b>
                  {esc(d.example)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tax */}
      {data.tax && (
        <div className="sec" style={{ animationDelay: nextDelay() + "s" }}>
          <h3>South African tax treatment</h3>
          <div className="rule"></div>
          <h4>The SARS view</h4>
          <div className="tax-grid">
            {data.tax.incomeTax && (
              <div className="tax-card">
                <div className="t-lab">Income tax</div>
                <p>{esc(data.tax.incomeTax)}</p>
              </div>
            )}
            {data.tax.deferredTax && (
              <div className="tax-card">
                <div className="t-lab">Deferred tax (IAS 12)</div>
                <p>{esc(data.tax.deferredTax)}</p>
              </div>
            )}
            {data.tax.vat && (
              <div className="tax-card">
                <div className="t-lab">VAT</div>
                <p>{esc(data.tax.vat)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Teaching notes */}
      {data.teachingNotes && (
        <div className="sec teach" style={{ animationDelay: nextDelay() + "s" }}>
          <h3>For the exam</h3>
          <div className="rule"></div>
          <div className="prose">
            <p>{esc(data.teachingNotes)}</p>
          </div>
        </div>
      )}
    </section>
  );
}
