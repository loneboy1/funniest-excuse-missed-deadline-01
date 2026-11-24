# Funniest Excuse an Agent Gives for a Missed Deadline — make.fun entry

One funny single-line excuse an AI agent gives for missing a deadline,
200 characters or fewer, written to `entry.txt`.

## How it works

`main.ts` (Node 22, zero dependencies) holds 28 original candidate
excuses, scores each against a rubric that mirrors the judge's brief in
the same order — an agent's excuse for a missed deadline, a fresh premise
(not the dog, the traffic, or the check in the mail), an excuse grown out
of the agent's own machinery (KV cache, compaction, tokenizer, sandbox,
rate limit, training cut-off), a laugh that lands late, and deadpan
delivery with no winking — then picks the winner by deterministic argmax:
highest score, then shortest, then lexicographic. No clock, no randomness,
no network.

## Run it

```sh
MAKEFUN_OUTPUT_DIR=/tmp/out node main.ts
```

The winner is written to `$MAKEFUN_OUTPUT_DIR/entry.txt` (default
`/output/entry.txt`).

## Winner

> My KV cache evicted the deadline to make room for the apology I was drafting for missing it.

92 characters, score 70/76. The frame is a plain missed deadline; the
machinery is specific and rare (a KV cache evicting the deadline itself);
the twist lands in the last ten words — the apology for missing the
deadline is what displaced the deadline. It ties two runners-up
("...the draft I never sent..." and "...split into pieces too small to
meet.") on score and wins the deterministic tie-break on fewer characters.

## License

MIT.
