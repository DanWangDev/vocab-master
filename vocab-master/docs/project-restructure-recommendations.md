# Project Restructure Recommendations

## Purpose

This document captures recommended structural changes for the Vocab Master codebase so the team can review them before any migration work starts.

The goal is not to redesign the product. The goal is to make the repository easier to understand, easier to change safely, and easier to scale as the web, backend, mobile, and shared code continue to grow.

This document has been updated after review feedback to reflect current roadmap timing. The structural direction is still considered valid, but the recommended sequencing is now more conservative.

## Current State

The repository currently has two distinct layers:

- The top-level workspace contains source assets, vocabulary extraction scripts, planning docs, and the nested product app.
- The actual product lives inside `vocab-master/`, which already contains separate web, backend, mobile, and shared areas.

This works, but it creates a few friction points:

- The real application is nested one level down, so the repository root does not feel like the true project root.
- Product code and vocabulary/data-prep tooling are mixed within the same overall workspace.
- Shared code exists, but the repository layout has not fully caught up with that direction.
- Future contributors will need extra time to understand where product code ends and tooling/content generation begins.

## Recommendation Summary

The long-term direction is still a cleaner workspace structure, but the timing should change.

Recommended direction:

1. Defer the main folder and workspace restructure until after the active roadmap phases have landed, or at minimum until there is a quiet integration window after Phase 1.
2. Treat the current package/workspace move as a future cleanup task, not an immediate prerequisite for feature delivery.
3. Keep the near-term changes narrow and low risk.
4. If any restructure work happens sooner, prioritize moving the standalone data-prep scripts into a tooling area because that can be done with minimal product-code disruption.

In short: the structural proposal is sound, but a mid-flight repo move is not the right trade while the Phase 1 work and subsequent feature phases are active.

## Design Principles

### 1. Optimize for clarity first

The repository should answer these questions quickly:

- Where is the web app?
- Where is the backend?
- Where is the mobile app?
- Where is the shared logic?
- Where are the scripts that generate vocabulary data?

### 2. Share logic, not coupling

Shared types, quiz logic, scoring, and i18n are good candidates for reuse.

Platform-specific concerns should stay platform-specific:

- Web storage and bootstrapping
- Mobile secure storage and Expo integrations
- UI components
- App-specific React contexts that diverge in behavior

### 3. Separate product code from content tooling

Vocabulary extraction and source-data processing are useful, but they are not the runtime product. They should be easy to find without being mixed into the product packages.

### 4. Favor incremental migration

Repository moves are already disruptive. Domain refactors, import rewrites, and package/workspace changes should be staged so regressions are easier to isolate.

### 5. Respect active roadmap work

Structural cleanup should not undermine active feature or infrastructure branches.

If a restructure creates broad merge conflict risk against already-planned phases, it should wait. The codebase does not need to be perfectly arranged before useful product work continues.

## Timing Recommendation

Based on current review feedback, the safest plan is:

1. Merge and stabilize the current infrastructure work.
2. Continue Phases 2-6 without a major workspace move in the middle.
3. Revisit the full folder/workspace restructure once the product roadmap is in a more stable state.

Reasons:

- No mid-flight import churn across active workstreams
- No large merge conflicts against feature branches
- Better evidence later for what is truly shared between web and mobile
- Less risk of restructuring the backend and frontend twice

This means the nested `vocab-master/` layout remains temporarily awkward, but acceptable.

## Long-Term Target Structure

```text
WordCardShffle/
├── packages/
│   ├── web/
│   ├── backend/
│   ├── mobile/
│   └── shared/            # optional, only if justified by real duplication
├── tools/
│   └── data-prep/
├── resources/
├── docs/
├── .github/
├── package.json
├── pnpm-workspace.yaml
└── docker-compose.yml
```

This remains the preferred end state for clarity, but it is now positioned as a later cleanup, not an immediate migration target.

### Package Responsibilities

#### `packages/web`

Contains the Vite/React web application.

Suggested contents:

- `src/`
- `public/`
- `package.json`
- `vite.config.ts`
- `tsconfig.json`

#### `packages/backend`

Contains the Express/SQLite backend API and migrations.

Suggested contents:

- `src/`
- `data/`
- `package.json`
- `tsconfig.json`
- `Dockerfile`

#### `packages/mobile`

Contains the Expo/React Native mobile application.

Suggested contents:

- `app/`
- `src/`
- `assets/`
- `package.json`
- `app.json`
- `tsconfig.json`

#### `packages/shared`

This should be treated as optional until the codebase proves it is needed.

If created later, it should contain code that is genuinely cross-platform.

Good candidates:

- TypeScript types and DTOs
- quiz/challenge generation logic
- scoring and distractor utilities
- shared i18n resources
- shared formatting helpers

Avoid placing these here unless they become truly common:

- Web-only or mobile-only UI
- storage implementations
- platform-specific auth bootstrapping
- notification wiring

Current recommendation:

- Do not force creation of a standalone shared package right now.
- Extract shared code later based on demonstrated duplication between web and mobile.

#### `tools/data-prep`

Contains vocabulary extraction and transformation utilities currently living near the root.

Suggested contents:

- PDF extraction scripts
- JSON generation scripts
- helper modules for vocabulary cleaning
- a small README describing inputs and outputs

## What To Move

### Move the nested app into explicit packages

Current:

- `vocab-master/src`
- `vocab-master/backend`
- `vocab-master/mobile`
- `vocab-master/shared`

Target:

- `packages/web`
- `packages/backend`
- `packages/mobile`
- `packages/shared` if and when it is justified

### Move root-level scripts into tooling

Current:

- `scripts/extract_words.py`
- `scripts/generate_full_list.py`
- `scripts/generate_sample.py`
- `scripts/vocab_tools.py`

Target:

- `tools/data-prep/`

### Keep resources separate

`resources/` is useful as a source-data and design-assets folder. It can remain outside the application packages as long as its purpose stays clear.

## Internal Structure Suggestions

These are explicitly deferred ideas, not near-term recommendations.

The current internal structure is acceptable for the project's current scale and should not be reworked while the roadmap phases are still landing.

### Backend

The backend currently has strong technical separation already:

- `routes/`
- `services/`
- `repositories/`
- `middleware/`
- `migrations/`

That organization works well at the current scale.

Previous drafts suggested a possible future move toward domain-oriented slices. After review, that should be considered optional and far-future only. It should not be paired with the workspace move, and it should not disrupt the recently completed repository abstraction work.

### Web

The current component-by-area structure is already serviceable and reasonably feature-oriented.

Previous drafts suggested a future feature-slice layout. After review, that is not recommended in the near term. It may become worthwhile later if the app grows substantially, but there is no clear need to pay that refactor cost now.

### Mobile

Because Expo Router already shapes part of the structure, it is usually enough to keep:

- routing in `app/`
- reusable native components and services in `src/`
- shared business logic extracted only when there is clear duplication

## What Not To Do

### Do not over-share web and mobile UI

The web and mobile products can share logic, but trying to share most components or app wiring will likely slow development down.

### Do not combine the folder move with a full architecture rewrite

Repository restructuring is risky enough on its own. Feature-slice refactors should come after the package move settles.

### Do not interrupt active roadmap phases with a large repo move

Even a sensible restructure can be bad timing.

If the current roadmap work is already underway, a broad folder move will increase merge conflicts, review complexity, and integration risk without unlocking immediate product value.

### Do not assume the database abstraction makes PostgreSQL migration trivial

The repository abstraction is a strong foundation, but a future database migration will still involve:

- migration tooling changes
- SQL dialect review
- operational changes
- deployment changes
- backup/restore changes

The current structure should aim to make that future migration easier, not pretend it is free.

## Suggested Migration Sequence

### Near-term option: tooling-only cleanup

This is the only restructure work that currently looks low risk enough to consider before the broader roadmap is complete.

1. Create `tools/data-prep/`.
2. Move the standalone vocabulary extraction and generation scripts there.
3. Add a short README describing script inputs, outputs, and expected workflow.
4. Update any docs that reference the old script paths.

### Later option: full workspace restructure

This should happen after the major roadmap phases are merged and stable.

1. Add workspace configuration at the repository root.
2. Create `packages/` and `tools/`.
3. Move web, backend, and mobile into `packages/`.
4. Decide whether a real shared package is justified based on actual duplication.
5. Update imports, scripts, CI, and Docker paths.
6. Verify all builds, tests, and deployment flows.

### Deferred option: internal cleanup

Only revisit after the workspace move settles and only if the codebase size truly justifies it.

1. Reassess whether additional shared extraction is worthwhile.
2. Reassess whether web feature slices would improve navigation enough to justify the churn.
3. Reassess whether backend domain slicing would deliver more value than the current layer-based structure.

## Immediate Benefits

If the later restructure is done well, the team should get:

- clearer ownership boundaries
- faster onboarding for new contributors
- easier CI and workspace scripting
- cleaner shared-code usage between web and mobile
- less confusion between production app code and vocabulary generation tooling

## Risks

- Import path churn across all packages
- CI and Docker path breakage during the move
- Temporary confusion if documentation is not updated alongside the restructure
- Scope creep if the team tries to redesign architecture while moving folders

## Recommendation

Do not perform the full workspace/package restructure in the middle of the current roadmap unless there is a compelling operational reason.

Recommended path:

- keep shipping the planned phases
- avoid broad import-path churn during active feature development
- revisit the full workspace move once the roadmap has stabilized
- consider the `tools/data-prep/` cleanup earlier because it is low risk and mostly independent

The best version of this change is still:

- obvious
- low drama
- easy to review
- easy to test

The difference is timing: that kind of boring restructure is best done once, after the feature churn has slowed down.

## Open Questions For Review

1. Is the nested `vocab-master/` structure acceptable until the roadmap phases are complete?
2. Should the team do the low-risk `tools/data-prep/` cleanup now, or bundle it into the later restructure?
3. After Phases 2-6, does real web/mobile duplication justify a dedicated shared package?
4. When the time comes, does the team prefer npm workspaces or pnpm workspaces?
5. Should internal backend/web refactors remain out of scope for the eventual folder move unless there is a separate justification?
