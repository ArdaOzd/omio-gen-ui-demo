"use generative";
import { defineToolkit } from "@assistant-ui/react"
import { JSONGenerativeUI, defineGenerativeComponents } from "@assistant-ui/react-generative-ui"
import { sharedPropsSchema } from "../../catalog/generated/catalog"
import { CatalogNode } from "../../catalog/component"
const library=defineGenerativeComponents({
TravelHero: { description: "Travel artifact headline and introduction", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="TravelHero" {...props} /> },
Carousel: { description: "Accessible horizontal panels", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="Carousel" {...props} /> },
DateWindow: { description: "Bounded local date window", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="DateWindow" {...props} /> },
FarePicker: { description: "Direct local fare selection", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="FarePicker" {...props} /> },
CheapestFastest: { description: "Local cheapest and fastest comparison", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="CheapestFastest" {...props} /> },
TravelSurface: { description: "Root travel artifact with subscribed local state", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="TravelSurface" {...props} /> },
Section: { description: "Named story section", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="Section" {...props} /> },
Stack: { description: "Vertical arrangement", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="Stack" {...props} /> },
Inline: { description: "Horizontal wrapping arrangement", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="Inline" {...props} /> },
ResponsiveGrid: { description: "Responsive equal-column arrangement", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="ResponsiveGrid" {...props} /> },
SplitPane: { description: "Responsive primary and supporting sections", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="SplitPane" {...props} /> },
StickySummary: { description: "Persistent selected-trip summary", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="StickySummary" {...props} /> },
Tabs: { description: "Accessible tabbed sections", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="Tabs" {...props} /> },
Callout: { description: "Bounded explanatory content", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="Callout" {...props} /> },
DateStrip: { description: "Direct local date selection", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="DateStrip" {...props} /> },
ModeChips: { description: "Direct local transport mode filtering", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="ModeChips" {...props} /> },
CarrierFilter: { description: "Direct local carrier selection", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="CarrierFilter" {...props} /> },
PriceRange: { description: "Direct local price limit", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="PriceRange" {...props} /> },
DurationRange: { description: "Direct local duration limit", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="DurationRange" {...props} /> },
DirectToggle: { description: "Direct-only local filter", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="DirectToggle" {...props} /> },
SortSelect: { description: "Price duration or departure sorting", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="SortSelect" {...props} /> },
StayAllocation: { description: "Multi-city stay nights allocation", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="StayAllocation" {...props} /> },
FareCards: { description: "Locally resolved fare choices", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="FareCards" {...props} /> },
ComparisonTable: { description: "Locally resolved ranked fare comparison", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="ComparisonTable" {...props} /> },
ComparisonMatrix: { description: "Locally grouped mode comparison", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="ComparisonMatrix" {...props} /> },
PriceCalendar: { description: "Locally grouped price-by-day view", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="PriceCalendar" {...props} /> },
ModeBreakdown: { description: "Locally grouped transport totals", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="ModeBreakdown" {...props} /> },
SyntheticTotal: { description: "Selected synthetic per-passenger EUR total", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="SyntheticTotal" {...props} /> },
CoverageSummary: { description: "Resource completeness and bounds", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="CoverageSummary" {...props} /> },
CitySequence: { description: "Ordered stops and adjacent legs", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="CitySequence" {...props} /> },
RouteMap: { description: "Schematic local route visualization", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="RouteMap" {...props} /> },
ItineraryTimeline: { description: "Selected adjacent-leg chronology", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="ItineraryTimeline" {...props} /> },
DurationPricePlot: { description: "Local duration and price comparison", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="DurationPricePlot" {...props} /> },
SelectedItinerary: { description: "Selected leg facts and total", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="SelectedItinerary" {...props} /> },
ArtifactSkeleton: { description: "Loading artifact placeholder", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="ArtifactSkeleton" {...props} /> },
CoverageNotice: { description: "Partial resource notice", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="CoverageNotice" {...props} /> },
EmptyState: { description: "No matching fares", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="EmptyState" {...props} /> },
InlineError: { description: "Sanitized local failure", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="InlineError" {...props} /> },
StaleBadge: { description: "Revision mismatch notice", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="StaleBadge" {...props} /> },
RetryAction: { description: "Retry local resource operation", properties: sharedPropsSchema, streamProperties: true, render: (props) => <CatalogNode kind="RetryAction" {...props} /> },
})
const generative=new JSONGenerativeUI({library})
export default defineToolkit({present:generative.present()})
