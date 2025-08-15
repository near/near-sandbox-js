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
pnpm install --save-dev near-sandbox
```

## Simple Testing Example

Here's an example of how you might use NEAR Sandbox in a test with async/await:

```javascript
const { Sandbox } = require("near-sandbox");

(async () => {
  // Start a sandbox instance with default configuration.
  const sandbox = await Sandbox.start({});
  try {
    // Your test code here.
    // You can interact with the sandbox via its RPC `sandbox.rpc` etc.
    console.log(`Sandbox RPC available at: ${sandbox.rpcUrl}`);
  } catch (error) {
    console.error("Error during execution:", error);
  } finally {
    // On the end of the working you need stop procces by 'tearDow()' that clear temporary dir or 'stop()' - just stop procces
    await sandbox.stop();
  }
})();
```

You can find more and detailed examples in [examples](examples/)

## Features

- **Easy sandbox startup:** Start a local NEAR node with Sandbox.start({}).
- **Version selection:** Download and run a specific NEAR Sandbox version.
- **Custom configuration:** Adjust settings such as genesis parameters or network configurations. Add your own accounts as TLA to node.
- **Automatic binary management:** Automatically downloads and manages the NEAR Sandbox binary if not already present.
- **RPC access:** Access the sandbox node's RPC endpoint for interacting with your local network.
- **Environment variable configuration:** Customize binary source, timeouts, and more through environment variables.
- **Dumping:** dump() the entire chain that return all config files(genesis, config, node_key, validator_key as Records). Genesis and key files can be used to start sandbox as params to run prepared state.

### Starting a Sandbox

You can start a sandbox with default settings:

```javascript
const { Sandbox } = require("near-sandbox");

(async () => {
  const sandbox = await Sandbox.start({});
  // Use sandbox.rpc to interact with the local NEAR node.
  await sandbox.stop();
  // stop sandbox after using
})();
```

Or, you can specify a particular version:

```javascript
const { Sandbox } = require("near-sandbox");

(async () => {
  const sandbox = await Sandbox.start({ version: "2.6.3" });
  // Use `sandbox.rpc` for your further interactions.
  await sandbox.tearDown();
  // tearDown sandbox after using that clear tmp dir
})();
```

Or configure the sandbox with custom settings:

```javascript
const { Sandbox } = require("near-sandbox");

(async () => {
  // Define your custom configuration here with interface `SandboxConfig`
  const config = {
    rpcPort: rpcPort,
  };
  const sandbox = await Sandbox.start({ config: config });

  await sandbox.stop();
})();
```

### CLI using

- Initialize the Sandbox node

      near-sandbox --home /tmp/near-sandbox init

* Run it

      near-sandbox --home /tmp/near-sandbox run

  by default it is running on `http:/127.0.0.1:3030`

* Stop the sandox node

      rm -rf /tmp/near-sandbox

To find out other things you can do:

    near-sandbox --help

### Automatic Binary Management

- On sandbox startup, the appropriate binary for your platform is automatically downloaded if not found locally.
- It will be saved in dir bin/ inside package.
- The sandbox process runs in the background, and is terminated while calling stop() or tearDown().

## Environment Variables

Customize sandbox behavior using the following environment variables:

- `SANDBOX_ARTIFACT_URL`: Specify an alternative URL for downloading the `near-sandbox` binary.
- `NEAR_SANDBOX_BIN_PATH`: Use a custom-built `near-sandbox` binary instead of the default.
- `DIR_TO_DOWNLOAD_BINARY`: Specify direction where you want save Binary.
- `NEAR_RPC_TIMEOUT_SECS`: Set the timeout (in seconds) for waiting for the sandbox to start (default: 10).
- `NEAR_ENABLE_SANDBOX_LOG`: Set to `1` to enable sandbox logging of `near-sandbox` (helpful for debugging).
