export const scenarios=[
 {id:'cheap-fast',prompt:'Show the cheapest and fastest London to Paris options for October 9–15, 2026, for one passenger.'},
 {id:'train-bus',prompt:'Compare train and bus visually for London to Paris for October 9–15, 2026.'},
 {id:'calendar',prompt:'Find the cheapest dates from London to Paris for October 9–15, 2026, using a price calendar, filters and offers.'},
 {id:'multi-city',prompt:'Plan London, Paris and Barcelona starting October 9, 2026, with two nights in Paris and four in Barcelona, using mixed travel modes.'},
 {id:'rearrange',prompt:'Rearrange the same loaded options as a journey timeline, keeping my current choices.'},
 {id:'text-state',prompt:'Answer in text only: summarize my current dates, modes and selections. Do not generate or replace the view.'},
 {id:'local-controls',prompt:'Show local mode, date and sorting controls with fare selection. I will change them without sending another chat message.'},
 {id:'coverage',prompt:'Show date controls with fares so I can move outside the loaded date range while an older load is resolving.'},
 {id:'stream-edit',prompt:'Replace the layout with controls first and offers below; keep any filter changes I make while you stream.'},
 {id:'two-artifacts',prompt:'Create a separate travel artifact for the same London to Paris dates October 9–15, 2026. Share loaded datasets, but keep each artifact’s filters independent.'},
 {id:'reload',prompt:'Make a travel view that retains my selected fares, filters and date after a page reload.'},
 {id:'recovery',prompt:'Compose a travel view with filters and offers. Keep any existing view useful if generation is cancelled or invalid.'},
] as const;
export function assignment(participant:string):readonly ['a','b']|readonly ['b','a']{let hash=2166136261;for(const character of participant)hash=Math.imul(hash^character.charCodeAt(0),16777619);return hash%2===0?['a','b']:['b','a'];}
export function withheldPrompt(index:number,seed:number){const lead=seed%2===0?'Help me explore this journey: ':'I need an easy-to-use travel comparison. ';return lead+scenarios[index%scenarios.length]!.prompt;}
export const ratingDimensions=['visual quality','usability','creativity','information hierarchy','mobile adaptation','perceived responsiveness'] as const;
