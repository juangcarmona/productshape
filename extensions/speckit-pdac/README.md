# PDaC extension for Spec Kit

Grounds Spec Kit features in an accepted product definition kept as code ([Product Definition as Code](https://pdac.dev), reference implementation [ProductShape](https://github.com/juangcarmona/productshape)).

What it adds to a Spec Kit workspace:

- `speckit.pdac.context`: fetch the cited context projection (canonical text of the product artifacts a feature implements, with ready citation records) before specifying.
- `speckit.pdac.verify`: run deterministic citation verification over every feature's `spec.md`, `plan.md` and `tasks.md` and repair what it reports.
- Optional hooks that run the verification automatically after the specify, plan and tasks phases, so an ungrounded document or a stale citation surfaces inside the session that can fix it, not later in CI.

The extension adds commands and hooks only. It gains no write authority over the product model: the accepted definition under `docs/product/model` changes exclusively through a human-approved Product Change, and the verifier is read-only.

## Requirements

- A Spec Kit workspace (`specify init`). Verified on Spec Kit 0.7.2 and 1.0.1.
- ProductShape 0.16.0 or newer, reachable as `npx prodshape` (install: `npm install -g @prodshape/cli`, or as a devDependency). 0.16.0 is the floor because `speckit.pdac.verify` runs `citations verify --provider speckit --format json` and relies on the `pdac-scope` exemption carrier, neither of which works on 0.14.0; 0.15.0 was never published.
- A product definition: `npx prodshape init` for greenfield, or the [brownfield recovery path](../../docs/adoption/brownfield.md).

Recommended companion: `npx prodshape integration add speckit`, which installs the full guidance at `.specify/memory/pdac.md`, merges the Product Grounding blocks into the workspace templates and provides the CI example. The extension and the integration compose; each also works alone.

## Install

The primary path is the ProductShape extension catalog. Add it once (the `--install-allowed` flag marks it as a trusted install source; only do that for catalogs you have vetted), then install by name:

```bash
specify extension catalog add https://raw.githubusercontent.com/juangcarmona/productshape/main/extensions/catalog.json --name pdac --install-allowed
specify extension add pdac
```

`specify extension update pdac` picks up new versions as the catalog serves them. Each catalog entry pins the exact release asset and its sha256, which the specify CLI verifies before installing.

Alternatives:

```bash
# From a local checkout of this repository
specify extension add /path/to/productshape/extensions/speckit-pdac --dev

# From a release asset URL directly (the specify CLI asks you to confirm an untrusted source)
specify extension add pdac --from https://github.com/juangcarmona/productshape/releases/latest/download/speckit-pdac.zip
```

Verify the installation with `specify extension list` and `specify extension info pdac`.

Spec Kit's own community catalog lists this extension for discovery — `specify extension search` finds it there. It is not an install source: installs come from the ProductShape catalog above, which is the one that pins each release asset and its sha256.

## Uninstall

```bash
specify extension remove pdac
```
