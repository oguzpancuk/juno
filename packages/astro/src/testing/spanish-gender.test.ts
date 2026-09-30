import { describe, expect, it } from 'vitest';
import { spanishGenderHits } from './spanish-gender';

describe('spanishGenderHits', () => {
  // Review round 2 on #17: forms the first lists let through.
  it.each([
    'Puedes sentirte atraída por su calma.',
    'Con su Luna te sientes seguro.',
    'A veces te sientes solo.',
    'Eres sincero sin esfuerzo.',
    'Estás listo para el cambio.',
    'Lo resuelves tú misma.',
    'Se lo cuentas a todas.',
    'Uno sacude los hábitos emocionales del otro.',
    'Convertir el enojo en pasión es tarea de los dos.',
    'Una conexión positiva para ambos.',
    'Pueden hacer mucho juntas.',
    '¿Por qué lo denuncias?',
  ])('catches "%s"', (text) => {
    expect(spanishGenderHits(text)).not.toEqual([]);
  });

  it.each([
    'Los dos Soles son de fuego.',
    'Las dos cosas son posibles.',
    'Del otro lado, la calma.',
    'Aburre a las dos partes.',
    'Estás a gusto en casa.',
    'Eres capaz de mucho.',
    'Todas',
    'Se entienden mutuamente.',
    'Estás acercando posturas.',
  ])('lets "%s" through', (text) => {
    expect(spanishGenderHits(text)).toEqual([]);
  });
});
