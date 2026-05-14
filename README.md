# Miner Mini Game

Small canvas prototype for testing a mining vehicle with a passive physical scoop and quick crusher sell feedback.

## Current Version

P0.5 architecture-readiness checkpoint on top of the playable P0.4 prototype.

## How to Run

Open `index.html` directly in a browser, or serve this folder with a small static server:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8000/index.html`.

## Project Memory

Use `PROGRESS.md` as the handoff document between Codex sessions. It records the current design decisions, implementation status, and the next likely work.

## Architecture Notes

Use `docs/P0.5_ARCHITECTURE_AUDIT.md` for the extension-point audit before P1 gameplay work.

## Repository Workflow

Use `WORKFLOW.md` for durable collaboration rules such as when to update docs, when to commit, and when to push to GitHub. If a new standing rule is agreed in chat, it should be added there and pushed to the repository.
