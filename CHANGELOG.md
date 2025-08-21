# near-sandbox

## 0.2.0

### Minor Changes

- a3b7fb3: Implemented a high-level API (Sandbox) to start and stop a NEAR sandbox node with optional configuration.
  Keep CLI support to initialize and run the sandbox manually.

  Automatically downloads the NEAR binary (specified or default version).

  Supports:

  Custom genesis, accounts, and config.

  Safe port allocation via internal locking.

  Graceful shutdown via stop() or teardown() with cleanup.

  Full chain dump via dump(), returning all config files (genesis, config, node_key, validator_key).

  Starting a sandbox with a prepared state by providing genesis, validator_key, and node_key.

### Patch Changes

- d7d5e5a: Update nearcore version to 2.6.3

## 0.1.5

### Patch Changes

- 088318e: Updated near-sandbox version to 2.6.2 version

## 0.1.4

### Patch Changes

- 1a81c12: Updated near-sandbox version to 2.5.1 version

## 0.1.3

### Patch Changes

- 04aa5ca: Updated near-sandbox version to 2.4.0 version

## 0.1.2

### Patch Changes

- 43bce75: Updated near-sandbox version to 2.3.1 version

## 0.1.1

### Patch Changes

- 3ace9df: Downgraded nearcore to 2.0.0 version to workaround NEAR-12062 issue (will be resolved with 2.3.0 release)

## 0.1.0

### Minor Changes

- 0e5c372: Ensure installation directory exists before downloading binary

## 0.0.21

### Patch Changes

- 7400f6f: Updated near-sandbox to 2.1.1

## 0.0.20

### Patch Changes

- c25915f: Updated sandbox to 2.0.0 release. Removed ability to fetch darwin-x86_64 as it is not working for quite some time"

## 0.0.19

### Patch Changes

- a36f856: Updated the default neard version to 1.40.0
