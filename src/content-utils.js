// Converts written month names into JavaScript month numbers (January is zero).
const monthNumbers = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

// Converts a readable period such as "March 2025 - May 2025" into a sortable date.
function latestDateValue(value) {
  const text = String(value || "").trim();
  if (!text) return Number.NEGATIVE_INFINITY;
  // A current role should always appear before finished roles.
  if (/present|current|ongoing|now/i.test(text)) return Number.POSITIVE_INFINITY;

  // Use the last month and year found because it is the end of the period.
  const monthMatches = [...text.matchAll(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/gi)];
  if (monthMatches.length) {
    const latest = monthMatches.at(-1);
    return Date.UTC(Number(latest[2]), monthNumbers[latest[1].toLowerCase()], 1);
  }

  // Fall back to a year when the period does not contain a month.
  const yearMatches = [...text.matchAll(/\b(19|20)\d{2}\b/g)];
  return yearMatches.length ? Date.UTC(Number(yearMatches.at(-1)[0]), 0, 1) : Number.NEGATIVE_INFINITY;
}

// Returns a new array ordered from the newest item to the oldest item.
export function sortRecent(items = [], dateKey = "period") {
  return [...items].sort((left, right) => latestDateValue(right?.[dateKey]) - latestDateValue(left?.[dateKey]));
}
