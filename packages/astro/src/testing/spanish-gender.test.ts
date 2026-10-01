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
    // Review round 3 on #17.
    'Piensas en el otro.',
    'Con el otro',
    'Contigo se siente segura.',
    'Eres profundo.',
    'Eres encantador.',
    'Los dos se quieren.',
    'Ambos saben escuchar.',
    'Todas saben lo que quieren.',
    'Aquí cada una elige.',
    'Están entrelazados desde el primer día.',
    // Review of #20, round 1.
    'Los dos buscan lo mismo.',
    'Las dos necesitan tiempo.',
    'Cuando ambos ceden, todo fluye.',
    'Y ambos saben escuchar.',
    'Hoy, ambos saben lo que quieren.',
    'Lo construyen entre ambos.',
    'Eres juguetón.',
    'Te pones mandón.',
    'Eres burlón.',
    'Son muy parecidos.',
    '¿Son distintos?',
    'Eres blando.',
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
    'Estás escuchando.',
    'Eres mejor de lo que crees.',
    'Todas las casas cuentan.',
    'El otro lado del espejo.',
    // Review of #20, round 1.
    'Ambas cosas son posibles.',
    'El otro día hablamos.',
    'Buscas el otro camino.',
    'Ambos Soles brillan.',
    'Tus emociones son profundas.',
  ])('lets "%s" through', (text) => {
    expect(spanishGenderHits(text)).toEqual([]);
  });
});
