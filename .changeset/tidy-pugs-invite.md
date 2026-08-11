---
"near-sandbox": patch
---

Poll the sandbox RPC with `fetch` instead of `got`, fixing startup on Node >= 26.7 where a refused connection crashed the process with an uncaught error.
