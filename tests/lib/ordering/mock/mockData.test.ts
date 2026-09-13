import {
  buildMockMenu,
  MOCK_DELIVERY_AREAS,
  MOCK_SERVICE_DAYS,
  MOCK_SETTINGS,
} from '@/lib/ordering/mock/mockData';

describe('mock data', () => {
  it('builds the 19 site dishes in the five courses, priced in centavos', () => {
    const menu = buildMockMenu();

    expect(menu.categories.map((category) => [category.slug, category.name])).toEqual([
      ['starters', 'Starters'],
      ['mains', 'Mains'],
      ['sides', 'Sides'],
      ['desserts', 'Desserts'],
      ['drinks', 'Drinks'],
    ]);
    const dishes = menu.categories.flatMap((category) => category.dishes);
    expect(dishes).toHaveLength(19);
    expect(dishes.find((dish) => dish.slug === 'ribeye')).toMatchObject({
      id: 'dish-ribeye',
      name: 'Dry-Aged Ribeye',
      priceCentavos: 198000,
      orderable: true,
      soldOut: false,
    });
  });

  it('adds the option groups from the spec', () => {
    const dishes = buildMockMenu().categories.flatMap((category) => category.dishes);
    const bySlug = (slug: string) => dishes.find((dish) => dish.slug === slug);

    expect(bySlug('ribeye')?.optionGroups).toEqual([
      {
        id: 'ribeye-doneness',
        name: 'Doneness',
        minSelect: 1,
        maxSelect: 1,
        options: ['Rare', 'Medium rare', 'Medium', 'Medium well', 'Well done'].map((name) => ({
          id: `ribeye-doneness-${name.toLowerCase().replace(/ /g, '-')}`,
          name,
          priceDeltaCentavos: 0,
          soldOut: false,
        })),
      },
    ]);
    expect(bySlug('lobster')?.optionGroups[0].options[0]).toMatchObject({
      name: 'Extra garlic-herb butter',
      priceDeltaCentavos: 8000,
    });
    expect(bySlug('vanilla-latte')?.optionGroups[0]).toMatchObject({ name: 'Milk', minSelect: 1 });
    expect(bySlug('old-fashioned')?.orderable).toBe(false);
  });

  it('applies demo scenarios and changes the menu version', () => {
    const plain = buildMockMenu();
    const changed = buildMockMenu({ soldOutDishSlugs: ['ribeye'], priceIncreasePercent: 10 });
    const ribeye = changed.categories
      .flatMap((category) => category.dishes)
      .find((dish) => dish.slug === 'ribeye');

    expect(ribeye).toMatchObject({ soldOut: true, priceCentavos: 218000 });
    expect(changed.version).not.toBe(plain.version);
  });

  it('matches the published venue hours and the spec settings', () => {
    expect(MOCK_SERVICE_DAYS).toEqual([
      { weekday: 1, opensAt: null, closesAt: null },
      { weekday: 2, opensAt: '18:00', closesAt: '23:00' },
      { weekday: 3, opensAt: '18:00', closesAt: '23:00' },
      { weekday: 4, opensAt: '18:00', closesAt: '23:00' },
      { weekday: 5, opensAt: '17:30', closesAt: '00:30' },
      { weekday: 6, opensAt: '17:30', closesAt: '00:30' },
      { weekday: 7, opensAt: '17:30', closesAt: '22:00' },
    ]);
    expect(MOCK_DELIVERY_AREAS.map((area) => [area.name, area.feeCentavos, area.minOrderCentavos])).toEqual([
      ['Poblacion', 6000, 80000],
      ['Bel-Air', 8000, 100000],
      ['San Antonio', 10000, 120000],
      ['Rockwell', 12000, 150000],
    ]);
    expect(MOCK_SETTINGS).toMatchObject({
      prepMinutes: 25,
      pickupSlotCap: 6,
      deliverySlotCap: 4,
      daysAhead: 1,
      cashOnDeliveryMaxCentavos: 300000,
      paymentHoldMinutes: 15,
    });
  });
});
