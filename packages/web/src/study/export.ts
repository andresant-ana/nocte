import type { CompletedRoundRecord, QuestionnaireAnswers } from "./protocol";

const columns = [
  "protocolVersion", "gameVersion", "rulesId", "streamVersion", "poolVersion", "poolCatalogVersion",
  "solverVersion", "stage", "seed", "index", "dealerBucket", "decisionClass", "initialCards", "dealerUp",
  "composition", "compositionDurationMs", "actions", "finalHands", "settlement", "score", "chosenEv", "bestEv", "regret", "questionnaire",
] as const;

export function serializeJson(records: readonly CompletedRoundRecord[], answers: QuestionnaireAnswers = {}): string {
  return JSON.stringify({ schemaVersion: "p2a-export-v1", records, questionnaire: answers }, null, 2);
}

function csvCell(value: unknown): string {
  const text = value === undefined || value === null ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

function row(record: CompletedRoundRecord | undefined, answers: QuestionnaireAnswers): string {
  const values = columns.map((column) => column === "questionnaire" ? JSON.stringify(answers) : record?.[column]);
  return values.map(csvCell).join(",");
}

export function serializeCsv(records: readonly CompletedRoundRecord[], answers: QuestionnaireAnswers = {}): string {
  const header = columns.map(csvCell).join(",");
  const data = records.length ? records.map((record) => row(record, answers)) : [row(undefined, answers)];
  return [header, ...data].join("\r\n") + "\r\n";
}

export function downloadRecords(format: "json" | "csv", records: readonly CompletedRoundRecord[], answers: QuestionnaireAnswers): void {
  const content = format === "json" ? serializeJson(records, answers) : serializeCsv(records, answers);
  const blob = new Blob([content], { type: format === "json" ? "application/json;charset=utf-8" : "text/csv;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = `nocte-p2a-study.${format}`;
  anchor.click();
  URL.revokeObjectURL(href);
}
