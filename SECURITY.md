# Security Policy

## Supported versions

Only the latest released version of Product Definition as Code receives security fixes. The project
is currently pre-1.0; there are no long-term support branches.

## Reporting a vulnerability

Please report suspected vulnerabilities privately through
[GitHub Security Advisories](../../security/advisories/new) for this repository.
Do not open a public issue for a security problem.

You can expect an acknowledgement within a reasonable time frame. Please include reproduction steps
and the affected version or commit.

## Scope notes

- The toolkit executes locally against repository files. It does not run a server, collect
  telemetry, or transmit data.
- Generated provider integration files are written into consumer repositories; tampering with
  managed files is detected by `prodshape doctor` but is not a security boundary.
