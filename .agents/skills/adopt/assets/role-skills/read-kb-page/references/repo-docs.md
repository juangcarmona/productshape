# read-kb-page: Markdown in the repository

Read the file. Report the path, the content, and the last commit date that touched it:

```bash
git log -1 --format=%cs -- <path>
```

That date is the page's real currency, and it is more trustworthy than any date written inside the document.
