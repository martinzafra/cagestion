import type { BookingGuest } from '@/lib/supabase';
import { ageOn } from '@/lib/guestCheckin';

// Builds the "parte de viajeros" XML that SES.HOSPEDAJES accepts through its
// bulk upload ("Alta masiva de comunicaciones"). Structure and codes follow
// the Ministry's "Instrucciones alta masiva v1.1.1" and the web-service spec
// "Servicio de Hospedajes - Comunicaciones v3.1.2" (same XSD):
//   <alt:peticion xmlns:alt="http://www.neg.hospedajes.mir.es/altaParteHospedaje">
//     <solicitud><codigoEstablecimiento/><comunicacion><contrato/><persona/>...

export const SES_PAYMENT_TYPES: Record<string, string> = {
  EFECT: 'Cash',
  TARJT: 'Credit card',
  PLATF: 'Payment platform',
  TRANS: 'Bank transfer',
  MOVIL: 'Mobile payment',
  TREG: 'Gift card',
  DESTI: 'Pay at destination',
  OTRO: 'Other',
};

// Our sex codes -> SES catalogue SEXO (H hombre, M mujer, O otro).
const SEX_CODES: Record<string, string> = { M: 'H', F: 'M', X: 'O' };

// The guest form asks a minor for the adult's relationship to them
// ("parent" = the adult is their parent). SES wants it as TIPO_PARENTESCO
// codes: on the adult, their relation to the minor; on the minor, the
// inverse (the Ministry's own example puts HJ on the child).
const ADULT_RELATIONSHIP: Record<string, string> = {
  parent: 'PM',
  guardian: 'TU',
  grandparent: 'AB',
  sibling: 'HR',
  uncle_aunt: 'TI',
  other: 'OT',
};
const MINOR_RELATIONSHIP: Record<string, string> = {
  parent: 'HJ',
  guardian: 'OT',
  grandparent: 'NI',
  sibling: 'HR',
  uncle_aunt: 'SB',
  other: 'OT',
};

// ISO 3166-1 alpha-2 -> alpha-3, for every country the guest form offers.
const ALPHA3: Record<string, string> = {
  AD: 'AND', AE: 'ARE', AF: 'AFG', AG: 'ATG', AI: 'AIA', AL: 'ALB', AM: 'ARM', AO: 'AGO', AR: 'ARG',
  AS: 'ASM', AT: 'AUT', AU: 'AUS', AW: 'ABW', AZ: 'AZE', BA: 'BIH', BB: 'BRB', BD: 'BGD', BE: 'BEL',
  BF: 'BFA', BG: 'BGR', BH: 'BHR', BI: 'BDI', BJ: 'BEN', BM: 'BMU', BN: 'BRN', BO: 'BOL', BR: 'BRA',
  BS: 'BHS', BT: 'BTN', BW: 'BWA', BY: 'BLR', BZ: 'BLZ', CA: 'CAN', CD: 'COD', CF: 'CAF', CG: 'COG',
  CH: 'CHE', CI: 'CIV', CL: 'CHL', CM: 'CMR', CN: 'CHN', CO: 'COL', CR: 'CRI', CU: 'CUB', CV: 'CPV',
  CY: 'CYP', CZ: 'CZE', DE: 'DEU', DJ: 'DJI', DK: 'DNK', DM: 'DMA', DO: 'DOM', DZ: 'DZA', EC: 'ECU',
  EE: 'EST', EG: 'EGY', ER: 'ERI', ES: 'ESP', ET: 'ETH', FI: 'FIN', FJ: 'FJI', FM: 'FSM', FO: 'FRO',
  FR: 'FRA', GA: 'GAB', GB: 'GBR', GD: 'GRD', GE: 'GEO', GH: 'GHA', GI: 'GIB', GL: 'GRL', GM: 'GMB',
  GN: 'GIN', GQ: 'GNQ', GR: 'GRC', GT: 'GTM', GU: 'GUM', GW: 'GNB', GY: 'GUY', HK: 'HKG', HN: 'HND',
  HR: 'HRV', HT: 'HTI', HU: 'HUN', ID: 'IDN', IE: 'IRL', IL: 'ISR', IN: 'IND', IQ: 'IRQ', IR: 'IRN',
  IS: 'ISL', IT: 'ITA', JM: 'JAM', JO: 'JOR', JP: 'JPN', KE: 'KEN', KG: 'KGZ', KH: 'KHM', KI: 'KIR',
  KM: 'COM', KN: 'KNA', KP: 'PRK', KR: 'KOR', KW: 'KWT', KY: 'CYM', KZ: 'KAZ', LA: 'LAO', LB: 'LBN',
  LC: 'LCA', LI: 'LIE', LK: 'LKA', LR: 'LBR', LS: 'LSO', LT: 'LTU', LU: 'LUX', LV: 'LVA', LY: 'LBY',
  MA: 'MAR', MC: 'MCO', MD: 'MDA', ME: 'MNE', MG: 'MDG', MH: 'MHL', MK: 'MKD', ML: 'MLI', MM: 'MMR',
  MN: 'MNG', MO: 'MAC', MR: 'MRT', MT: 'MLT', MU: 'MUS', MV: 'MDV', MW: 'MWI', MX: 'MEX', MY: 'MYS',
  MZ: 'MOZ', NA: 'NAM', NE: 'NER', NG: 'NGA', NI: 'NIC', NL: 'NLD', NO: 'NOR', NP: 'NPL', NR: 'NRU',
  NZ: 'NZL', OM: 'OMN', PA: 'PAN', PE: 'PER', PG: 'PNG', PH: 'PHL', PK: 'PAK', PL: 'POL', PR: 'PRI',
  PS: 'PSE', PT: 'PRT', PW: 'PLW', PY: 'PRY', QA: 'QAT', RO: 'ROU', RS: 'SRB', RU: 'RUS', RW: 'RWA',
  SA: 'SAU', SB: 'SLB', SC: 'SYC', SD: 'SDN', SE: 'SWE', SG: 'SGP', SI: 'SVN', SK: 'SVK', SL: 'SLE',
  SM: 'SMR', SN: 'SEN', SO: 'SOM', SR: 'SUR', SS: 'SSD', ST: 'STP', SV: 'SLV', SY: 'SYR', SZ: 'SWZ',
  TD: 'TCD', TG: 'TGO', TH: 'THA', TJ: 'TJK', TL: 'TLS', TM: 'TKM', TN: 'TUN', TO: 'TON', TR: 'TUR',
  TT: 'TTO', TV: 'TUV', TW: 'TWN', TZ: 'TZA', UA: 'UKR', UG: 'UGA', US: 'USA', UY: 'URY', UZ: 'UZB',
  VA: 'VAT', VC: 'VCT', VE: 'VEN', VN: 'VNM', VU: 'VUT', WS: 'WSM', XK: 'XKX', YE: 'YEM', ZA: 'ZAF',
  ZM: 'ZMB', ZW: 'ZWE',
};

export function toAlpha3(code: string | null | undefined): string {
  if (!code) return '';
  return ALPHA3[code.toUpperCase()] || code.toUpperCase();
}

export interface SesBooking {
  booking_ref: string | null;
  booking_id_number: number;
  booking_date: string;
  check_in_date: string;
  check_in_time: string | null;
  check_out_date: string;
  check_out_time: string | null;
  establishment_code: string;
  payment_type: string;
}

// Suggested SES payment type from what the booking already records.
export function suggestPaymentType(platform?: string | null, paymentType?: string | null): string {
  const p = (platform || '').toLowerCase();
  if (['airbnb', 'bookings', 'booking', 'vrvo', 'vrbo'].some((name) => p.includes(name))) return 'PLATF';
  const t = (paymentType || '').toLowerCase();
  if (t === 'cash') return 'EFECT';
  if (t === 'transfer') return 'TRANS';
  if (t === 'platform') return 'PLATF';
  return '';
}

function dateTime(date: string, time: string | null, fallback: string): string {
  const hhmm = (time || fallback).slice(0, 5);
  return `${date}T${hhmm}:00`;
}

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

// Everything SES would reject, phrased for the admin, so the panel can list
// what to fix before offering the download. Empty when the XML is ready.
export function sesProblems(booking: SesBooking, guests: BookingGuest[]): string[] {
  const problems: string[] = [];
  if (!/^\w{1,10}$/.test(booking.establishment_code.trim())) {
    problems.push('SES establishment code missing for this apartment (Inventory → Apartments).');
  }
  if (!booking.payment_type) problems.push('Choose the payment type.');
  if (guests.length === 0) problems.push('No guests registered yet.');
  const hasContact = guests.some((g) => g.phone || g.email);
  if (!hasContact) problems.push('At least one guest needs a phone or email.');
  guests.forEach((g) => {
    const name = `${g.position}. ${g.first_name} ${g.last_name_1}`;
    const adult = ageOn(g.birth_date) >= 18;
    if (adult && (!g.document_type || !g.document_number)) problems.push(`${name}: identity document missing.`);
    if (g.document_type === 'NIF' && !g.last_name_2) problems.push(`${name}: second surname is required with a DNI.`);
    if ((g.document_type === 'NIF' || g.document_type === 'NIE') && !g.document_support_number) {
      problems.push(`${name}: support number is required with a DNI/NIE.`);
    }
    if (!g.postal_code) problems.push(`${name}: postcode missing.`);
    if (g.country === 'ES' && !/^\d{5}$/.test(g.municipality_code || '')) {
      problems.push(`${name}: lives in Spain - enter the 5-digit INE municipality code.`);
    }
    if (!adult && !g.relationship) problems.push(`${name}: minor without relationship to an adult.`);
  });
  return problems;
}

export function buildSesXml(booking: SesBooking, guests: BookingGuest[]): string {
  const lead = guests.find((g) => g.phone || g.email);
  const firstAdult = guests.find((g) => ageOn(g.birth_date) >= 18);
  const firstMinor = guests.find((g) => ageOn(g.birth_date) < 18 && g.relationship);

  const tag = (name: string, value: string | number | null | undefined, indent: string) =>
    value === null || value === undefined || value === ''
      ? ''
      : `${indent}<${name}>${escapeXml(String(value))}</${name}>\n`;

  const persona = (g: BookingGuest) => {
    const i = '        ';
    const adult = ageOn(g.birth_date) >= 18;
    // Every person needs a phone or email; minors without their own get the
    // contact of the guest who gave one, as in the Ministry's example.
    const phone = g.phone || (g.email ? null : lead?.phone);
    const email = g.email || (g.phone ? null : lead?.email);
    const relationship = adult
      ? g.id === firstAdult?.id && firstMinor
        ? ADULT_RELATIONSHIP[firstMinor.relationship!]
        : null
      : g.relationship
      ? MINOR_RELATIONSHIP[g.relationship]
      : null;
    const isSpain = g.country === 'ES';
    return (
      `      <persona>\n` +
      tag('rol', 'VI', i) +
      tag('nombre', g.first_name, i) +
      tag('apellido1', g.last_name_1, i) +
      tag('apellido2', g.last_name_2, i) +
      tag('tipoDocumento', g.document_type, i) +
      tag('numeroDocumento', g.document_number, i) +
      tag('soporteDocumento', g.document_support_number, i) +
      tag('fechaNacimiento', g.birth_date, i) +
      tag('nacionalidad', toAlpha3(g.nationality), i) +
      tag('sexo', SEX_CODES[g.sex], i) +
      `${i}<direccion>\n` +
      tag('direccion', g.address, `${i}  `) +
      (isSpain
        ? tag('codigoMunicipio', g.municipality_code, `${i}  `)
        : tag('nombreMunicipio', g.city, `${i}  `)) +
      tag('codigoPostal', g.postal_code, `${i}  `) +
      tag('pais', toAlpha3(g.country), `${i}  `) +
      `${i}</direccion>\n` +
      tag('telefono', phone, i) +
      tag('correo', email, i) +
      tag('parentesco', relationship, i) +
      `      </persona>\n`
    );
  };

  const reference = (booking.booking_ref || String(booking.booking_id_number)).slice(0, 50);
  const c = '        ';
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<alt:peticion xmlns:alt="http://www.neg.hospedajes.mir.es/altaParteHospedaje">\n` +
    `  <solicitud>\n` +
    tag('codigoEstablecimiento', booking.establishment_code.trim(), '    ') +
    `    <comunicacion>\n` +
    `      <contrato>\n` +
    tag('referencia', reference, c) +
    tag('fechaContrato', booking.booking_date, c) +
    tag('fechaEntrada', dateTime(booking.check_in_date, booking.check_in_time, '15:00'), c) +
    tag('fechaSalida', dateTime(booking.check_out_date, booking.check_out_time, '11:00'), c) +
    tag('numPersonas', guests.length, c) +
    `${c}<pago>\n` +
    tag('tipoPago', booking.payment_type, `${c}  `) +
    `${c}</pago>\n` +
    `      </contrato>\n` +
    guests.map(persona).join('') +
    `    </comunicacion>\n` +
    `  </solicitud>\n` +
    `</alt:peticion>\n`
  );
}
