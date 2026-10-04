# Situation Guide

> A context-aware guide that highlights which substances deserve extra attention for the health and feeding situations someone selects.

## Context / Why

The current feature is called **Safety**, but it does not perform a complete safety assessment. It combines three different jobs:

- saving health and feeding situations that apply;
- surfacing context-specific cautions throughout the app;
- organizing substances into avoid, caution, and reasonable-to-consider groups.

Because the name suggests a definitive safety verdict, while the screen opens with controls and abstract “flags,” users may not understand what the feature does or how it affects the rest of GalactoGuide.

## Product Definition

**Recommended name:** Situation Guide

- **Tab label:** Guide
- **Parent / caregiver title:** Your situation guide
- **Provider title:** Clinical context guide
- **Core promise:** Select relevant situations once, then see which entries need extra attention and why.
- **Role in GalactoGuide:** A context layer over the evidence library—not a diagnosis, risk calculator, or personalized treatment recommendation.
- **Primary job:** Help users notice potential conflicts and cautions before presenting compatible options.

### Product decision: risk-first

The Guide is **risk-first**, not recommendation-first. Its first responsibility is to surface entries that may conflict with a selected situation or deserve clinician input. Context-compatible options remain available, but they are visually secondary and must not read as treatment recommendations.

### Product decision: shared structure, portal-specific language

Parents/caregivers and providers use the same risk-first hierarchy so the feature has one consistent mental model. Titles, descriptions, and disclaimers adapt to the selected portal without changing the underlying result order or behavior.

### Why not “Safety”

- It implies a complete pass/fail safety evaluation.
- It does not explain that users must select situations.
- It hides the feature’s broader role across Home, lists, and substance details.

### Other names considered

- **Context Guide:** Accurate, but more clinical and abstract for parents.
- **For You:** Friendly, but can overstate personalization and fits providers poorly.
- **Safety Check:** Action-oriented, but most likely to imply a definitive assessment.

## Goals & Non-Goals

### Goals

- Make the feature’s purpose understandable before the user selects anything.
- Explain that selections affect guidance throughout the app, not only this screen.
- Show why every result appears by naming the triggering situation and rating.
- Separate context suitability from evidence of effectiveness and supply direction.
- Keep selections easy to review and change at any time.
- Use honest language for both parent/caregiver and provider portals.

### Non-goals

- Claim that an entry is universally safe or unsafe.
- Replace individual clinical assessment.
- Predict whether a substance will work for a specific person.
- Expand the medical data model or change existing rating logic in the first release.

## Audience / Users

- Parents and caregivers trying to understand which entries may deserve caution for their situation.
- Clinicians using the same data as a quick context-organizing reference.

## Core Experience (MVP)

### 1. Explain the benefit before asking for input

Open with a short, concrete promise:

**Your situation guide**

“Choose the health and feeding situations that apply. We’ll highlight entries that may need extra caution and explain why.”

Supporting line:

“Your selections also shape the context notes you see while browsing GalactoGuide.”

### 2. Make situation selection feel like guide setup

- Label the section **What should this guide consider?**
- Group the fixed choices so they are easier to understand:
  - **Feeding situation:** Preterm infant, General low supply, Relactation
  - **Health context:** PCOS / insulin resistance, Breast hypoplasia, Cardiac history, Diabetes / blood sugar issues
- On first use, show the choices directly.
- After setup, collapse them into a compact summary such as **Considering 3 situations · Edit**.
- Keep selection controls directly available; do not introduce an Edit/Done mode.

### 3. Organize the results around the decision

Use a risk-first hierarchy:

1. **Needs extra attention**
   - Avoid / get specialist input
   - Use caution / discuss first
2. **Reasonable to discuss**
   - Context-compatible options, clearly separated from evidence of effectiveness
   - Secondary and collapsed by default when higher-priority results exist

Keep the supply-direction control secondary and name it explicitly:

- All
- May increase supply
- May decrease supply

Do not call the complete result set “flags,” because reasonable-to-consider entries are not warnings.

### 4. Explain why each entry appears

Every result row should include the selected context that drove its placement, for example:

- **Fenugreek**
- May increase supply · Limited evidence, mixed results
- **For PCOS: avoid**

If multiple selected situations differ, show the most cautious rating first and allow the detail screen to expose the full breakdown.

### 5. Make the guide’s role visible across GalactoGuide

- Home/list rows: replace generic “selected situations” copy with the actual situation and rating.
- Substance detail: lead with **For your selected situations** before the full by-situation reference list.
- Guide tab: show a compact selection summary so users know the guide is active.
- Onboarding: introduce the Guide as a reusable context layer, not a standalone safety checker.

### 6. Use a bounded disclaimer

Keep the limitation close to the promise without making it the dominant content:

“This guide organizes context-specific considerations. It does not assess your complete medical history, determine effectiveness, or replace advice from your clinician or IBCLC.”

## Empty, Active, and Detail States

### No situations selected

- Explain the benefit.
- Show the situation choices.
- Avoid an additional empty-state card repeating the same instruction.

### Situations selected

- Show **Considering N situations · Edit**.
- Lead with results, not settings.
- Keep urgent/cautionary groups before compatible options.

### Substance detail

- Show selected-situation findings first.
- Keep the complete situation profile as a secondary reference.
- Continue stating that context ratings do not rate effectiveness.

## Stretch / Future Ideas

- Add a separate intent choice: protect/build supply, reduce supply, or explore.
- Add short definitions for unfamiliar situations.
- Explain how the most cautious selected rating determines grouping.
- Let users temporarily preview a different situation without changing saved selections.
- Add a lightweight “How this guide works” explainer reachable from the header.

## Open Questions & Risks

- **Recommendation language:** “Reasonable to discuss” must not be read as evidence that an option works.
- **Selection taxonomy:** The choices mix infant, lactation, and parent health contexts; grouping helps, but definitions may still be necessary.
- **Severity logic:** A single worst-case label can hide meaningful differences across selected situations unless the cause is shown on each row.

## Phased Roadmap

- **Phase 1 — Clarify the feature:** Rename it, rewrite the promise, restructure first-use/active states, show why each result appears, and align copy across onboarding, lists, and details.
- **Phase 2 — Improve comprehension:** Add context definitions, a “How it works” explainer, and clearer multi-situation summaries.
- **Phase 3 — Add intent:** Let users distinguish protecting/building supply from intentionally reducing it, without conflating intent with safety or efficacy.

## Success Criteria

- A first-time user can explain the Guide’s purpose after seeing the initial screen.
- Users understand that selections affect guidance throughout the app.
- Every surfaced item identifies the selected situation that caused its rating.
- Users can distinguish supply direction, evidence strength, and context rating.
- No copy implies a complete safety assessment or personalized medical recommendation.
- Existing medical data, rating logic, accessibility, themes, and portal behavior remain intact in Phase 1.

## TLDR

- Rename **Safety** to **Situation Guide**; use **Guide** in the tab bar.
- Define it as a context layer over the evidence library, not a safety verdict.
- Make the experience risk-first: conflicts and cautions lead; compatible options remain secondary.
- Explain the payoff before the selector and show the triggering situation on every result.
- Prioritize “needs extra attention,” with compatible options clearly secondary.
- Keep supply direction, evidence, and context rating visibly separate.
