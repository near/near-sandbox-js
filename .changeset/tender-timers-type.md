---
"near-sandbox": major
---

Implemented a high-level API (Sandbox) to start and stop a NEAR sandbox node with optional configuration.
Keep CLI support to initialize and run the sandbox manually.

Automatically downloads the NEAR binary (specified or default version).

Supports:

Custom genesis, accounts, and config.

Safe port allocation via internal locking.

Graceful shutdown via stop() or teardown() with cleanup.

Full chain dump via dump(), returning all config files (genesis, config, node_key, validator_key).

Starting a sandbox with a prepared state by providing genesis, validator_key, and node_key. 
