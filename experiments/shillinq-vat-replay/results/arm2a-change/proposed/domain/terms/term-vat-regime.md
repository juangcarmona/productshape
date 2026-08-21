---
id: TERM-VAT-REGIME
type: domain-term
title: VAT Regime
status: active
defined-in: BC-BOOKKEEPING
synonyms:
  - BTW-regeling
  - VAT scheme
---

## Definition

The statutory VAT arrangement under which one administration operates for a
period of time, determining how VAT is derived from its transactions and
what it files. The product recognises: `standard` (regular BTW liability at
the applicable rates), `kor` (kleineondernemersregeling — the
small-business exemption under which the administration charges no VAT and
reclaims no input VAT) and reverse-charge treatment (verleggingsregeling —
VAT on designated transactions is shifted to the counterparty and reported
as reverse charge). Each administration operates under exactly one regime
at a time; reverse-charge treatment additionally applies per transaction
where the verleggingsregeling designates it, in any regime.

## Distinguish From

A VAT rate (a percentage applied to a taxable base within a regime), the
VAT type of a single line (`collected`, `paid`, `reverse-charge` — a
classification of one transaction's VAT effect, not of the administration),
and the administration itself (TERM-ADMINISTRATION), which carries the
regime as an attribute.

## Usage

Consulted whenever VAT lines are derived from the general ledger and
whenever a period's VAT return is prepared: the regime decides whether VAT
is charged and reclaimed at all (KOR), and how reverse-charge transactions
are classified and reported.
