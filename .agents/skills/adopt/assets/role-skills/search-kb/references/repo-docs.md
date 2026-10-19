# search-kb: Markdown in the repository

```bash
rg -n --glob 'docs/**/*.md' "<term>"
```

Return the file path, the heading the match sits under, and the matching lines. The heading is what makes an excerpt useful: a line number alone tells the caller nothing about context.
