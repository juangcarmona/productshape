# End-to-end scenarios generated from SB-REFUND-001 and SB-REFUND-002.
# The citations live in refund-window.citations.yml.
Feature: Refund window

  @SB-REFUND-001
  Scenario: Refund on the last day
    Given an order was delivered on March 1
    When the customer requests a refund on March 31
    Then the request is accepted

  @SB-REFUND-002
  Scenario: Refund one day late
    Given an order was delivered on March 1
    When the customer requests a refund on April 1
    Then the request is rejected
    And the customer is told the window has closed
