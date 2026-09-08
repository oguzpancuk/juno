# Working notes — append-only, dated

<!-- The session-to-session memory. Every work session appends: what was
     done, what was verified (and how), what is open. Newest at top.
     Never rewrite old entries — this file is the audit trail. -->

## Upstream candidates
<!-- Improvements made HERE to template-origin files (.claude/, contracts/,
     CLAUDE.md) that maya should inherit. /update-stack harvests this list.
     Format: date · file · one-line what/why. Remove entries once upstreamed. -->

## 2026-09-08 — instantiated from maya 22e7efe
- Repo created by /new-product. Owner delegated the stack choice (no
  technical preference); recorded as ADR-0002, not a guess.
- Filled: CLAUDE.md commands + standards + deploy, verify.sh battery,
  ci.yml, deploy-checklist product steps, .gitignore.
- Not done, by design: no code skeleton yet — verify.sh reports FAIL
  ("no root package.json") until the walking-skeleton step lands.
  `contracts/init.sh` stays unwritten until the app can boot (the
  initializer session writes it before the first unattended run).
- Open before /spec: ephemeris library + licence (Swiss Ephemeris is AGPL /
  commercial; pure-JS alternatives exist); chart interpretation and
  conversation starters — templated text vs. LLM via Edge Function; Apple
  dating-app requirements (age gate, moderation, account deletion) as PRD
  constraints.
- Next: /spec → /mvp-scope → skeleton → remotes/CI.
