---
id: QR-SEARCH-LATENCY
type: quality-requirement
title: Fast search
status: active
quality-attribute: performance
applies-to:
  - UC-SEARCH-PRODUCTS
  - UC-BROWSE-CATALOG
verification:
  - scenario: Search results appear within the threshold under normal load.
uses-terms: []
---
## Requirement

Search and browsing results MUST appear within one second for 95% of requests.

## Measurement

95th percentile response time of search and browse requests, measured in production.
