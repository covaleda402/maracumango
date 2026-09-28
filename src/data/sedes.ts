import type { Sede } from '../types';

export const SEDES: Sede[] = [
  {
    id: 'sede-1',
    nombre: 'Sede Parque del Amor y la Amistad',
    direccion: 'Cra. 7 / Calle 21',
    ciudad: 'Neiva, Huila',
    whatsapp: '3177401873',
    horario: 'Turno 1: 7:30 a.m. – 2:30 p.m. | Turno 2: 2:30 p.m. – 11:00 p.m.',
    shiftInfo: 'Turno Activo: Turno 2 (2:30 p.m. – 11:00 p.m.)',
    activa: true,
  },
  {
    id: 'sede-2',
    nombre: 'Sede Sector Edsbur / Único',
    direccion: 'Cerca al Centro Comercial Único',
    ciudad: 'Neiva, Huila',
    whatsapp: '3219759794',
    horario: 'Jornada Continua: 10:00 a.m. – 10:00 p.m.',
    shiftInfo: 'Turno Activo: Jornada Continua (10:00 a.m. – 10:00 p.m.)',
    activa: true,
  },
];

export const DEFAULT_SEDE_ID = 'sede-1';

export const getSedeById = (id: string): Sede => {
  return SEDES.find((s) => s.id === id) || SEDES[0];
};
