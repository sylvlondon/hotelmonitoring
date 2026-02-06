import { describe, expect, it } from 'vitest';
import { parseSecureDirectNumberedTitles } from '../src/parsers/secureDirectNumbered.js';
import { parseThaisRoomTitles } from '../src/parsers/thaisCalendar.js';
import { parseSecureDirectStockCounter } from '../src/parsers/secureDirectStockCounter.js';

describe('parseSecureDirectNumberedTitles', () => {
  it('extracts unique room ids from numbered titles including "ou"', () => {
    const titles = [
      'Chambre 7 ou 8',
      'Chambre 3',
      'Chambre 7',
      'Suite non numérotée',
    ];

    const parsed = parseSecureDirectNumberedTitles(titles);
    expect(parsed.ids).toEqual(['3', '7', '8']);
    expect(parsed.count).toBe(3);
  });
});

describe('parseThaisRoomTitles', () => {
  it('extracts ids from titles with "<num> - ..." format', () => {
    const titles = ['1 - Double', '2 - Suite', '5 - Terrasse', 'Nope'];
    const parsed = parseThaisRoomTitles(titles);
    expect(parsed.ids).toEqual(['1', '2', '5']);
    expect(parsed.count).toBe(3);
  });
});

describe('parseSecureDirectStockCounter', () => {
  it('keeps max counter per category and applies cap at total rooms', () => {
    const parsed = parseSecureDirectStockCounter(
      [
        {
          category: 'Classique',
          text: 'Voir tous les tarifs Plus que 1 disponible(s) Plus que 2 disponible(s)',
        },
        {
          category: 'Appartement',
          text: 'Plus que 4 disponible(s)',
        },
        {
          category: 'Deluxe',
          text: 'Plus que 9 disponible(s)',
        },
      ],
      8,
    );

    expect(parsed.categoryStock).toEqual({
      Classique: 2,
      Appartement: 4,
      Deluxe: 9,
    });
    expect(parsed.sumBeforeCap).toBe(15);
    expect(parsed.availableCount).toBe(8);
    expect(parsed.csv).toBe('Classique:2,Appartement:4,Deluxe:9');
  });

  it('returns zero for category without visible counters', () => {
    const parsed = parseSecureDirectStockCounter(
      [{ category: 'Classique', text: 'Aucun stock visible' }],
      8,
    );
    expect(parsed.availableCount).toBe(0);
    expect(parsed.categoryStock.Classique).toBe(0);
  });
});
