# Error: GH SSH Key Scope Missing
**Type:** tool-misuse
**Timestamp:** 2026-04-14 05:15 UTC
**Context:** Running `gh ssh-key add`.
**Mistake:** Failed to verify required OAuth scopes (`admin:public_key`) before execution, resulting in 404 errors.
**Root Cause:** Ignored "Depth-First Analysis" principle; jumped to execution without checking tool requirements.
**Status:** raw
