# Local ACENET app

From the vault: `python3 projects/acenet/app/server.py`, then open http://127.0.0.1:8765.

Uses the existing Codex login by default. Connections can select the OpenAI API instead. Luna is the local automatic default; select Ollama, LM Studio or a custom compatible endpoint manually. Open models must already be installed or hosted. Keys entered here remain in the browser session and child job environment, not on disk.

The shared interface is deployed through `../vercel`; see `../README.md` for hosted automatic routing and setup. Local and hosted run histories are separate.

Tests: `cd projects/acenet/app && python3 -m unittest discover -s tests -q`.
