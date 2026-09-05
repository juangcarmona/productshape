---
'@prodshape/core': minor
'@prodshape/integration-speckit': minor
'@prodshape/integration-openspec': patch
'@prodshape/cli': minor
---

One hosted Product Change rail in `@prodshape/core`, used by both adapters: terminal statuses are inert for concurrency, the live set spans the host's containers and the native `changes/active` directory, and apply revalidates, refuses before any write, executes and returns a fresh validation of the resulting model. The Spec Kit adapter gains all of that. `prodshape speckit-product apply` reports the resulting model and, on refusal, the blocking diagnostics. The OpenSpec adapter delegates with no behaviour change.
