# update-work-item: Jira

Send only the fields being changed. A full-document update silently clears anything omitted, and the loss is invisible until someone looks for it.

Rich-text fields must be sent as a document structure. Sending a plain string where one is expected is rejected, and sending the wrong structure is accepted and renders as garbage.
