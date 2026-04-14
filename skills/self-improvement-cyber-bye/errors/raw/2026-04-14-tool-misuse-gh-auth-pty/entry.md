# Error: gh auth login PTY Struggle
**Type:** tool-misuse
**Timestamp:** 2026-04-14 05:05 UTC
**Context:** Attempting to run `gh auth login` in an interactive PTY.
**Mistake:** Sent `\n` repeatedly without analyzing the prompt output, leading to session timeouts and confusion.
**Root Cause:** Lack of surgical interaction loop (poll -> analyze -> input).
**Status:** raw
