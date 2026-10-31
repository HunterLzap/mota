# Errors and blockers

2026-11-01 (Asia/Shanghai): No active blocker. Initial workspace contains uncommitted second-round save fixes and prior audit outputs. Work continues in a separate worktree; original files remain intact. The save fix patch is preserved as original-save-fix.patch.

Each confirmed failure will record its cause, up to two reasoned repair attempts, and recovery status here.

## Stage 1 initial browser run

- `stage1-after.log`: the check incorrectly required a non-inert game shell immediately after character creation. The real onboarding dialogue opens at that moment, correctly owns focus and keeps the shell inert.
- Corrected the browser assertion to accept the active onboarding dialogue and require the shell to become interactive after dismissing it. No game protection or assertion about usable focus was removed.
