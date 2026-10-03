# Distinct travel catalog primitives

The acceptance reference requires granular components the model can arrange independently. The shared catalog review found several exported names rendering the same composite. This change gives the views separate semantics without suppressing authored nodes or changing positional props.

- SelectedItinerary shows selected fare route/date/mode/per-passenger facts and an empty/loading state. It no longer duplicates the synthetic total, selected count or booking disclaimer. Pair it with SyntheticTotal and SelectedFareCount when those summaries help.
- SyntheticTotal shows the sum of selected synthetic fare prices multiplied by passengers and its synthetic-price explanation. It does not render the selected itinerary.
- ComparisonTable defaults to a bounded ranked comparison of individual fares. Existing B programs may supply authored grouped query results; those bounded columns still render, rather than dropping an accepted source or replacing its query.
- ComparisonMatrix remains the mode price/duration comparison. ModeBreakdown shows only mode and count, preserving B's authored `count` metric such as a sum of availableSeats.

These additive semantic corrections keep names, schemas, version1.0.0 and B positional ordering intact. The regenerated catalog/native registration describes the actual primitive responsibilities. Two focused tests failed before the correction because details repeated the total panel and the ranked comparison was a mode aggregate. After correction they pass with the existing shared-catalog and B authored-query/state tests. The final integration owner verifies accepted historical programs and current stored chats against the combined source.

The audit also identified DateWindow as a single-date alias and RetryAction as an unchanged-dataset dispatch. Their controls, inclusive date-query semantics and real coverage retry are separate follow-up work, owned by the same catalog worker in coordination with the query-lifecycle owner.
