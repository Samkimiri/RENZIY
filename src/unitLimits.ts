export const MAX_UNITS_PER_PROPERTY = 1000;
export const UNIT_DIRECTORY_PAGE_SIZE = 100;
export const MARKETPLACE_UNIT_BATCH_SIZE = 25;

export const normalizeUnitCount = (value: unknown) => {
  const count = Math.floor(Number(value));
  if (!Number.isFinite(count)) return 1;
  return Math.min(Math.max(count, 1), MAX_UNITS_PER_PROPERTY);
};
