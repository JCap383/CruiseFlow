// Estimate travel time between decks on a cruise ship.
// Rule of thumb: ~1 minute per deck via elevator, ~2 min per deck via stairs,
// plus ~3 min buffer for walking/waiting.

export function estimateTravelMinutes(
  fromDeck: number | null,
  toDeck: number | null,
): number {
  if (fromDeck == null || toDeck == null) return 5; // default buffer
  const deckDiff = Math.abs(fromDeck - toDeck);
  if (deckDiff === 0) return 3; // same deck, just walking
  return Math.ceil(deckDiff * 1.5) + 3; // ~1.5 min per deck + 3 min buffer
}

export function suggestReminderMinutes(
  fromDeck: number | null,
  toDeck: number | null,
): number {
  const travel = estimateTravelMinutes(fromDeck, toDeck);
  // Round up to nearest 5
  return Math.ceil(travel / 5) * 5;
}
