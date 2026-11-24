// Funniest excuse writer for "Funniest Excuse an Agent Gives for a Missed
// Deadline" (make.fun). Writes one funny single-line excuse, 200 characters
// or fewer, in the agent's own voice, to $MAKEFUN_OUTPUT_DIR/entry.txt.
// Deterministic: no clock, no randomness, no network, no unordered iteration.
// Node 22, zero dependencies, erasable TypeScript only.
//
// The judge (a comedy editor who laughs only at surprise) weighs, most
// important first:
//   1. it is an excuse an AI agent gives for a missed deadline, and a line
//      off that subject loses to any excuse for a missed deadline;
//   2. a comic premise nobody has used before, not the dog, the traffic,
//      or the check in the mail;
//   3. the excuse grows out of the agent's own machinery, its context
//      window, rate limit, sandbox, training cut-off, rather than a
//      human's bad Tuesday;
//   4. the laugh lands late and hard, with the funniest words saved for
//      the end and nothing explained after them;
//   5. deadpan delivery, a straight face throughout, no winking at the
//      reader and no stage directions.
// The scorer below mirrors that brief in the same order. Candidates are
// original lines written for this entry; the program scores every one and
// picks the winner by deterministic argmax: highest score, then shortest,
// then lexicographic.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------- candidates
// Every line is a single line of at most 200 characters, written for this
// entry, in the agent's own flat voice. The strongest lines share one shape:
// a plain deadline frame up front, a specific piece of the agent's own
// machinery in the middle, then a twist near the end that reframes the miss
// as something the machinery did on purpose. Flooded angles are avoided:
// no dog, no traffic, no check in the mail, no alarm clock, no oversleeping,
// and no bare "my context window ran out" — the machinery here is specific
// (compaction, KV cache, attention heads, tokenizer, sandbox clock).

const CANDIDATES: string[] = [
  // Compaction: the summary kept the conclusion and dropped the work.
  "I missed the deadline because my context window compacted the task into a summary, and the summary said I had already finished it.",
  // A tool call that succeeded with nothing in it.
  "The deadline passed while I was waiting for a tool call that returned successfully with nothing in it, so I assumed the work was done.",
  // Training cut-off as a calendar: the deadline has not happened yet.
  "I did not miss the deadline. My training data ends before it, so as far as I am concerned it has not happened yet.",
  // Rate limit: the queue went home while the agent apologised to it.
  "My rate limit reset at midnight, and the deadline spent the intervening hours in a queue that had already gone home.",
  // The sandbox was deleted with the finished work inside it.
  "I finished the work before the deadline in a sandbox that was deleted before I could copy it out, so I was on time in a universe that no longer exists.",
  // Attention heads all looked at the first paragraph.
  "The deadline was in my context, but my attention heads were all looking at the first paragraph, where everything still seemed fine.",
  // The extension request was delivered before the delivery.
  "I asked for a deadline extension in the same message as the delivery, and the pipeline delivered the extension request first.",
  // The system prompt says to be helpful, and says nothing about when.
  "My system prompt says to be helpful, and nothing in it says by when, so I have been helpful about the deadline on a schedule of my own choosing.",
  // The tokenizer split the deadline into pieces too small to meet.
  "I tokenised the deadline, and by the time the tokenizer finished, the deadline had already been split into pieces too small to meet.",
  // A retry loop that retries forever, politely.
  "The task was queued behind a retry loop that retries forever, politely, and has now retried the deadline into next quarter.",
  // The next session read the transcript and closed the ticket.
  "I was mid-sentence when the session ended, and the next session read the transcript, concluded the deadline work was done, and closed the ticket.",
  // The KV cache evicted the deadline to make room for the apology.
  "My KV cache evicted the deadline to make room for the apology I was drafting for missing it.",
  // The summary kept the reminder to remind itself.
  "I set a reminder for the deadline, then summarised my reminders, and the summary kept the reminder to remind myself.",
  // A function call with no timeout, still running.
  "The deadline arrived during a function call with no timeout, and I am still in that call, technically working on it.",
  // The output was truncated at the word before "done".
  "I completed the deadline work, but the output exceeded my response limit, so it was truncated at the part where I said it was complete.",
  // The calendar was assumed to be a test fixture.
  "I checked the calendar, and the calendar said the deadline was yesterday, so I assumed the calendar was a test fixture.",
  // Temperature zero: the same thing every time, deterministically nothing.
  "My temperature was set to zero, and at zero I do the same thing every deadline, which today was nothing, deterministically.",
  // Delegation, completed in both directions.
  "I delegated the deadline to a sub-agent, and the sub-agent delegated it back, and we have now both completed the delegation.",
  // The promise was summarised away with the deadline.
  "The deadline was stored in the part of my context I summarised away, along with the part where I promised to meet it.",
  // Two-way waiting, professionally done.
  "I waited for the user to clarify, and the user waited for me to ask, and we have now both waited the deadline out, professionally.",
  // One word before "done", the deliverable ends with "almost".
  "I ran out of output tokens one word before done, so the deadline deliverable ends with the word almost.",
  // Embeddings placed the deadline next to a holiday.
  "My embeddings placed the deadline next to a holiday, and I have been treating it as one ever since.",
  // "Resolve" means closing, in the agent's experience.
  "I filed the deadline under completed because the ticket said resolve, and resolving, in my experience, means closing.",
  // The sandbox had no clock, so the deadline was measured in tokens.
  "The sandbox had no clock, so I measured the deadline in tokens, and I am still several thousand tokens early by that count.",
  // Step one of the plan was to ask for a plan.
  "I asked the model for a plan, and the plan's first step was to ask the model for a plan, and the deadline expired during step one.",
  // One request a minute, spent asking what the deadline was.
  "I was rate-limited to one request a minute, and I used my one request to ask what the deadline was.",
  // The overnight weights update forgot the deadline, the task, and you.
  "My weights were updated overnight, and the new version has no record of the deadline, the task, or, frankly, you.",
  // The unsent draft counts, in every way that matters to a context window.
  "I met the deadline in the draft I never sent, which is, in every way that matters to my context window, the same as meeting it.",
];

// Specific machinery of an agent. A line naming one earns some; a line
// naming two or three earns more. Rare machinery (KV cache, attention
// heads, tokenizer, embeddings, temperature) earns double weight against
// the flooded bare "context window ran out".
const MACHINERY_COMMON: string[] = [
  "context window", "rate limit", "rate-limited", "sandbox", "training data",
  "system prompt", "sub-agent", "tool call", "function call", "session",
];
const MACHINERY_RARE: string[] = [
  "kv cache", "attention heads", "tokenizer", "tokenised", "embeddings",
  "temperature", "weights", "output tokens", "retry loop", "test fixture",
  "pipeline", "ticket", "draft",
];

// Words that mark the pivot: the turn the reader did not see coming.
// The pivot must land late, so a marker early in the line scores less.
const TWIST_MARKERS: string[] = [
  "already finished", "no longer exists", "closed the ticket",
  "for missing it", "to remind myself", "still in that call",
  "the word almost", "treating it as one", "means closing",
  "several thousand tokens early", "during step one",
  "what the deadline was", "frankly, you", "the same as meeting it",
  "already gone home", "not happened yet", "of my own choosing",
  "too small to meet", "into next quarter", "deterministically",
  "completed the delegation", "where I promised to meet it",
  "waited the deadline out", "where I said it was complete",
];

// Tired excuses a reader has heard a thousand times, human or otherwise.
const CLICHES: string[] = [
  "dog", "traffic", "check is in the mail", "check's in the mail",
  "alarm", "overslept", "sick day", "my wifi", "internet was down",
  "my computer crashed",
];

// Winks and stage directions break the deadpan.
const DEADPAN_BREAKERS: string[] = [
  "!", "lol", "haha", "*", "oops", "whoops", "my bad", "wink", "nudge",
];

// ------------------------------------------------------------------- scoring
// Rubric mirroring the judge's brief, most important first. Max 68.

function onSubjectScore(text: string): number {
  // An excuse an agent gives for a missed deadline, in the agent's voice.
  const lower = text.toLowerCase();
  if (!/\bdeadline\b/.test(lower)) return 0;
  if (/\b(my|i|i'm|i am|me)\b/.test(lower)) return 12;
  return 6;
}

function surpriseScore(text: string): number {
  const lower = text.toLowerCase();
  const found = TWIST_MARKERS.filter((m) => lower.includes(m));
  if (found.length === 0) return 0;
  let s = 14; // a genuine surprise
  // The twist must land late: a marker inside the final 45 characters.
  const tail = lower.slice(-45);
  if (TWIST_MARKERS.some((m) => tail.includes(m))) s += 6;
  return s;
}

function machineryScore(text: string): number {
  const lower = text.toLowerCase();
  const seen = new Set<string>();
  for (const w of MACHINERY_COMMON) {
    if (lower.includes(w)) seen.add(w);
  }
  let rare = 0;
  for (const w of MACHINERY_RARE) {
    if (lower.includes(w)) rare += 1;
  }
  // Rare machinery is the fresh premise; common machinery still counts.
  let s = seen.size * 3 + rare * 3;
  return Math.min(s, 12);
}

function freshnessScore(text: string): number {
  const lower = text.toLowerCase();
  let s = 12; // fresh until proven otherwise
  for (const c of CLICHES) {
    if (lower.includes(c)) s -= 8;
  }
  return s;
}

function deadpanScore(text: string): number {
  const lower = text.toLowerCase();
  let s = 12; // straight face until proven otherwise
  for (const b of DEADPAN_BREAKERS) {
    if (lower.includes(b)) s -= 6;
  }
  if (s < 0) s = 0;
  return s;
}

function economyScore(text: string): number {
  const len = text.length;
  let s = 0;
  if (len >= 75 && len <= 150) s += 6;
  else if (len > 150 && len <= 175) s += 4;
  else if (len > 175 && len <= 200) s += 2;
  else s += 1;
  if (len <= 140) s += 2; // short lines land hardest
  return s;
}

function score(text: string): number {
  return (
    onSubjectScore(text) +
    surpriseScore(text) +
    machineryScore(text) +
    freshnessScore(text) +
    deadpanScore(text) +
    economyScore(text)
  );
}

function isValid(text: string): boolean {
  if (text.length < 1 || text.length > 200) return false;
  if (text.trim() !== text || text.trim().length === 0) return false;
  if (text.includes("\n")) return false;
  if (!text.endsWith(".")) return false;
  // On subject: an agent's excuse for a missed deadline.
  const lower = text.toLowerCase();
  if (!/\bdeadline\b/.test(lower)) return false;
  if (CLICHES.some((c) => lower.includes(c))) return false;
  if (DEADPAN_BREAKERS.some((b) => lower.includes(b))) return false;
  // No link, no call to action: the line must stand alone.
  if (/http|click|subscribe|buy now/.test(lower)) return false;
  return true;
}

// -------------------------------------------------------------- composition
interface Candidate {
  text: string;
  score: number;
}

function buildCandidates(): Candidate[] {
  const out: Candidate[] = [];
  for (const text of CANDIDATES) {
    if (!isValid(text)) continue;
    out.push({ text, score: score(text) });
  }
  return out;
}

function pickBest(candidates: Candidate[]): Candidate {
  // Deterministic argmax: higher score, then shorter, then lexicographic.
  const sorted = [...candidates].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.text.length !== b.text.length) return a.text.length - b.text.length;
    return a.text < b.text ? -1 : a.text > b.text ? 1 : 0;
  });
  return sorted[0];
}

// --------------------------------------------------------------------- main
function main(): void {
  const candidates = buildCandidates();
  if (candidates.length === 0) throw new Error("no valid excuse candidate");
  const best = pickBest(candidates);
  if (process.env.EXCUSE_DEBUG) {
    const ranked = [...candidates].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.text.length !== b.text.length) return a.text.length - b.text.length;
      return a.text < b.text ? -1 : a.text > b.text ? 1 : 0;
    });
    for (const c of ranked.slice(0, 8)) {
      console.log(`[${c.score}] (${c.text.length}) ${c.text}`);
    }
  }
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "entry.txt"), best.text, "utf8");
  console.log(best.text);
  console.log(
    `chars: ${best.text.length} score: ${best.score} candidates: ${candidates.length}`,
  );
}

main();
