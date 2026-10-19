# classify-doc-drift: hosted wiki

Compare the repository file's last commit date against the page's last-modified date, then compare content. Dates alone produce false positives: a whitespace-only edit moves a date without changing meaning.

| Repo changed | Page changed | Verdict |
| --- | --- | --- |
| no | no | in sync |
| yes | no | repo ahead |
| no | yes | knowledge base ahead |
| yes | yes | **diverged** |

Both changed since the last known sync point means neither can overwrite the other safely. Report it and stop.
