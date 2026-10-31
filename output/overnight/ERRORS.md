# Errors and blockers

2026-11-01 (Asia/Shanghai): No active blocker. Initial workspace contains uncommitted second-round save fixes and prior audit outputs. Work continues in a separate worktree; original files remain intact. The save fix patch is preserved as original-save-fix.patch.

Each confirmed failure will record its cause, up to two reasoned repair attempts, and recovery status here.

## Stage 1 initial browser run

- `stage1-after.log`: the check incorrectly required a non-inert game shell immediately after character creation. The real onboarding dialogue opens at that moment, correctly owns focus and keeps the shell inert.
- Corrected the browser assertion to accept the active onboarding dialogue and require the shell to become interactive after dismissing it. No game protection or assertion about usable focus was removed.

## Stage 4 portable DOM suite

- `final-test_browser_syntax_and_init.log` initially failed because its synthetic DOM did not implement `MutationObserver` introduced by the Canvas visibility fix. Real Chrome runs passed.
- Repair attempt 1: added the missing observer and hidden-element rectangle/containment interfaces to the existing synthetic DOM fixture. Initialization and subsystem assertions then passed, but a second independent fixture in the same file lacked `document.querySelector`.
- Repair attempt 2: added `querySelector` to that advancement fixture. Full suite now passes, including initialization, class locking and advancement. No production protection or business assertion changed.

## Browser visibility measurement

- `visibility-probe.log`: minimizing headless Chrome does not change `document.visibilityState`. This probe cannot count as a successful hidden-tab test. A separate headed Chrome session will be used to observe real tab visibility.
- A separate offscreen headed Chrome session (native background flags restored) also reported `visible` after minimization and did not emit `freeze`/`resume`. `lifecycle-diagnostic.log` preserves these results.
- The first lifecycle run successfully completed a real 62-second minute check and saved `final-lifecycle-real-minute.png`, then failed because the assertion treated missing native freeze events as evidence of playback advancing. The diagnostic confirmed events were absent, not that playback advanced during a genuine freeze.
- Native OS-hidden/freeze coverage remains an environment limitation. The final script explicitly reports this as partial coverage and only asserts freeze-index stability when Chrome actually emits both events. No game code or visibility protections were weakened. Real wild-page navigation stopping the timer, Canvas CSS hide/show, minute refresh and battle return were verified independently.

## Stage 4 integration follow-up: hidden wild summary during combat

- Confirmed in `lifecycle-diagnostic-before.json`: `wildTimerDuringBattle: true`. Combat hides main panes through the existing `body.in-battle` class, while the selected main tab stays `wild`.
- Repair attempt 1: WildView observes that existing body class, clears the summary timer during combat, and updates/restarts it when the battle page closes. No battle loop or income calculation changed.
- Revalidated in `final-experience-followup.json` at both sizes and `final-lifecycle.json`: `wildTimerDuringBattle: false`, successful battle return, and a real 62-second minute with zero mutations in the first 31 seconds and exactly one mutation after a full minute. All five prescribed Python suites pass again.
