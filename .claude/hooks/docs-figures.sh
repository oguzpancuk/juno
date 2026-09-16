#!/usr/bin/env bash
# Measured figures must be cited, not copied.
#
# Six code-review rounds on the ADR-0009 work went almost entirely to one
# defect: a number derived from a measurement was restated in a second
# sentence, a correction landed in the first, and the second silently became
# a lie. The structural answer was to put every such figure in one block and
# have everything else cite it. This step keeps that property.
#
# It reads the fenced block under "**Measured figures**" in
# docs/adr/0009-presentation.md, takes every distinctive number in it (one
# with a decimal point, or grouped thousands), and fails if any of them
# appears anywhere else under docs/. Exempt: docs/NOTES.md, which is
# append-only history and is meant to hold superseded figures, and
# docs/design-brief.md, which is stale by declaration until it is
# regenerated.
set -uo pipefail
cd "$(dirname "$0")/../.."
if ! command -v python3 >/dev/null 2>&1; then
  echo "FAIL docs — python3 not found; this step needs it (see CLAUDE.md)" >&2
  exit 1
fi
exec python3 - "$@" <<'PY'
import re, sys, pathlib

# The repo is the memory, so an empty memory is a failure the battery has
# to see. A script that opened docs/ROADMAP.md for writing and then threw
# before writing left it at zero bytes, and a commit carried it with every
# gate green (2026-09-16). These two files are the ones a session reads to
# know what to do next; a floor on each is enough to catch a truncation,
# and it cannot be met by accident.
FLOORS = {'docs/ROADMAP.md': ('# Juno — Roadmap', 200),
          'docs/NOTES.md': ('# Working notes', 200)}
for name, (heading, min_lines) in FLOORS.items():
    doc = pathlib.Path(name)
    if not doc.exists():
        print(f'FAIL docs — {name} is missing', file=sys.stderr)
        sys.exit(1)
    body = doc.read_text()
    if not body.lstrip().startswith(heading):
        print(f'FAIL docs — {name} does not start with "{heading}"; '
              'truncated or overwritten?', file=sys.stderr)
        sys.exit(1)
    if len(body.splitlines()) < min_lines:
        print(f'FAIL docs — {name} is {len(body.splitlines())} lines, under '
              f'the {min_lines} it has long exceeded; truncated?',
              file=sys.stderr)
        sys.exit(1)

BLOCK_FILE = pathlib.Path('docs/adr/0009-presentation.md')
EXEMPT = {'docs/NOTES.md', 'docs/design-brief.md'}

if not BLOCK_FILE.exists():
    print(f'FAIL docs — {BLOCK_FILE} is missing', file=sys.stderr)
    sys.exit(1)

text = BLOCK_FILE.read_text()
match = re.search(r'\*\*Measured figures\*\*.*?\n```\n(.*?)\n```', text, re.S)
if match is None:
    print('FAIL docs — no "**Measured figures**" fenced block in '
          f'{BLOCK_FILE}; every measured number needs one home', file=sys.stderr)
    sys.exit(1)
block = match.group(1)

# Distinctive enough that a match elsewhere is a copy, not a coincidence:
# a decimal, thousands grouped with spaces, or an integer of three or more
# digits. Two-digit integers are deliberately NOT guarded — the block holds
# 16, 18, 30, 56, 62, 67, 75, 80 and 93, and those collide with ordinary
# prose too often to gate on. They are the gap in this check: a two-digit
# figure copied into a sentence still has to be caught by review.
decimals = re.findall(r'\d+\.\d+(?:e-?\d+)?', block)
grouped = re.findall(r'\d{1,3}(?:\s\d{3})+', block)
tokens = set(decimals) | set(grouped)
# Plain integers come from what is left after the compound forms are cut
# out: matching them in place would shred `61.7061` into `7061` and a
# grouped thousand into `124` and `250`, and then a stray port number under
# docs/ would fail the battery with a message that was not true.
remainder = block
for compound in decimals + grouped:
    remainder = remainder.replace(compound, ' ')
tokens |= set(re.findall(r'\d{3,}', remainder))
if not tokens:
    print('FAIL docs — the figures block holds no recognisable numbers',
          file=sys.stderr)
    sys.exit(1)

# Blank the block's lines rather than splicing them out, so reported line
# numbers in this file stay true.
lines = text.splitlines()
blanked = [
    '' if text.count('\n', 0, match.start()) <= i < text.count('\n', 0, match.end())
    else line
    for i, line in enumerate(lines)
]
rest = '\n'.join(blanked)
sources = [(str(BLOCK_FILE), rest)]
for path in sorted(pathlib.Path('docs').rglob('*.md')):
    if str(path) in EXEMPT or path == BLOCK_FILE:
        continue
    sources.append((str(path), path.read_text()))

problems = []
for token in sorted(tokens):
    pattern = re.compile(r'(?<![\d.])' + re.escape(token) + r'(?![\d])')
    for name, body in sources:
        for line_no, line in enumerate(body.splitlines(), 1):
            if pattern.search(line):
                problems.append(f'  {name}:{line_no}  {token}  {line.strip()[:70]}')

if problems:
    print('FAIL docs — measured figures copied outside ADR-0009\'s figures '
          'block; cite the block instead of restating the number:',
          file=sys.stderr)
    print('\n'.join(problems), file=sys.stderr)
    sys.exit(1)

print(f'{len(tokens)} figures, each in one place')
PY
