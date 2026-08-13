# Release v1.3.0

## Summary
- Dashboard runtime and UI polish included from dev.
- Profile avatar fallback behavior included from dev.
- Export receipt approval and complete UI flow included from dev.
- Inventory count UI work included from dev, including count list/detail flows.
- Sidebar and role-based menu behavior included from dev.

## Validation
Backend:
- See backend release PR for targeted test validation.

Frontend:
- `git diff --check`: pass
- `npm run build`: pass
- No `lint` script exists in `package.json`.

## Known Risks
- Manual browser smoke not run in this release task.
- `pnpm-lock.yaml` remains untracked locally and is not included in this release.
- Large Vite chunk warning remains.

## Release Tag
- RC tag not created yet.
- Final tag will be created only after merge into `main`.
