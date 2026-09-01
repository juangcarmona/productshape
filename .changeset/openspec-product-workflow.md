---
'@prodshape/integration-openspec': minor
---

Host the PDaC product workflow in OpenSpec. The integration now installs a managed project-local `product` schema (openspec/schemas/product: schema.yaml, authoring templates and the bridge scripts) whose OpenSpec changes host a Product Change delta, and exports the deterministic rails: inspectProductModel, listOpenSpecProductChanges, loadOpenSpecProductChange, validateOpenSpecProductChange (overlay validation with concurrency spanning both change containers), applyOpenSpecProductChange (revalidates at apply time, enforces PRODUCT027 and PRODUCT028, fails closed, never archives) and deriveDeliveryContext (fresh post-apply context for a future delivery workflow). Compatibility is capability-specific: the product workflow requires OpenSpec 1.7.0 and reports itself unavailable below that floor while the citation lane keeps working. The shipped guidance now names the two lanes; the citation lane is unchanged.
