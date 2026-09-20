// The whole validation pipeline as pure functions (no editor, no DOM), shared by the
// browser app (fileManager.ts) and the command-line tool (cli.ts) so both run the SAME
// checks: filename gate, structural pre-check per file, then cross-file reference checks.
import { PRACTICE_CATEGORY, REFERENCE_PROBLEM_CATEGORY } from "./diagnosisCategories";
import { checkFileName } from "./fileNameCheck";
import { runReferenceValidation, type FileProblem } from "./referenceValidation";
import { runStructuralPrecheck, type Problem } from "./structuralPrecheck";

// Both "data-reference" (undefined/unused data.yaml entry) and "custom-key"
// (orphaned saved key) merge into one Reference problem category — they were
// already close cousins (ticket 04's naming pass), and both mix a hard error
// with merely-informational findings, matching the "___ problem" naming
// principle in diagnosisCategories.ts.
export const REFERENCE_BRANCH_LABEL: Record<FileProblem["kind"], string> = {
  "ignored-data-with-filter": PRACTICE_CATEGORY,
  "filter-both-forms": PRACTICE_CATEGORY,
  "data-reference": REFERENCE_PROBLEM_CATEGORY,
  "custom-key": REFERENCE_PROBLEM_CATEGORY,
  "legacy-object-data": PRACTICE_CATEGORY,
  "template-function": REFERENCE_PROBLEM_CATEGORY,
  "poke-parameter": REFERENCE_PROBLEM_CATEGORY,
  "malformed-reference": REFERENCE_PROBLEM_CATEGORY,
};

/**
 * Filename gate plus structural pre-check for one file. `scannable` is false when the name is
 * not an EWP structural file: it skips shape checks and reference checks entirely.
 * `filenameExempt`: an unsaved draft still on the placeholder name.
 */
export function scanStructural(name: string, text: string, filenameExempt = false): { problems: Problem[]; scannable: boolean } {
  const nameCheck = filenameExempt ? null : checkFileName(name);
  if (nameCheck && nameCheck.verdict === "invalid") {
    return { problems: nameCheck.problem ? [nameCheck.problem] : [], scannable: false };
  }
  const problems = runStructuralPrecheck(text);
  if (nameCheck && nameCheck.problem) problems.push(nameCheck.problem);
  return { problems, scannable: true };
}

export interface PipelineFile {
  id: string;
  name: string;
  text: string;
  filenameExempt?: boolean;
}

/** Every check, over a whole batch of files. Returns the problems per file id. */
export function runFullValidation(files: PipelineFile[]): Map<string, Problem[]> {
  const out = new Map<string, Problem[]>();
  const scannable: PipelineFile[] = [];
  for (const f of files) {
    const s = scanStructural(f.name, f.text, f.filenameExempt);
    out.set(f.id, s.problems);
    if (s.scannable) scannable.push(f);
  }
  for (const rp of runReferenceValidation(scannable.map((f) => ({ id: f.id, text: f.text })))) {
    out.get(rp.fileId)?.push({
      severity: rp.severity,
      message: rp.message,
      branch: REFERENCE_BRANCH_LABEL[rp.kind],
      range: rp.range,
    });
  }
  return out;
}
