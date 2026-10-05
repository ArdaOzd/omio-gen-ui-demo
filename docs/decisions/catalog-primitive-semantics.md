# Distinct travel catalog primitives

The acceptance reference requires granular components the model can arrange independently. The shared catalog review found several exported names rendering the same composite. This change gives the views separate semantics without suppressing authored nodes or changing positional props.

- SelectedItinerary shows selected fare route/date/mode/per-passenger facts and an empty/loading state. It no longer duplicates the synthetic total, selected count or booking disclaimer. Pair it with SyntheticTotal and SelectedFareCount when those summaries help.
- SyntheticTotal shows the sum of selected synthetic fare prices multiplied by passengers and its synthetic-price explanation. It does not render the selected itinerary.
- ComparisonTable defaults to a bounded ranked comparison of individual fares.
- ComparisonMatrix remains the mode price/duration comparison. ModeBreakdown shows only mode and count.

These additive semantic corrections keep names, schemas and version 1.0.0 intact. The regenerated native catalog describes the actual primitive responsibilities. Two focused tests failed before the correction because details repeated the total panel and the ranked comparison was a mode aggregate.

The audit also identified DateWindow as a single-date alias and RetryAction as an unchanged-dataset dispatch. DateWindow now exposes start/end controls with inclusive local query semantics, rejects reversed input, and offsets both endpoints on later itinerary legs. DateStrip remains a single date and clears the window when edited. RetryAction invokes the bounded action router retry operation; it repeats missing coverage after failure without rewriting dates, filters or selected IDs. The fail-first/succeed-second integration test confirms an actual resource load. The query-lifecycle owner supplies the coordinated inclusive-predicate/retry-dispatch type seam.

Additional tests select two fares on different adjacent routes and dates in a combined coverage resource, filter the current list to Bus, then verify both selected facts and the exact two-passenger total remain visible without mutating host state. Tabs already provides actual tab and tabpanel roles, ArrowLeft, ArrowRight, Home and End roving focus, and hidden inactive panels.
