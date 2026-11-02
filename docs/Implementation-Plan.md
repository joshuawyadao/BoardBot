# Plan

Upgrade the accessibility scanner to axe 4.14.0 and correct the board label mismatch exposed by its checks, with a focused feature branch and reviewed pull request.

## Scope
- In: `@axe-core/playwright` 4.13.0 → 4.14.0 and its generated lock graph; board accessible labels; focused rendering/browser regression coverage; verification and UI documentation.
- Out: the other six updates in Dependabot PR #17, the Actions update in #10, game rules/data, save formats, and merging the resulting PR.

## Action items
- [x] Inspect locked versions, current main, official release metadata, and PR #17 failures; confirm npm audit reports zero current vulnerabilities.
- [x] Create `codex/axe-4-14-compatibility` from current `origin/main` (`da170fa`); preserve the completed Node/Vite security updates.
- [x] Checkpoint this resolved plan before implementation (`70b6193`).
- [x] Upgrade only axe and reproduce the `label-content-name-mismatch` failures with existing accessibility/recovery tests.
- [x] Fix visible-label/accessibility-name agreement without exposing hidden Lair data, changing gameplay, or disabling scanner rules; add focused regression coverage.
- [x] Update `docs/UI-Design.md` and `docs/Verification.md` to describe the label contract and coverage.
- [x] Run clean install, peer/lock checks, npm audit, `npm run verify`, public browser suites and production acceptance; keep generated artifacts temporary and record host limitations.
- [x] Run Brooks review and prepare the final branch for publishing; require fresh Codex review, hosted CI and mergeability before readiness. Record external review/push/fix results on the live PR and leave its merge to the user.

## Open questions
- None.

## Evidence and rollback
- PR #17 run `41082813031` fails accessibility and repeated-save-failure scans with `label-content-name-mismatch` on board location buttons. The grouped update includes axe 4.14.0. Existing assertions remain enabled.
- This independent PR extracts only the scanner upgrade needed to expose/correct that concrete compatibility issue. PR #17 remains open for its other dependencies; the PR description will identify the overlap.
- Revert this single focused PR as one rollback boundary if needed. No durable game state or data migration is introduced.

## Review and validation ledger
- Discovery: clean base `da170fa`; Node 26.12.1/npm 11.20.0; npm audit reports zero vulnerabilities before upgrading. GitHub alerts: zero open.
- Reproduction: upgrading only axe reproduces both existing accessibility and recovery failures on Chromium. The remaining six grouped upgrades are unnecessary to reproduce the issue.
- Fix: append visible markers to the existing accessible-name prefix, retaining semantic descriptions and actions. Explicit text separators keep passage letters and floor numbers distinct for speech matching. Passage identity assertions trim only these intentional boundary spaces; their expected A/B identities and all axe rules remain intact.
- Final local validation on Node 26.12.1/npm 11.20.0: both formerly failing browser cases pass. Clean npm ci/npm ls and lock audit pass with zero vulnerabilities; only the two axe package records change and Node/Playwright peer constraints match. Build/typecheck, 155 unit cases and 12 repository checks pass. All 214 public browser cases pass (107 Chromium and 107 WebKit, 7.6 minutes), as do both final Chromium/WebKit production cases.
- Independent read-only correctness review: no actionable findings; hidden-information, naming order, interaction and dependency compatibility checked. No private data or live game was used.
- Final production acceptance passes in Chromium and WebKit. The installed macOS Firefox still fails before page creation with `Could not find profile folder`; hosted Linux Firefox must pass before readiness. The full public suite also exposed three assumptions about raw separator whitespace/name prefixes; the existing name prefixes were restored, and only the two passage-text assertions normalize boundary whitespace. The corrected cases pass in the current broad run.
- Checkpoints: `70b6193` resolved plan; `7fdfc9a` axe/label/tests/docs implementation. This final local snapshot records review and validation before publication. The live PR is authoritative for subsequent Codex review, CI, conflict and readiness decisions.

## Brooks-Lint Review

**Mode:** PR Review
**Scope:** Branch changes versus `origin/main`: package.json, GameBoard source and rendering tests, three browser test files, UI/verification docs and this plan. Generated package-lock.json is excluded from maintainability scoring; its exact two-package upgrade and peers were checked separately. No project Brooks configuration is present.
**Health Score:** 100/100
**Trend:** Stable at 100.

The focused change preserves semantic names, board interactions and hidden information while satisfying the upgraded scanner's observed compatibility requirement.

### Findings
- No actionable findings across change propagation, cognitive load, duplication, complexity, dependency direction or domain language. The local marker sequence mirrors visible badge order intentionally; no new cross-layer dependency or abstraction is introduced.
- Quick Test Check: the existing real-browser axe scans reproduce the failure and verify the fix without disabling rules. A focused rendering case covers combined passage/floor/selection/Item/Citizen markers, and the existing hidden-Lair assertion remains active. No mock wiring or ambiguous unrelated test scenarios were added.

### Summary
- Keep the dependency delta limited to the two axe packages and their required label compatibility fix.
- Require current PR Codex review, green hosted CI and conflict-free mergeability; leave the merge to the user.
