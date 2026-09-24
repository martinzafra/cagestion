import JSZip from 'jszip';
import { supabase } from '@/lib/supabase';

interface DocSource {
  bucket: string;
  path: string;
  folder: string;
}

const safe = (s: string) => s.replace(/[^\w.\-]+/g, '_');

// Bundles every document stored against a booking (revenue invoices,
// expense invoices / owner's expenses, settlement, police registration and
// free-form attachments) into one zip and triggers a browser download.
// Returns the number of files included (0 = nothing to download).
export async function downloadBookingDocuments(booking: any): Promise<number> {
  const [revenue, expenses] = await Promise.all([
    supabase.from('revenue_invoicing').select('attachment_url').eq('booking_id', booking.id),
    supabase.from('expenses').select('attachment_url').eq('booking_id', booking.id),
  ]);
  if (revenue.error) throw revenue.error;
  if (expenses.error) throw expenses.error;

  const sources: DocSource[] = [];
  (revenue.data || []).forEach((r: any) => {
    if (r.attachment_url) {
      sources.push({ bucket: 'revenue-attachments', path: r.attachment_url, folder: 'Revenue Invoices' });
    }
  });
  (expenses.data || []).forEach((e: any) => {
    if (e.attachment_url) {
      sources.push({ bucket: 'expense-attachments', path: e.attachment_url, folder: 'Expenses' });
    }
  });
  if (booking.final_liquidation_file) {
    sources.push({ bucket: 'settlement-attachments', path: booking.final_liquidation_file, folder: 'Settlement' });
  }
  if (booking.police_registration_file) {
    sources.push({ bucket: 'police-registrations', path: booking.police_registration_file, folder: 'Police Registration' });
  }
  (booking.attachments || []).forEach((path: string) => {
    sources.push({ bucket: 'booking-attachments', path, folder: 'Attachments' });
  });

  if (sources.length === 0) return 0;

  const zip = new JSZip();
  const used = new Set<string>();
  await Promise.all(
    sources.map(async (src) => {
      const { data, error } = await supabase.storage.from(src.bucket).download(src.path);
      if (error || !data) throw error || new Error('Download failed');
      const base = src.path.split('/').pop() as string;
      let name = `${src.folder}/${base}`;
      for (let i = 1; used.has(name); i++) name = `${src.folder}/${i}-${base}`;
      used.add(name);
      zip.file(name, data);
    })
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const nameParts = [booking.booking_ref || booking.id, booking.guest_name || 'booking', booking.apartment?.name];
  a.download = `${nameParts.filter(Boolean).map((p) => safe(String(p))).join('_')}.zip`;
  a.click();
  URL.revokeObjectURL(url);
  return sources.length;
}
