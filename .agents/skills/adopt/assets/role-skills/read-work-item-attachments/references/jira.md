# read-work-item-attachments: Jira

`fields.attachment` lists each attachment with its filename, mime type, size and content URL. Fetching content requires the same authentication as the read.

Images and design files often carry the actual requirement. Where content cannot be extracted, say so and name the file rather than silently skipping it: a skipped attachment looks identical to no attachment.
