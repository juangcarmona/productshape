---
id: TERM-PRODUCT-LANDSCAPE
type: domain-term
title: Product Landscape
status: active
defined-in: BC-PRODUCT-DEFINITION
synonyms:
  - landscape
  - product map
---

## Definition

The complete product laid out as one persistent spatial arrangement, with every artifact present in its
semantic band and identified by its human-readable title. The landscape is the whole model seen at once:
nothing is hidden from it, and every artifact holds a position that does not change as the reader
explores.

It has two states. In the **landscape state** the product is shown entire, with no artifact singled out.
In the **focused state** one selected artifact and its neighbourhood are promoted into the foreground
while the rest of the product stays visible behind them, subdued, in the positions it already occupied.
The two are states of one arrangement, not two arrangements — moving between them changes what is
prominent, never where anything is.

## Distinguish From

- **The Product Graph.** The graph is the derived structure the toolkit compiles: complete, typed and
  directed, with no geometry at all. The landscape is one spatial arrangement of that structure, made so
  a person can learn their way around it.
- **A Graph Projection.** A projection is any purpose-built rendering of the graph, including the
  kind-level aggregate, which is a table and has no positions. The landscape is the projection that
  holds positions, and it is the only one a reader can build spatial memory of.
- **A focused neighbourhood.** Not a separate thing: it is the landscape's focused state. A
  neighbourhood drawn on its own, discarding the surrounding product, is what this concept exists to
  replace — it shows connections at the cost of orientation.
- **A diagram.** A diagram is authored to communicate one idea and is redrawn when the idea changes. The
  landscape is derived from the model, arranged deterministically, and deliberately stable: its value
  comes from being the same place every time it is opened.

## Usage

The landscape is what the Product Explorer's map is. Selecting an artifact from any surface moves the
landscape into its focused state; an explicit reset returns it. Band scope narrows what the landscape
emphasises without selecting anything.

Positions come from the compiled model and are identical for identical content, so two readers looking at
the same snapshot see the same landscape and can describe places in it to each other. Stability is the
property that makes it worth learning: an arrangement that re-solved whenever focus changed would be
correct and useless.

Every artifact is present as a titled node — an anonymous dot would make the landscape a texture rather
than a place — and everything the landscape shows is also readable as text, so nothing depends on being
able to see it.
