// US fluid ounce. Kept in one place so display, input parsing, and any future
// unit all agree on the same conversion factor.
export const ML_PER_OZ = 29.5735;

export const UNITS = ['ml', 'oz'];

export function isValidUnit(unit) {
  return UNITS.includes(unit);
}

export function mlToOz(ml) {
  return ml / ML_PER_OZ;
}

export function ozToMl(oz) {
  return oz * ML_PER_OZ;
}

// Formats a stored ml amount for display in the user's preferred unit.
// ml stays a whole number (matches existing behaviour); oz shows one decimal
// place since whole-ounce rounding loses too much precision at typical
// serving sizes (e.g. a 250ml glass is 8.5oz, not 8oz or 9oz).
export function formatVolume(ml, unit = 'ml') {
  const safeMl = Number.isFinite(ml) ? ml : 0;
  if (unit === 'oz') return `${round1(mlToOz(safeMl))}oz`;
  return `${Math.round(safeMl)}ml`;
}

// Same as formatVolume but without the unit suffix, for places that render
// the unit separately (e.g. a shared label next to several numbers).
export function formatVolumeValue(ml, unit = 'ml') {
  const safeMl = Number.isFinite(ml) ? ml : 0;
  return unit === 'oz' ? String(round1(mlToOz(safeMl))) : String(Math.round(safeMl));
}

export function unitLabel(unit = 'ml') {
  return unit === 'oz' ? 'oz' : 'ml';
}

// Converts a stored ml amount into the text a number input should show.
export function mlToUnitInput(ml, unit = 'ml') {
  if (!Number.isFinite(ml)) return '';
  return unit === 'oz' ? String(round1(mlToOz(ml))) : String(Math.round(ml));
}

// Converts raw text typed into a unit-aware input back into whole ml for
// storage. Storage always stays in ml regardless of display preference, so
// existing data, exports, and history are unaffected by a unit switch.
export function unitInputToMl(value, unit = 'ml') {
  const parsed = Number.parseFloat(String(value).replace(',', '.'));
  if (!Number.isFinite(parsed)) return null;
  const ml = unit === 'oz' ? ozToMl(parsed) : parsed;
  return Math.round(ml);
}

function round1(value) {
  return Math.round(value * 10) / 10;
}
