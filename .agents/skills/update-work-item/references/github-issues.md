# update-work-item: GitHub Issues

```bash
gh issue edit <number> --body-file <path>
```

`--body` replaces the whole body. To change one section, read the current body, edit that section, and write the whole thing back, never assemble a new body from scratch, which drops everything the project added by hand.
