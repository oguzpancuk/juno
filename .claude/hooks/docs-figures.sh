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
exec python3 - "$@" <<'PY'
import re, sys, pathlib

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
# a decimal, or thousands grouped with spaces.
tokens = set(re.findall(r'\d+\.\d+(?:e-?\d+)?', block))
tokens |= set(re.findall(r'\d{1,3}(?:\s\d{3})+', block))
if not tokens:
    print('FAIL docs — the figures block holds no recognisable numbers',
          file=sys.stderr)
    sys.exit(1)

rest = text[:match.start()] + text[match.end():]
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
