<div align="center">

  <h1>NEAR Sandbox (JS and TS Edition)</h1>

  <p>
    <strong>JavaScript and TypeScript library for running a local NEAR node for development and testing.</strong>
  </p>

  <p>
     <a href="https://npmjs.com/near-sandbox"><img src="https://img.shields.io/npm/v/near-sandbox.svg?style=flat-square" alt="Latest Release Version" /></a>
    <a href="https://npmjs.com/near-sandbox"><img src="https://img.shields.io/npm/d/near-sandbox.svg?style=flat-square" alt="Download" /></a>
  </p>
</div>

## Release Notes

Release notes and unreleased changes can be found in the [CHANGELOG](./CHANGELOG.md).

## What is NEAR Sandbox?

NEAR Sandbox is a [custom build](https://github.com/near/nearcore/blob/9f5e20b29f1a15a00fc50d6051b3b44bb6db60b6/Makefile#L67-L69) of the NEAR blockchain optimized for local development and testing.  
If you're familiar with [Ganache for Ethereum](https://www.trufflesuite.com/ganache), this tool serves a similar purpose for NEAR.

This library provides a simple JavaScript API to quickly download, start, and configure your local NEAR Sandbox instance. The binary is automatically managed and launched for you.

## Installation

Install the package globally or as a development dependency:

Using npm:

```bash
npm install --save-dev near-sandbox
```

Using yarn:

```bash
yarn add --dev near-sandbox
```

## Simple Testing Example

Here's an example of how you might use NEAR Sandbox in a test with async/await:

```javascript
const { startSandbox } = require("near-sandbox");

(async () => {
  try {
    // Start a sandbox instance with default configuration.
    const sandbox = await startSandbox();

    // Your test code here.
    // You can interact with the sandbox via its RPC `sandbox.rpc` etc.

    // Typically, the sandbox will automatically clean up when the process exits.
    console.log(`Sandbox RPC available at: ${sandbox.rpc}`);
  } catch (error) {
    console.error("Error starting sandbox:", error);
  }
})();
```

## Features

- **Easy sandbox startup:** Start a local NEAR node with default or custom configuration.
- **Version selection:** Download and run a specific NEAR Sandbox version.
- **Custom configuration:** Adjust settings such as genesis parameters or network configurations.
- **Automatic binary management:** Automatically downloads and manages the NEAR Sandbox binary if not already present.
- **RPC access:** Access the sandbox node's RPC endpoint for interacting with your local network.
- **Environment variable configuration:** Customize binary source, logging, timeouts, and more through environment variables.

### Starting a Sandbox

You can start a sandbox with default settings:

```javascript
const { startSandbox } = require("near-sandbox");

(async () => {
  const sandbox = await startSandbox();
  // Use sandbox.rpc to interact with the local NEAR node.
})();
```

Or, you can specify a particular version:

```javascript
const { startSandboxWithVersion } = require("near-sandbox");

(async () => {
  const sandbox = await startSandboxWithVersion("2.6.3");
  // Use `sandbox.rpc` for your further interactions.
})();
```

Or configure the sandbox with custom settings:

```javascript
const { startSandboxWithConfig } = require("near-sandbox");

(async () => {
  const config = {
    // Define your custom configuration here.
    network: { trustedStunServers: [] },
    // Additional custom settings can be added.
  };
  const sandbox = await startSandboxWithConfig(config);
})();
```

### Automatic Binary Management

- On sandbox startup, the appropriate binary for your platform is automatically downloaded if not found locally.
- The sandbox process runs in the background, and is automatically terminated upon cleanup.

## Environment Variables

Customize sandbox behavior using the following environment variables:

- `SANDBOX_ARTIFACT_URL`: Specify an alternative URL for downloading the `near-sandbox` binary.
- `NEAR_SANDBOX_BIN_PATH`: Use a custom-built `near-sandbox` binary instead of the default.
- `NEAR_ENABLE_SANDBOX_LOG`: Set to `1` to enable sandbox logging, useful for debugging.
