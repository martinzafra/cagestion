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
    <div className="flex justify-end gap-1 text-sm">
      {(['es', 'en'] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={`px-2.5 py-1 rounded ${lang === l ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
      <div className="min-h-screen bg-linen py-8 px-4">
        <div className="max-w-xl mx-auto">
          {langSwitch}
          <div className="text-center mt-16">
            {done && <CheckCircle2 size={48} className="mx-auto text-green-600 mb-4" />}
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-gray-600 mt-2">{text}</p>
          </div>
        </div>
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

  return (
    <div className="min-h-screen bg-linen py-6 px-4">
      <form onSubmit={handleSubmit} noValidate className="max-w-xl mx-auto space-y-5">
        {langSwitch}

        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-gray-900 font-medium mt-1">{checkin.apartment_name}</p>
          <p className="text-gray-600 text-sm">
            {t.stay}: {formatDate(checkin.check_in_date)} – {formatDate(checkin.check_out_date)}
          </p>
        </div>

        <p className="text-sm text-gray-700">{t.intro}</p>

        {checkin.submitted && (
          <div className="rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm p-3">
            {t.alreadySent}
          </div>
        )}

        {guests.map((g, idx) => {
          const age = g.birth_date ? ageOn(g.birth_date) : null;
          const isSpanishId = g.document_type === 'NIF' || g.document_type === 'NIE';
          return (
            <div key={idx} className="card space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">
                  {t.guest} {idx + 1}
                  {idx === 0 && <span className="text-gray-500 font-normal"> · {t.lead}</span>}
                </h2>
                {guests.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setGuests((prev) => prev.filter((_, i) => i !== idx));
                      setErrors({});
                    }}
                    className="text-sm text-red-600 flex items-center gap-1 hover:bg-red-50 rounded px-2 py-1"
                  >
                    <Trash2 size={14} />
                    {t.removeGuest}
                  </button>
                )}
              </div>

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

              {age !== null && age < 14 && <p className="text-xs text-gray-500">{t.minorNote}</p>}

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
          );
        })}

        {guests.length < 20 && (
          <button
            type="button"
            onClick={() => setGuests((prev) => [...prev, emptyGuest()])}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            {t.addGuest}
          </button>
        )}

        <label className="flex items-start gap-2.5 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          {t.consent}
        </label>

        {formError && <p className="text-sm text-red-600 text-center">{formError}</p>}

        <button type="submit" disabled={sending} className="btn-primary w-full">
          {sending ? t.sending : t.submit}
        </button>
      </form>
    </div>
  );
}
