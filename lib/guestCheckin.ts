// Shared bits of the guest self check-in: the public form and the admin
// view both read guest rows in the same codes, so their option lists and
// display labels live here.

// ISO 3166-1 alpha-2 codes. Names come from Intl.DisplayNames in the
// viewer's language, so no translated list has to be kept here.
const COUNTRY_CODES =
  'AD AE AF AG AI AL AM AO AR AS AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ ' +
  'CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FO FR ' +
  'GA GB GD GE GH GI GL GM GN GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE ' +
  'KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MO ' +
  'MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PR PS PT PW PY QA RO RS ' +
  'RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW ' +
  'TZ UA UG US UY UZ VA VC VE VN VU WS XK YE ZA ZM ZW';

export function getCountryOptions(locale: string): { code: string; name: string }[] {
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames([locale], { type: 'region' });
  } catch {
    names = null;
  }
  return COUNTRY_CODES.split(' ')
    .map((code) => ({ code, name: names?.of(code) || code }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

export function getCountryName(code: string | null | undefined, locale = 'en'): string {
  if (!code) return '';
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) || code;
  } catch {
    return code;
  }
}

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  NIF: 'DNI (Spain)',
  NIE: 'NIE (Spain)',
  PAS: 'Passport',
  OTRO: 'Other ID',
};

export const SEX_LABELS: Record<string, string> = {
  M: 'Male',
  F: 'Female',
  X: 'Other',
};

export const RELATIONSHIP_LABELS: Record<string, string> = {
  parent: 'Parent',
  guardian: 'Legal guardian',
  grandparent: 'Grandparent',
  sibling: 'Sibling',
  uncle_aunt: 'Uncle / Aunt',
  other: 'Other',
};

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

// Spanish DNI: 8 digits + check letter. NIE: X/Y/Z + 7 digits + check letter,
// where the leading letter stands for 0/1/2 in the checksum.
export function isValidSpanishId(type: 'NIF' | 'NIE', value: string): boolean {
  const v = value.toUpperCase().replace(/[\s-]/g, '');
  const match = type === 'NIF' ? v.match(/^(\d{8})([A-Z])$/) : v.match(/^([XYZ]\d{7})([A-Z])$/);
  if (!match) return false;
  const digits = match[1].replace('X', '0').replace('Y', '1').replace('Z', '2');
  return DNI_LETTERS[parseInt(digits, 10) % 23] === match[2];
}

// Whole years between birth and today.
export function ageOn(birthDate: string, today = new Date()): number {
  const birth = new Date(`${birthDate}T00:00:00`);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}
