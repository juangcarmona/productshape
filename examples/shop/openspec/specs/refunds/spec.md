# Refunds

## Purpose

Let a customer request a refund for a delivered order, and a support agent approve it.

<!-- pdac:cite id="BR-REFUND-001" digest="sha256:b1ae4e4cbc6a19a762a5de5b9e2a46a9acb8e48f5cc7161b8456fa7135bfd2e9" -->

## Requirements

### Requirement: Refund requests respect the refund window

The system SHALL accept a refund request only inside the window defined by BR-REFUND-001, counted from delivery.

#### Scenario: Last day of the window

- **GIVEN** an order delivered on March 1
- **WHEN** the customer requests a refund on March 31
- **THEN** the request is accepted

#### Scenario: One day late

- **GIVEN** an order delivered on March 1
- **WHEN** the customer requests a refund on April 1
- **THEN** the request is rejected
