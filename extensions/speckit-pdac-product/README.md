# ProductShape PRODUCT workflows for Spec Kit

This is a separate authoring lane for Spec Kit 1.0.4+. Install it beside the `pdac` delivery-grounding extension. It does not alter `specify`, `clarify`, `plan`, `tasks`, or `implement`, and it never stores work in `.specify/extensions/`.

The `prodshape` deterministic CLI bridge is the ProductShape npm package installed in the consumer repository. The `pdac-product` extension is the Spec Kit command and skill metadata that invokes that bridge; installing `@prodshape/cli` does not install either Spec Kit extension.

Project work is stored under `.specify/productshape/changes/<name>/` and `.specify/productshape/recoveries/<session>/`. The accepted model remains `docs/product/model` (or the configured ProductShape model root). Apply is explicit, human-authorized, fail-closed, and never commits or archives. Archive is a separate command. An applied change that is not yet archived is inert for concurrency, and concurrency also covers the native `docs/product/changes/active` container.

Commands are independently invocable so command-file integrations and skills-based integrations do not depend on sibling-command token expansion. The semantic descriptions allow an agent to select the command from intent; explicit invocation is always supported.
