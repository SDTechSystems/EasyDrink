import type { Customer } from '@/lib/db';

/**
 * Importar contactos del teléfono (Contact Picker API de Chrome en Android).
 * Cruza los contactos elegidos con los clientes por nombre: completa el
 * WhatsApp de los que ya existen y crea los que no están.
 */

export interface PickedContact {
  name: string;
  phone: string;
}

export interface ContactMergePlan {
  updates: { id: number; name: string; phone: string }[];
  creates: PickedContact[];
  skipped: PickedContact[]; // el cliente ya tenía ese mismo número
}

export const normalizeName = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const digits = (s: string) => s.replace(/\D/g, '');

/** El contacto coincide si contiene todas las palabras del nombre del cliente (o al revés). */
function sameName(customerName: string, contactName: string): boolean {
  const a = normalizeName(customerName).split(' ').filter(Boolean);
  const b = normalizeName(contactName).split(' ').filter(Boolean);
  if (!a.length || !b.length) return false;
  const inB = a.every((w) => b.includes(w));
  const inA = b.every((w) => a.includes(w));
  return inB || inA;
}

export function planContactMerge(customers: Customer[], contacts: PickedContact[]): ContactMergePlan {
  const plan: ContactMergePlan = { updates: [], creates: [], skipped: [] };
  const used = new Set<number>();
  for (const contact of contacts) {
    if (!contact.name.trim() || !digits(contact.phone)) continue;
    const match = customers.find((c) => c.id != null && !used.has(c.id) && sameName(c.name, contact.name));
    if (!match) {
      plan.creates.push(contact);
      continue;
    }
    used.add(match.id!);
    if (digits(match.phone).endsWith(digits(contact.phone).slice(-10))) plan.skipped.push(contact);
    else plan.updates.push({ id: match.id!, name: match.name, phone: contact.phone });
  }
  return plan;
}

interface ContactsManager {
  select(props: string[], opts: { multiple: boolean }): Promise<{ name?: string[]; tel?: string[] }[]>;
}

export function canPickContacts(): boolean {
  return typeof navigator !== 'undefined' && 'contacts' in navigator && typeof window !== 'undefined' && 'ContactsManager' in window;
}

/** Abre el selector de contactos del teléfono. */
export async function pickContacts(): Promise<PickedContact[]> {
  const manager = (navigator as unknown as { contacts: ContactsManager }).contacts;
  const picked = await manager.select(['name', 'tel'], { multiple: true });
  return picked
    .map((c) => ({ name: (c.name?.[0] ?? '').trim(), phone: (c.tel?.[0] ?? '').trim() }))
    .filter((c) => c.name && c.phone);
}
