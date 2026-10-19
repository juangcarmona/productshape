# comment-work-item: GitHub Issues

```bash
gh issue comment <number> --body-file <path>
```

Markdown renders natively. Prefer `--body-file` over `--body` for anything multi-line: shell quoting mangles long bodies in ways that are hard to see until they are posted.
