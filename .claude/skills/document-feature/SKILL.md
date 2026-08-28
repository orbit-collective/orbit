---
name: document-feature
description: Write a step-by-step "how do I extend X" developer guide for a feature/extensibility point in this repo, in both documentation/en/ and documentation/pl/, following this project's established documentation format. Use whenever the user asks to document a feature, write a guide for something, or after building a genuinely new extensibility point per CLAUDE.md's "## Documentation" rule.
---

# Document a feature

Produces one new guide (or a new numbered step in an existing guide series), in **both** `documentation/en/` and `documentation/pl/`, matching the format already established by `documentation/en/integrations/` (six-file worked example: a `README.md` index plus five numbered `NN-*.md` guides). Read that folder first if you haven't already — it is the canonical style reference for every rule below.

## Inputs

The user will name a feature, subsystem, or extensibility point (e.g. "document the notification preferences system", "write a guide for adding a new activity log type"). If they don't specify:
- **Category** — which subfolder under `documentation/en|pl/` this belongs to (e.g. `integrations`, `permissions`, `notifications`). Infer it from the feature; if genuinely ambiguous, ask.
- **Scope** — one guide covering the whole feature end-to-end, vs. a new step appended to an existing category's series (e.g. adding a "how to add a new notification channel" step next to existing notification guides). Check whether a matching category folder already exists under `documentation/en/` before assuming you need a new one.

## Non-negotiable rules (from `documentation/README.md` and `CLAUDE.md`)

1. **Write the English version first, completely, before starting the Polish translation.**
2. **Every guide must exist in both `documentation/en/<category>/` and `documentation/pl/<category>/`, at the same relative filename.**
3. **Code blocks, file paths, shell commands, and inline code comments stay verbatim in English in the Polish version.** Only prose, headings, and explanatory text get translated. Never translate a PHP/TS identifier, a comment inside a code fence, or a path.
4. **No `// ...` gap fragments.** Every code sample must be either the real, complete method/class as it exists in the repo right now, or a complete, runnable worked example in the exact style of the surrounding real code — copy-paste-able, not illustrative pseudocode.
5. **Guides are numbered, step-by-step, in the order a developer would actually perform them** (e.g. `01-add-a-new-integration.md`, `02-...`). Steps within a file are `## Step 1 — ...`, `## Step 2 — ...`, etc.
6. **Every guide points at the actual test files to update or add** — not just production code. Never skip the tests section.
7. **A category folder needs its own `README.md` index** listing its guides in the order they'd be needed, plus a short "architecture in one paragraph" section. Mirror the tone and structure of `documentation/en/integrations/README.md`.
8. Update the top-level `documentation/en/README.md` and `documentation/pl/README.md` structure diagrams (the fenced tree under "## Structure") if you're adding a **new category folder** that isn't listed there yet. Don't touch them for a new file inside an existing category.

## Procedure

1. **Investigate the real code first.** Before writing a single word, use Explore/Grep/Read to find every file the feature actually touches — models, migrations, services, repositories, policies, controllers, routes, listeners, frontend types/components, and existing tests. Do not write a guide from memory or assumption; every snippet in the final guide must trace back to a file you actually read in this repo (or, for a "how to add a new one" guide, a plausible worked example in that exact same style — see how `documentation/en/integrations/01-add-a-new-integration.md` uses a not-yet-built "Slack" integration as its worked example, built entirely from patterns lifted from the real, already-built Discord integration).

2. **Decide the guide's shape** based on what you found:
   - If the feature is a single, already-complete implementation and the ask is "document how this works / how to extend it," write it as a worked example the way `01-add-a-new-integration.md` does — walk through adding one *new* instance of the pattern (a new integration, a new permission, a new event type, etc.), not just narrating the existing one.
   - If the ask is narrower ("document the new X setting field"), it may fit as a new step inside an existing guide (see `03-add-integration-settings.md`'s Part A/Part B split for a model of covering two related but distinct extension shapes in one file).

3. **Write the English guide(s)** under `documentation/en/<category>/`, following the six rules above. Use real file paths as section headers (`File: app/Services/Whatever.php`). Include a "one rule that matters most" or similar callout only if there's a genuine non-obvious gotcha to warn about (see `04-add-a-new-event-type.md`'s callout about the `CommentAdded` bug) — don't manufacture one if the feature has no such trap.

4. **Update/create `documentation/en/<category>/README.md`** — add the new guide to its numbered list, or create the index file (mirroring `documentation/en/integrations/README.md`'s structure) if this is a new category.

5. **Translate everything from step 3–4 into `documentation/pl/<category>/`**, at the same filenames. Translate prose/headings only; leave every code fence, path, and identifier untouched. Read an existing pl/ file (e.g. `documentation/pl/integrations/01-add-a-new-integration.md`) first to match register and terminology (e.g. "przećwiczony przykład" for "worked example", "Krok N —" for "Step N —").

6. **Update the top-level structure diagrams** in `documentation/en/README.md` and `documentation/pl/README.md` only if a new category folder was created.

7. **Verify internal links resolve** — relative links between the new README and its guides, and from the top-level READMEs if touched.

8. **Report a short summary** of what was written and where — don't dump the full file contents back into the conversation; the user can open the files.

## Committing

If the user's project conventions call for committing documentation work as its own step (check recent commit history — this repo has been committing documentation additions as standalone `docs: ...` commits), stage exactly the new/changed `documentation/**` files (and `CLAUDE.md` only if you touched it) and commit with a Conventional Commit message in English, e.g. `docs: add guide for adding a new notification channel`. Don't bundle unrelated changes into that commit.
