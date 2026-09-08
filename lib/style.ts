export type StylePreset = {
  id: string;
  label: string;
  blurb: string;
  /** Extra system-level instruction appended to the prompt. Empty for the default. */
  instruction: string;
};

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "balanced",
    label: "Balanced",
    blurb: "Clear teaching answers with the reasoning shown. The default.",
    instruction: "",
  },
  {
    id: "exam",
    label: "Exam answer",
    blurb: "Tight, mark-earning prose. Principle → application → conclusion.",
    instruction:
      "Write every answer the way a student should write it under exam conditions: concise, in short paragraphs or bullets, leading with the principle from the standard, then applying it to the facts, then concluding. Do not pad. Show each calculation as a numbered working (W1, W2, …) that a marker can follow line by line.",
  },
  {
    id: "detailed",
    label: "Detailed tutorial",
    blurb: "Longer. Explains the why behind every step.",
    instruction:
      "Explain generously, as a tutor would in a tutorial: spell out why each step follows, define the terms you use, and tie the treatment back to the definition and recognition criteria in the standard. Prefer full sentences over terse bullets.",
  },
  {
    id: "plain",
    label: "Plain English",
    blurb: "Minimal jargon, for getting the concept first.",
    instruction:
      "Use plain, everyday English. Where a technical term is unavoidable, define it in brackets the first time you use it. Keep sentences short. The goal is that someone new to accounting can follow the logic before they learn the formal wording.",
  },
];

export const DEFAULT_PRESET = "balanced";

export function presetInstruction(id: string | undefined): string {
  const p = STYLE_PRESETS.find((x) => x.id === id);
  return p ? p.instruction : "";
}
