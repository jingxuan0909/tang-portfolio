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

function latestDateValue(value) {
  const text = String(value || "").trim();
  if (!text) return Number.NEGATIVE_INFINITY;
  if (/present|current|ongoing|now/i.test(text)) return Number.POSITIVE_INFINITY;

  const monthMatches = [...text.matchAll(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/gi)];
  if (monthMatches.length) {
    const latest = monthMatches.at(-1);
    return Date.UTC(Number(latest[2]), monthNumbers[latest[1].toLowerCase()], 1);
  }

  const yearMatches = [...text.matchAll(/\b(19|20)\d{2}\b/g)];
  return yearMatches.length ? Date.UTC(Number(yearMatches.at(-1)[0]), 0, 1) : Number.NEGATIVE_INFINITY;
}

export function sortRecent(items = [], dateKey = "period") {
  return [...items].sort((left, right) => latestDateValue(right?.[dateKey]) - latestDateValue(left?.[dateKey]));
}
