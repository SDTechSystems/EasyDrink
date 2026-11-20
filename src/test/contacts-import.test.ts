import { describe, it, expect } from 'vitest';
import { planContactMerge } from '@/lib/contacts-import';
import type { Customer } from '@/lib/db';

const c = (id: number, name: string, phone = ''): Customer => ({
  id, name, phone, email: '', address: '', notes: '', createdAt: new Date(), isDeleted: 0, deletedAt: null,
});

describe('planContactMerge', () => {
  it('fills phones of matching customers, creates new ones and skips known numbers', () => {
    const plan = planContactMerge(
      [c(1, 'Juan Becerra'), c(2, 'Estefanía Álvarez'), c(3, 'Moe', '3001112233')],
      [
        { name: 'Juan Becerra Oficina', phone: '+57 300 123 4567' },
        { name: 'estefania alvarez', phone: '3109998877' },
        { name: 'Moe', phone: '300 111 2233' },
        { name: 'Pedro Pérez', phone: '3205556677' },
        { name: 'Sin número', phone: '' },
      ],
    );
    expect(plan.updates).toEqual([
      { id: 1, name: 'Juan Becerra', phone: '+57 300 123 4567' },
      { id: 2, name: 'Estefanía Álvarez', phone: '3109998877' },
    ]);
    expect(plan.skipped.map((x) => x.name)).toEqual(['Moe']);
    expect(plan.creates.map((x) => x.name)).toEqual(['Pedro Pérez']);
  });
});
