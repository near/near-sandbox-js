---
"near-sandbox": major
---

Implemented a high-level API (Sandbox) to start and stop a NEAR sandbox node with optional configuration.
Use lib as CLI interface to init and run bin manualy.

Automatically downloads the specified or default NEAR binary version if not already present.

Supports:

Custom genesis/accounts/config (merged on top of defaults).

Safe port allocation via internal locking system.

Graceful teardown and cleanup (tearDown()).

Temporary home directory management
