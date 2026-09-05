# ProductShape PRODUCT workflows for Spec Kit

This is a separate authoring lane for Spec Kit 1.0.4+. Install it beside the `pdac` delivery-grounding extension. It does not alter `specify`, `clarify`, `plan`, `tasks`, or `implement`, and it never stores work in `.specify/extensions/`.

The `prodshape` deterministic CLI bridge is the ProductShape npm package installed in the consumer repository. The `pdac-product` extension is the Spec Kit command and skill metadata that invokes that bridge; installing `@prodshape/cli` does not install either Spec Kit extension.

Project work is stored under `.specify/productshape/changes/<name>/` and `.specify/productshape/recoveries/<session>/`. The accepted model remains `docs/product/model` (or the configured ProductShape model root). Apply is explicit, human-authorized, fail-closed, and never commits or archives. Archive is a separate command. An applied change that is not yet archived is inert for concurrency, and concurrency also covers the native `docs/product/changes/active` container. Apply lists the citations the change affects.

Commands are independently invocable so command-file integrations and skills-based integrations do not depend on sibling-command token expansion. The semantic descriptions allow an agent to select the command from intent; explicit invocation is always supported.

## Requirements

- Spec Kit 1.0.4 or newer (`specify init`).
- ProductShape 0.19.0 or newer in the consumer repository (`npm install --save-dev @prodshape/cli`), the CLI every command runs.

## Install

Add the ProductShape extension catalog once (the `--install-allowed` flag marks it as a trusted install source; only do that for catalogs you have vetted), then install by name:

```bash
specify extension catalog add https://raw.githubusercontent.com/juangcarmona/productshape/main/extensions/catalog.json --name pdac --install-allowed
specify extension add pdac-product
```

`specify extension update pdac-product` picks up new versions as the catalog serves them. Each catalog entry pins the exact release asset and its sha256, which the specify CLI verifies before installing. From a local checkout: `specify extension add /path/to/productshape/extensions/speckit-pdac-product --dev`.

Verify the installation with `specify extension list` and `specify extension info pdac-product`.

## Uninstall

```bash
specify extension remove pdac-product
```

Product Changes and recovery sessions under `.specify/productshape/` are yours and survive removal.
