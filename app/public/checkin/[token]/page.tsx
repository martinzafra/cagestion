'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/calculations';
import { getCountryOptions, isValidSpanishId, ageOn } from '@/lib/guestCheckin';

// Guest-facing traveller registration, opened from the per-booking link the
// admin shares from To Do. Unauthenticated: everything goes through the
// get_public_checkin / submit_guest_checkin functions keyed by the token.

type Lang = 'es' | 'en';

// Look & feel borrowed from casaamiga.pl so guests land on something that
// feels like the brand site: its hero photo, logo, Cormorant headings.
const SITE_URL = 'https://casaamiga.pl';
const LOGO_URL = 'https://casaamiga.pl/images/corp/CA-logo2.png';
const HERO_URL = 'https://casaamiga.pl/images/background/2.jpg';
const SERIF: React.CSSProperties = {
  fontFamily: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
};

interface PublicCheckin {
  apartment_name: string;
  check_in_date: string;
  check_out_date: string;
  number_of_guests: number | null;
  submitted: boolean;
  can_submit: boolean;
}

interface GuestDraft {
  first_name: string;
  last_name_1: string;
  last_name_2: string;
  sex: string;
  birth_date: string;
  nationality: string;
  document_type: string;
  document_number: string;
  document_support_number: string;
  document_issue_date: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
  relationship: string;
}

const emptyGuest = (): GuestDraft => ({
  first_name: '',
  last_name_1: '',
  last_name_2: '',
  sex: '',
  birth_date: '',
  nationality: '',
  document_type: '',
  document_number: '',
  document_support_number: '',
  document_issue_date: '',
  address: '',
  city: '',
  postal_code: '',
  country: '',
  phone: '',
  email: '',
  relationship: '',
});

const TEXT = {
  es: {
    title: 'Registro de viajeros',
    titleLead: 'Registro de',
    titleAccent: 'viajeros',
    eyebrow: 'Costa Tropical · España',
    sectionPersonal: 'Datos personales',
    sectionDocument: 'Documento de identidad',
    sectionContact: 'Residencia y contacto',
    footer: 'Alquiler vacacional con alma en la Costa Tropical de España.',
    intro:
      'La ley española (Real Decreto 933/2021) obliga a comunicar a la policía los datos de todas las personas que se alojan. Por favor, rellena los datos de cada viajero.',
    stay: 'Estancia',
    guest: 'Viajero',
    lead: 'titular de la reserva',
    firstName: 'Nombre',
    lastName1: 'Primer apellido',
    lastName2: 'Segundo apellido',
    sex: 'Sexo',
    sexes: { M: 'Hombre', F: 'Mujer', X: 'Otro' } as Record<string, string>,
    birthDate: 'Fecha de nacimiento',
    nationality: 'Nacionalidad',
    docType: 'Tipo de documento',
    docTypes: { NIF: 'DNI (España)', NIE: 'NIE (España)', PAS: 'Pasaporte', OTRO: 'Otro documento' } as Record<string, string>,
    docNumber: 'Número de documento',
    supportNumber: 'Número de soporte',
    supportHint: 'Aparece en el DNI/NIE (p. ej. "IDESP" o bajo la foto).',
    issueDate: 'Fecha de expedición',
    address: 'Dirección de residencia',
    city: 'Localidad',
    postalCode: 'Código postal',
    country: 'País de residencia',
    phone: 'Teléfono',
    email: 'Email',
    relationship: 'Parentesco con un viajero adulto',
    relationships: {
      parent: 'Padre / Madre',
      guardian: 'Tutor legal',
      grandparent: 'Abuelo/a',
      sibling: 'Hermano/a',
      uncle_aunt: 'Tío/a',
      other: 'Otro',
    } as Record<string, string>,
    minorNote: 'Menor de 14 años: el documento es opcional.',
    select: 'Selecciona...',
    optional: '(opcional)',
    addGuest: 'Añadir viajero',
    removeGuest: 'Quitar',
    consent:
      'Doy mi consentimiento para que estos datos se utilicen para cumplir la obligación legal de registro de viajeros y se comuniquen a las Fuerzas y Cuerpos de Seguridad. Se conservarán durante 3 años.',
    submit: 'Enviar datos',
    sending: 'Enviando...',
    alreadySent: 'Ya recibimos vuestros datos. Si necesitas corregir algo, vuelve a enviar el formulario completo.',
    doneTitle: '¡Gracias!',
    doneText: 'Hemos recibido los datos de los viajeros. Nos vemos pronto.',
    closedTitle: 'Registro cerrado',
    closedText: 'Este registro ya no admite cambios. Si necesitas algo, contacta con nosotros.',
    notFoundTitle: 'Enlace no válido',
    notFoundText: 'Este enlace no es válido o ha caducado.',
    errRequired: 'Obligatorio',
    errDocInvalid: 'Número de documento no válido',
    errFuture: 'La fecha no puede ser futura',
    errEmail: 'Email no válido',
    errFix: 'Revisa los campos marcados en rojo.',
    errConsent: 'Debes aceptar para continuar.',
    errSend: 'No se pudieron enviar los datos. Inténtalo de nuevo.',
  },
  en: {
    title: 'Guest registration',
    titleLead: 'Guest',
    titleAccent: 'registration',
    eyebrow: 'Costa Tropical · Spain',
    sectionPersonal: 'Personal details',
    sectionDocument: 'Identity document',
    sectionContact: 'Residence & contact',
    footer: "Holiday rentals with soul on Spain's Costa Tropical.",
    intro:
      'Spanish law (Royal Decree 933/2021) requires us to report the details of everyone staying to the police. Please fill in the details of each guest.',
    stay: 'Stay',
    guest: 'Guest',
    lead: 'main guest',
    firstName: 'First name',
    lastName1: 'Surname',
    lastName2: 'Second surname',
    sex: 'Sex',
    sexes: { M: 'Male', F: 'Female', X: 'Other' } as Record<string, string>,
    birthDate: 'Date of birth',
    nationality: 'Nationality',
    docType: 'Document type',
    docTypes: { NIF: 'DNI (Spain)', NIE: 'NIE (Spain)', PAS: 'Passport', OTRO: 'Other ID' } as Record<string, string>,
    docNumber: 'Document number',
    supportNumber: 'Support number',
    supportHint: 'Printed on the DNI/NIE card (e.g. "IDESP" or under the photo).',
    issueDate: 'Issue date',
    address: 'Home address',
    city: 'City',
    postalCode: 'Postcode',
    country: 'Country of residence',
    phone: 'Phone',
    email: 'Email',
    relationship: 'Relationship to an adult guest',
    relationships: {
      parent: 'Parent',
      guardian: 'Legal guardian',
      grandparent: 'Grandparent',
      sibling: 'Sibling',
      uncle_aunt: 'Uncle / Aunt',
      other: 'Other',
    } as Record<string, string>,
    minorNote: 'Under 14: the document is optional.',
    select: 'Select...',
    optional: '(optional)',
    addGuest: 'Add guest',
    removeGuest: 'Remove',
    consent:
      'I consent to these details being used to meet the legal guest registration requirement and being reported to the Spanish law enforcement authorities. They will be kept for 3 years.',
    submit: 'Send details',
    sending: 'Sending...',
    alreadySent: 'We already have your details. If you need to correct something, just send the full form again.',
    doneTitle: 'Thank you!',
    doneText: "We've received your guests' details. See you soon.",
    closedTitle: 'Registration closed',
    closedText: 'This registration can no longer be changed. Please contact us if you need anything.',
    notFoundTitle: 'Invalid link',
    notFoundText: 'This link is invalid or has expired.',
    errRequired: 'Required',
    errDocInvalid: 'Invalid document number',
    errFuture: 'Date cannot be in the future',
    errEmail: 'Invalid email',
    errFix: 'Please check the fields marked in red.',
    errConsent: 'You must accept to continue.',
    errSend: "Your details couldn't be sent. Please try again.",
  },
};

type Errors = Record<number, Partial<Record<keyof GuestDraft, string>>>;

function validate(guests: GuestDraft[], t: (typeof TEXT)[Lang]): Errors {
  const errors: Errors = {};
  const todayKey = new Date().toISOString().split('T')[0];
  guests.forEach((g, idx) => {
    const e: Partial<Record<keyof GuestDraft, string>> = {};
    const required: (keyof GuestDraft)[] = [
      'first_name',
      'last_name_1',
      'sex',
      'birth_date',
      'nationality',
      'address',
      'city',
      'country',
    ];
    required.forEach((field) => {
      if (!g[field].trim()) e[field] = t.errRequired;
    });

    if (g.birth_date && g.birth_date > todayKey) e.birth_date = t.errFuture;
    const age = g.birth_date ? ageOn(g.birth_date) : null;

    if (age === null || age >= 14) {
      if (!g.document_type) e.document_type = t.errRequired;
      if (!g.document_number.trim()) {
        e.document_number = t.errRequired;
      } else if (
        (g.document_type === 'NIF' || g.document_type === 'NIE') &&
        !isValidSpanishId(g.document_type, g.document_number)
      ) {
        e.document_number = t.errDocInvalid;
      }
      if ((g.document_type === 'NIF' || g.document_type === 'NIE') && !g.document_support_number.trim()) {
        e.document_support_number = t.errRequired;
      }
    }
    if (g.document_issue_date && g.document_issue_date > todayKey) e.document_issue_date = t.errFuture;

    if (age !== null && age < 18 && !g.relationship) e.relationship = t.errRequired;
    if ((age === null || age >= 18) && !g.phone.trim()) e.phone = t.errRequired;
    if (idx === 0 && !g.email.trim()) e.email = t.errRequired;
    if (g.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email.trim())) e.email = t.errEmail;

    if (Object.keys(e).length) errors[idx] = e;
  });
  return errors;
}

export default function PublicGuestCheckinPage() {
  const params = useParams();
  const token = params.token as string;

  const [lang, setLang] = useState<Lang>('es');
  const [checkin, setCheckin] = useState<PublicCheckin | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [guests, setGuests] = useState<GuestDraft[]>([emptyGuest()]);
  const [errors, setErrors] = useState<Errors>({});
  const [consent, setConsent] = useState(false);
  const [formError, setFormError] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const t = TEXT[lang];
  const countries = useMemo(() => getCountryOptions(lang), [lang]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.language.toLowerCase().startsWith('es')) {
      setLang('en');
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.rpc('get_public_checkin', { p_token: token }).maybeSingle();
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const row = data as PublicCheckin;
      setCheckin(row);
      const count = Math.min(Math.max(row.number_of_guests || 1, 1), 20);
      setGuests(Array.from({ length: count }, emptyGuest));
      setLoading(false);
    };
    load();
  }, [token]);

  const updateGuest = (idx: number, field: keyof GuestDraft, value: string) => {
    setGuests((prev) => prev.map((g, i) => (i === idx ? { ...g, [field]: value } : g)));
    if (errors[idx]?.[field]) {
      setErrors((prev) => {
        const next = { ...prev, [idx]: { ...prev[idx] } };
        delete next[idx][field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(guests, t);
    setErrors(found);
    if (Object.keys(found).length) {
      setFormError(t.errFix);
      return;
    }
    if (!consent) {
      setFormError(t.errConsent);
      return;
    }
    setFormError('');
    setSending(true);
    const { error } = await supabase.rpc('submit_guest_checkin', {
      p_token: token,
      p_guests: guests,
    });
    setSending(false);
    if (error) {
      setFormError(t.errSend);
      return;
    }
    setDone(true);
    window.scrollTo({ top: 0 });
  };

  const langSwitch = (
    <div className="flex gap-1 text-sm">
      {(['es', 'en'] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={`px-3 py-1 rounded-full font-semibold transition ${
            lang === l ? 'bg-white text-azure' : 'text-white/85 hover:bg-white/15'
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );

  // Photo header like the brand site's hero: logo + language pills on top,
  // the page's title block centred over the image.
  const hero = (content: React.ReactNode) => (
    <header
      className="relative text-white bg-cover bg-center"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(8,40,60,.60) 0%, rgba(8,40,60,.45) 45%, rgba(8,40,60,.75) 100%), url(${HERO_URL})`,
      }}
    >
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-16 sm:pb-20">
        <div className="flex items-center justify-between gap-3">
          <a href={SITE_URL} className="flex items-center gap-2.5 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_URL} alt="Casa Amiga" className="h-9 w-auto shrink-0" />
            <span style={SERIF} className="text-2xl font-bold tracking-[0.06em] text-white/90 truncate">
              casa amiga
            </span>
          </a>
          {langSwitch}
        </div>
        <div className="text-center mt-10 sm:mt-14">{content}</div>
      </div>
    </header>
  );

  const eyebrow = (
    <p style={SERIF} className="text-sky font-semibold uppercase tracking-[0.28em] text-sm sm:text-base">
      {t.eyebrow}
    </p>
  );

  const footer = (
    <footer className="max-w-2xl mx-auto px-4 pt-8 pb-10 text-center border-t border-sand">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_URL} alt="Casa Amiga" className="h-14 w-auto mx-auto" />
      <p style={SERIF} className="text-2xl font-medium text-ink mt-2">
        Casa Amiga
      </p>
      <p style={SERIF} className="text-gray-600 text-lg">{t.footer}</p>
      <a href={SITE_URL} className="inline-block mt-2 text-azure font-medium hover:underline">
        casaamiga.pl
      </a>
    </footer>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-linen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-azure"></div>
      </div>
    );
  }

  if (notFound || !checkin || !checkin.can_submit || done) {
    const [title, text] = done
      ? [t.doneTitle, t.doneText]
      : notFound || !checkin
      ? [t.notFoundTitle, t.notFoundText]
      : [t.closedTitle, t.closedText];
    return (
      <div className="min-h-screen bg-linen">
        {hero(
          <>
            {eyebrow}
            {done && <CheckCircle2 size={52} strokeWidth={1.5} className="mx-auto text-sky mt-6" />}
            <h1 className="text-4xl sm:text-5xl font-light leading-tight mt-4">{title}</h1>
            <p style={SERIF} className="text-xl text-white/90 mt-3 max-w-md mx-auto">
              {text}
            </p>
          </>
        )}
        <div className="pt-10">{footer}</div>
      </div>
    );
  }

  const field = (
    idx: number,
    name: keyof GuestDraft,
    label: string,
    input: React.ReactNode,
    hint?: string
  ) => (
    <div>
      <label className="label">{label}</label>
      {input}
      {errors[idx]?.[name] ? (
        <p className="text-xs text-red-600 mt-1">{errors[idx]?.[name]}</p>
      ) : (
        hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>
      )}
    </div>
  );

  const inputClass = (idx: number, name: keyof GuestDraft) =>
    `input w-full ${errors[idx]?.[name] ? '!border-red-500' : ''}`;

  const textInput = (idx: number, name: keyof GuestDraft, type = 'text', autoComplete?: string) => (
    <input
      type={type}
      value={guests[idx][name]}
      autoComplete={autoComplete}
      onChange={(e) => updateGuest(idx, name, e.target.value)}
      className={inputClass(idx, name)}
    />
  );

  const selectInput = (idx: number, name: keyof GuestDraft, options: { value: string; label: string }[]) => (
    <select
      value={guests[idx][name]}
      onChange={(e) => updateGuest(idx, name, e.target.value)}
      className={`select w-full ${errors[idx]?.[name] ? '!border-red-500' : ''}`}
    >
      <option value="">{t.select}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  const countryOptions = countries.map((c) => ({ value: c.code, label: c.name }));

  const sectionTitle = (text: string) => (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-azure mb-3">{text}</p>
  );

  return (
    <div className="min-h-screen bg-linen">
      {hero(
        <>
          {eyebrow}
          <h1 className="text-4xl sm:text-5xl font-light leading-tight mt-3">
            {t.titleLead} <em className="italic text-sky">{t.titleAccent}</em>
          </h1>
          <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-x-2 rounded-full bg-white/15 backdrop-blur-sm px-5 py-2 text-sm">
            <span className="font-semibold">{checkin.apartment_name}</span>
            <span className="text-white/60">·</span>
            <span>
              {formatDate(checkin.check_in_date)} – {formatDate(checkin.check_out_date)}
            </span>
          </div>
        </>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="relative max-w-2xl mx-auto px-4 -mt-8 sm:-mt-10 pb-12 space-y-6"
      >
        <div className="card">
          <p style={SERIF} className="text-lg sm:text-xl leading-snug text-gray-700">
            {t.intro}
          </p>
          {checkin.submitted && (
            <div className="mt-4 rounded-2xl bg-blue-50 text-azure text-sm p-3">{t.alreadySent}</div>
          )}
        </div>

        {guests.map((g, idx) => {
          const age = g.birth_date ? ageOn(g.birth_date) : null;
          const isSpanishId = g.document_type === 'NIF' || g.document_type === 'NIE';
          return (
            <div key={idx} className="card space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 shrink-0 rounded-full bg-azure text-white flex items-center justify-center font-semibold">
                    {idx + 1}
                  </span>
                  <div>
                    <h2 className="text-2xl font-medium text-ink leading-none">
                      {t.guest} {idx + 1}
                    </h2>
                    {idx === 0 && (
                      <p className="text-xs uppercase tracking-[0.14em] text-gray-500 mt-1">{t.lead}</p>
                    )}
                  </div>
                </div>
                {guests.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setGuests((prev) => prev.filter((_, i) => i !== idx));
                      setErrors({});
                    }}
                    className="text-sm text-red-600 flex items-center gap-1 hover:bg-red-50 rounded-full px-3 py-1.5"
                  >
                    <Trash2 size={14} />
                    {t.removeGuest}
                  </button>
                )}
              </div>

              <div className="border-t border-sand pt-5">
              {sectionTitle(t.sectionPersonal)}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {field(idx, 'first_name', t.firstName, textInput(idx, 'first_name', 'text', 'given-name'))}
                {field(idx, 'last_name_1', t.lastName1, textInput(idx, 'last_name_1', 'text', 'family-name'))}
                {field(idx, 'last_name_2', `${t.lastName2} ${t.optional}`, textInput(idx, 'last_name_2'))}
                {field(
                  idx,
                  'sex',
                  t.sex,
                  selectInput(idx, 'sex', Object.entries(t.sexes).map(([value, label]) => ({ value, label })))
                )}
                {field(idx, 'birth_date', t.birthDate, textInput(idx, 'birth_date', 'date', 'bday'))}
                {field(idx, 'nationality', t.nationality, selectInput(idx, 'nationality', countryOptions))}
              </div>
              </div>

              <div className="border-t border-sand pt-5">
              {sectionTitle(t.sectionDocument)}
              {age !== null && age < 14 && <p className="text-xs text-gray-500 -mt-1 mb-3">{t.minorNote}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {field(
                  idx,
                  'document_type',
                  t.docType,
                  selectInput(
                    idx,
                    'document_type',
                    Object.entries(t.docTypes).map(([value, label]) => ({ value, label }))
                  )
                )}
                {field(idx, 'document_number', t.docNumber, textInput(idx, 'document_number'))}
                {isSpanishId &&
                  field(
                    idx,
                    'document_support_number',
                    t.supportNumber,
                    textInput(idx, 'document_support_number'),
                    t.supportHint
                  )}
                {field(
                  idx,
                  'document_issue_date',
                  `${t.issueDate} ${t.optional}`,
                  textInput(idx, 'document_issue_date', 'date')
                )}
              </div>
              </div>

              <div className="border-t border-sand pt-5">
              {sectionTitle(t.sectionContact)}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  {field(idx, 'address', t.address, textInput(idx, 'address', 'text', 'street-address'))}
                </div>
                {field(idx, 'city', t.city, textInput(idx, 'city', 'text', 'address-level2'))}
                {field(
                  idx,
                  'postal_code',
                  `${t.postalCode} ${t.optional}`,
                  textInput(idx, 'postal_code', 'text', 'postal-code')
                )}
                {field(idx, 'country', t.country, selectInput(idx, 'country', countryOptions))}
                {field(
                  idx,
                  'phone',
                  age !== null && age < 18 ? `${t.phone} ${t.optional}` : t.phone,
                  textInput(idx, 'phone', 'tel', 'tel')
                )}
                {field(
                  idx,
                  'email',
                  idx === 0 ? t.email : `${t.email} ${t.optional}`,
                  textInput(idx, 'email', 'email', 'email')
                )}
                {age !== null &&
                  age < 18 &&
                  field(
                    idx,
                    'relationship',
                    t.relationship,
                    selectInput(
                      idx,
                      'relationship',
                      Object.entries(t.relationships).map(([value, label]) => ({ value, label }))
                    )
                  )}
              </div>
              </div>
            </div>
          );
        })}

        {guests.length < 20 && (
          <button
            type="button"
            onClick={() => setGuests((prev) => [...prev, emptyGuest()])}
            style={SERIF}
            className="w-full flex items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-sky text-azure text-lg font-medium py-4 hover:bg-white transition"
          >
            <Plus size={18} />
            {t.addGuest}
          </button>
        )}

        <div className="card space-y-5">
          <label className="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-azure"
            />
            {t.consent}
          </label>

          {formError && <p className="text-sm text-red-600 text-center">{formError}</p>}

          <button
            type="submit"
            disabled={sending}
            style={SERIF}
            className="btn-primary w-full justify-center py-3.5 text-xl tracking-wide disabled:opacity-60"
          >
            {sending ? t.sending : t.submit}
          </button>
        </div>
      </form>

      {footer}
    </div>
  );
}
