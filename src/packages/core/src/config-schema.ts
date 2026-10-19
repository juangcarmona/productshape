/**
 * The normative kernel configuration schema, vendored verbatim from the PDaC specification
 * (`schemas/v1alpha1/config.schema.json`). Do not edit here; re-vendor from the pinned
 * specification revision instead.
 */
export const configSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'urn:product-definition-as-code:schema:configuration:v1alpha1',
  title: 'Product Definition as Code repository configuration',
  type: 'object',
  additionalProperties: false,
  required: ['version'],
  properties: {
    version: {
      const: 'v1alpha1',
    },
    'product-root': {
      description:
        'Normalized non-empty POSIX path relative to the configuration root. Dot segments, empty segments, backslashes and absolute paths are forbidden by the normative Configuration chapter.',
      type: 'string',
      minLength: 1,
      pattern: '^(?!\\.{1,2}(?:/|$))(?!.*\\/\\.{1,2}(?:/|$))[A-Za-z0-9._-]+(?:/[A-Za-z0-9._-]+)*$',
    },
    validation: {
      type: 'object',
      additionalProperties: false,
      properties: {
        'warnings-as-errors': {
          type: 'boolean',
          default: false,
        },
      },
      default: {},
    },
    extensions: {
      description:
        'Implementation-specific namespaces. Their contents are outside the kernel contract and cannot alter normative diagnostics.',
      type: 'object',
      additionalProperties: true,
      default: {},
    },
  },
} as const;
