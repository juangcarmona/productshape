# ProductShape PRODUCT workflows for Spec Kit

This is a separate authoring lane for Spec Kit 1.0.4+. Install it beside the `pdac` delivery-grounding extension. It does not alter `specify`, `clarify`, `plan`, `tasks`, or `implement`, and it never stores work in `.specify/extensions/`.

Project work is stored under `.specify/productshape/changes/<name>/` and `.specify/productshape/recoveries/<session>/`. The accepted model remains `docs/product/model` (or the configured ProductShape model root). Apply is explicit, human-authorized, fail-closed, and never commits or archives. Archive is a separate command.

Commands are independently invocable so command-file integrations and skills-based integrations do not depend on sibling-command token expansion. The semantic descriptions allow an agent to select the command from intent; explicit invocation is always supported.
