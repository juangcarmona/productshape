# discover-related-docs: Markdown in the repository

Two signals, ranked: a documentation file whose path or heading names a component the item touches, and a documentation file that a changed source path is referenced from.

```bash
rg -l --glob 'docs/**/*.md' "<component>"
```
