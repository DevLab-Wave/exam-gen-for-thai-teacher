# AGENTS.md

Thai exam → `.docx` generator. SvelteKit (Svelte 5) + Tailwind + docx.js. 100% client-side.

## Commands
- `bun install` (or `npm install`) — both `bun.lock` and `package-lock.json` are present
- `bun run dev` — `vite dev --host`, http://localhost:5173
- `bun run build` — static site to `build/` (adapter-static)
- `bun run check` — the only verification step: `svelte-kit sync && svelte-check`. No test or lint setup exists.

## Architecture / constraints
- No SSR: `src/routes/+layout.ts` sets `ssr=false`, `prerender=false`; adapter uses SPA fallback. Everything runs in the browser (localStorage, File API, docx). Do not add server-only code or server `load` functions.
- Global state lives in `src/lib/state.svelte.ts`. Mutate properties (`app.settings.columns = 2`); never reassign `app`. Persisted to localStorage key `examdoc:v1`: loaded once in `+layout.svelte` `onMount`, auto-saved by a deep `$effect` (it reads `JSON.stringify(app)` to track everything).
- Svelte 5 runes only (`$state` / `$props` / `$derived` / `$effect`). Call `$state.snapshot()` before handing objects to third-party libs (docx, file-saver) or cloning (see `QuestionEditor`).
- Thai-first: UI text, code comments, and docs are in Thai. Keep them that way.

## Data model (`src/lib/types.ts`)
- `Question.kind` = `'choice' | 'written'` (undefined = choice). Written questions have no choices; `answerLines` = blank bordered lines to write on.
- `Question.text`/choices support rich markup (`^{}`, `_{}`, `{img:<id>}`) parsed by `src/lib/richtext.ts`. Inline images live in `Question.inlineImages` (`InlineImage`).
- `Question.partId` links a question to a `Part` (ตอน: title + instructions). `app.parts` is ordered; parts render as headings.
- `DocSettings` header fields: `school`, `mainHeading`, `examTitle`, `instructions`, `subject`, `subjectCode`, `classLevel`.

## docx generation (`src/lib/docx/generateExamDocx.ts`)
- Units are DXA (1440/inch). Runs set font on `ascii`/`hAnsi`/`eastAsia`/`cs` **and** `sizeComplexScript`/`boldComplexScript` — required for Thai to render at the right size.
- `buildFlow(questions, parts)` orders content (unassigned questions first, then each part with its questions). `groupIntoPages` splits the flow into **page groups**: each group is a section estimated to fit one page (group 0 `CONTINUOUS` to share page 1 with the header, the rest `NEXT_PAGE`). Needed because docx-preview does not auto-paginate (pages are `min-height` + `overflow: hidden`), so real page breaks must exist. Estimation: `estimateHeaderHeight`/`estimateQuestionHeight`/`estimatePartHeight`. Each group's first paragraph also sets `pageBreakBefore` because docx-preview only splits pages on `pageBreakBefore` (not section type `NEXT_PAGE`).
- Rich runs: the run factory returns `text`/`rich`/`image`; `rich` renders `^{}`→superscript, `_{}`→subscript, `{img:id}`→inline `ImageRun`. Written questions render `answerLines` dotted blank lines instead of choices.
- The answer-key heading sets `pageBreakBefore: true`.
- The generated file does not embed fonts; the opening machine needs TH Sarabun New installed.

## Import format
- `src/lib/importers.ts` accepts Thai/English header aliases. Canonical example: `static/template.csv` (`โจทย์,ก,ข,ค,ง,เฉลย,ตอน,ประเภท`). Answers may be ก-จ, A-E, or 1-5.
- `ตอน` groups questions (same title = same part); `ประเภท` = ข้อเขียน/อัตนัย/written makes a written question.
- `importQuestions` returns `ImportResult` (`{ questions, parts }`); `mergeImport` reuses existing parts by title, then appends to the list.

## Stubs
- Routes `/templates` and `/history` are placeholders only.
