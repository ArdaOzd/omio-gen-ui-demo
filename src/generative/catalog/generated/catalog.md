# Shared catalog 1.0.0

Manifest hash: e90e063576c8f8b11103f8c526cd62d8f5f4b93be0ebcf418d027a435446c860

Every component accepts registered scalar artifactRef, datasetRef, actionRef and selectorRef. No fare rows, arbitrary objects, URLs, code or styles are permitted. Titles have at most160 characters. Callout explanatory body text has at most600 characters; body is appended after action in B positional calls. Variant is default, compact or emphasis. B positional argument order is append-only within this version.

- MultiCityPlanGrid: Connected multi-city planner for distinct city stops with an optional final return to the origin. Reads the ordered citySequence and leg datasets for one artifact; composes CityField, TravelDate, TransportSelect, FareOrder and FadeFares per leg, inserts StayDuration for each destination, and cascades selected arrival plus stay into the next leg minimum departure.
- FareCalendar: Same-leg calendar within the exact display date window. Uses the datasetRef leg, its multi-selected transport modes and host-derived minimum departure; defaults each day to its local cheapest synthetic fare, offers cheapest or fastest comparison, then opens that day fares without sending rows to the model.
- FadeFares: Same-leg horizontally scrolling synthetic fare chooser with edge fades. datasetRef binds the leg; TransportSelect, FareOrder, TravelDate and the preceding selected arrival plus StayDuration all filter and rank this local list; selections flow to the shared PlanningTracker.
- FareOrder: Same-leg fare ordering control. datasetRef binds the leg list; cheapest orders price, fastest orders duration, and departure orders service date then departure time. Cheapest and fastest also set the matching FareCalendar objective; departure leaves its default cheapest objective.
- TransportSelect: Same-leg transport selector for modes with available fares. Uses a compact multi-select dropdown with vector icons inside MultiCityPlanGrid and inline toggles when rendered alone; writes modesByLeg for the datasetRef route and filters its FadeFares and FareCalendar.
- StayDuration: Destination stay slider from 0 to 30 days. datasetRef identifies the arriving leg; its destination becomes the next leg origin, and selected arrival plus this stay sets the next minimum departure.
- TravelDate: Same-leg local departure date. datasetRef identifies the leg; the first leg changes the trip display window and later legs preserve route offsets while the host enforces any preceding arrival threshold.
- CityField: Editable origin and destination city fields backed by host location suggestions. datasetRef identifies the route positions; changes write the artifact citySequence, where each destination connects to its stay and the next leg origin.
- TravelHero: Travel artifact headline and introduction. May contain catalog children.
- Carousel: Accessible horizontal panels. May contain catalog children.
- DateWindow: Bounded local date window.
- FarePicker: Compact direct fare selector for one leg.
- CheapestFastest: Local cheapest and fastest comparison.
- TravelSurface: Root travel artifact with subscribed local state. May contain catalog children.
- Section: Named story section. May contain catalog children.
- Stack: Vertical arrangement. May contain catalog children.
- Inline: Horizontal wrapping arrangement. May contain catalog children.
- ResponsiveGrid: Responsive equal-column arrangement. May contain catalog children.
- SplitPane: Responsive primary and supporting sections. May contain catalog children.
- StickySummary: Persistent selected-trip summary. May contain catalog children.
- Tabs: Accessible tabbed sections. May contain catalog children.
- Callout: Short heading and explanatory body text up to600 characters. May contain catalog children.
- DateStrip: Direct local date selection.
- ModeChips: Direct local transport mode filtering.
- CarrierFilter: Direct local carrier selection.
- PriceRange: Direct local price limit.
- DurationRange: Direct local duration limit.
- DirectToggle: Direct-only local filter.
- SortSelect: Price duration or departure sorting.
- StayAllocation: Multi-city stay nights allocation.
- FareCards: Expanded fare detail cards for one leg.
- ComparisonTable: Locally resolved ranked fare comparison.
- ComparisonMatrix: Locally grouped mode comparison.
- PriceCalendar: Locally grouped price-by-day view.
- ModeBreakdown: Locally grouped option counts by transport mode.
- SyntheticTotal: Selected synthetic EUR total for all passengers.
- CoverageSummary: Resource completeness and bounds.
- CitySequence: Ordered stop strip with stay nights.
- RouteMap: Schematic connection chart.
- ItineraryTimeline: Selected adjacent-leg chronology.
- DurationPricePlot: Local duration and price comparison.
- SelectedItinerary: Selected fare route, date, mode and per-passenger facts; pair with SyntheticTotal for price summary.
- ArtifactSkeleton: Loading artifact placeholder.
- CoverageNotice: Partial resource notice.
- EmptyState: No matching fares.
- InlineError: Sanitized local failure.
- StaleBadge: Revision mismatch notice.
- RetryAction: Retry local resource operation.
- SelectedFareCount: Current artifact selected fare count, without claiming legs or price.
