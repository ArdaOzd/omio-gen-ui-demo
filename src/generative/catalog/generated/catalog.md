# Shared catalog 1.0.0

Manifest hash: 421be56cd56cdecd2f036ee205d94d057aea770b3465e8cccc46673479ae4624

Every component accepts registered scalar artifactRef, datasetRef, actionRef and selectorRef. No fare rows, arbitrary objects, URLs, code or styles are permitted. Titles have at most160 characters. Variant is default, compact or emphasis. B positional argument order is append-only within this version.

- TravelSurface: Root travel artifact with subscribed local state. May contain catalog children.
- Section: Named story section. May contain catalog children.
- Stack: Vertical arrangement. May contain catalog children.
- Inline: Horizontal wrapping arrangement. May contain catalog children.
- ResponsiveGrid: Responsive equal-column arrangement. May contain catalog children.
- SplitPane: Responsive primary and supporting sections. May contain catalog children.
- StickySummary: Persistent selected-trip summary. May contain catalog children.
- Tabs: Accessible tabbed sections. May contain catalog children.
- Callout: Bounded explanatory content. May contain catalog children.
- DateStrip: Direct local date selection.
- ModeChips: Direct local transport mode filtering.
- CarrierFilter: Direct local carrier selection.
- PriceRange: Direct local price limit.
- DurationRange: Direct local duration limit.
- DirectToggle: Direct-only local filter.
- SortSelect: Price duration or departure sorting.
- StayAllocation: Multi-city stay nights allocation.
- FareCards: Locally resolved fare choices.
- ComparisonTable: Locally resolved ranked fare comparison.
- ComparisonMatrix: Locally grouped mode comparison.
- PriceCalendar: Locally grouped price-by-day view.
- ModeBreakdown: Locally grouped transport totals.
- SyntheticTotal: Selected synthetic per-passenger EUR total.
- CoverageSummary: Resource completeness and bounds.
- CitySequence: Ordered stops and adjacent legs.
- RouteMap: Schematic local route visualization.
- ItineraryTimeline: Selected adjacent-leg chronology.
- DurationPricePlot: Local duration and price comparison.
- SelectedItinerary: Selected leg facts and total.
- ArtifactSkeleton: Loading artifact placeholder.
- CoverageNotice: Partial resource notice.
- EmptyState: No matching fares.
- InlineError: Sanitized local failure.
- StaleBadge: Revision mismatch notice.
- RetryAction: Retry local resource operation.
