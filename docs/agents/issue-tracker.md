# Issue tracker: local markdown

Issues and specs for this repo live as markdown files in `.scratch/`.

## Conventions

- Give each feature a `.scratch/<feature-slug>/` directory and put its spec in `spec.md`.
- Put each implementation issue in `.scratch/<feature-slug>/issues/<NN>-<slug>.md`. Number issues from `01`.
- Record triage state on a `Status:` line near the top of each issue. Use the values in [triage labels](triage-labels.md).
- Append comments and conversation history under `## Comments` at the bottom of the issue.

## When a skill says "publish to the issue tracker"

Create the appropriate spec or issue file under `.scratch/<feature-slug>/`. Create the directory if needed.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. If given an issue number, find the matching file in that feature's `issues/` directory.

## Wayfinding operations

For wayfinding work, keep a map file and one child file per ticket.

- The map lives at `.scratch/<effort>/map.md` and records notes, decisions, and open questions.
- A child ticket lives at `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`. Put the question in its body. Use `Type:` for `research`, `prototype`, `grilling`, or `task`, and `Status:` for `claimed` or `resolved`.
- List dependencies near the top as `Blocked by: NN, NN`. A ticket is unblocked when every listed ticket is `resolved`.
- To find the next ticket, scan for the first unclaimed, unresolved, unblocked file by number.
- Before work, set `Status: claimed` and save the file.
- On completion, add the answer under `## Answer`, set `Status: resolved`, and add a short summary and link to the map's decisions.
