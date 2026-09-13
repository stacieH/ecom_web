// Dummy ordering data for the portal until the ordering API exists. The dishes
// come from the site's own menu content so the two never disagree.
import { dishes as siteDishes } from '@/content/dishes';
import { COURSE_LABELS, COURSE_ORDER } from '@/lib/menu';
import type { DeliveryArea, Menu, MenuOptionGroup } from '../types';

export interface MockSettings {
  acceptingOrders: boolean;
  pauseMessage: string | null;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  prepMinutes: number;
  pickupSlotCap: number;
  deliverySlotCap: number;
  daysAhead: 0 | 1;
  lastOrderMinutesBeforeClose: number;
  payAtPickupEnabled: boolean;
  cashOnDeliveryEnabled: boolean;
  cashOnDeliveryMaxCentavos: number;
  onlinePaymentMethods: string[];
  maxQuantityPerLine: number;
  maxItemsPerOrder: number;
  paymentHoldMinutes: number;
}

export const MOCK_SETTINGS: MockSettings = {
  acceptingOrders: true,
  pauseMessage: null,
  pickupEnabled: true,
  deliveryEnabled: true,
  prepMinutes: 25,
  pickupSlotCap: 6,
  deliverySlotCap: 4,
  daysAhead: 1,
  lastOrderMinutesBeforeClose: 30,
  payAtPickupEnabled: true,
  cashOnDeliveryEnabled: true,
  cashOnDeliveryMaxCentavos: 300000,
  onlinePaymentMethods: ['gcash', 'paymaya', 'card', 'qrph'],
  maxQuantityPerLine: 20,
  maxItemsPerOrder: 30,
  paymentHoldMinutes: 15,
};

export interface ServiceDayRule {
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  opensAt: string | null;
  closesAt: string | null;
}

// Matches the hours published in src/content/venue.ts.
export const MOCK_SERVICE_DAYS: ServiceDayRule[] = [
  { weekday: 1, opensAt: null, closesAt: null },
  { weekday: 2, opensAt: '18:00', closesAt: '23:00' },
  { weekday: 3, opensAt: '18:00', closesAt: '23:00' },
  { weekday: 4, opensAt: '18:00', closesAt: '23:00' },
  { weekday: 5, opensAt: '17:30', closesAt: '00:30' },
  { weekday: 6, opensAt: '17:30', closesAt: '00:30' },
  { weekday: 7, opensAt: '17:30', closesAt: '22:00' },
];

export const MOCK_DELIVERY_AREAS: DeliveryArea[] = [
  { id: 'area-poblacion', name: 'Poblacion', feeCentavos: 6000, minOrderCentavos: 80000, extraMinutes: 10 },
  { id: 'area-bel-air', name: 'Bel-Air', feeCentavos: 8000, minOrderCentavos: 100000, extraMinutes: 15 },
  { id: 'area-san-antonio', name: 'San Antonio', feeCentavos: 10000, minOrderCentavos: 120000, extraMinutes: 20 },
  { id: 'area-rockwell', name: 'Rockwell', feeCentavos: 12000, minOrderCentavos: 150000, extraMinutes: 25 },
];

const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-');

function group(
  id: string,
  name: string,
  minSelect: number,
  maxSelect: number,
  options: [string, number][],
): MenuOptionGroup {
  return {
    id,
    name,
    minSelect,
    maxSelect,
    options: options.map(([optionName, priceDeltaCentavos]) => ({
      id: `${id}-${slugify(optionName)}`,
      name: optionName,
      priceDeltaCentavos,
      soldOut: false,
    })),
  };
}

const doneness = (dishSlug: string) =>
  group(`${dishSlug}-doneness`, 'Doneness', 1, 1, [
    ['Rare', 0],
    ['Medium rare', 0],
    ['Medium', 0],
    ['Medium well', 0],
    ['Well done', 0],
  ]);

const OPTION_GROUPS: Record<string, MenuOptionGroup[]> = {
  ribeye: [doneness('ribeye')],
  filet: [doneness('filet')],
  lobster: [group('lobster-extras', 'Extras', 0, 1, [['Extra garlic-herb butter', 8000]])],
  sourdough: [group('sourdough-extras', 'Extras', 0, 1, [['Extra whipped butter', 6000]])],
  'pork-ribs': [
    group('pork-ribs-glaze', 'Glaze', 1, 1, [
      ['Classic smoky', 0],
      ['Spicy calamansi', 0],
    ]),
  ],
  'vanilla-latte': [
    group('vanilla-latte-milk', 'Milk', 1, 1, [
      ['Whole milk', 0],
      ['Oat milk', 4000],
    ]),
  ],
};

const NOT_ORDERABLE = new Set(['old-fashioned']);

// Demo price rises round to the nearest ₱10, like a printed menu would.
function raise(centavos: number, percent: number): number {
  if (percent === 0) return centavos;
  return Math.round((centavos * (100 + percent)) / 100 / 1000) * 1000;
}

export function buildMockMenu({
  soldOutDishSlugs = [],
  priceIncreasePercent = 0,
}: { soldOutDishSlugs?: string[]; priceIncreasePercent?: number } = {}): Menu {
  return {
    version: `demo-${priceIncreasePercent}-${[...soldOutDishSlugs].sort().join(',')}`,
    categories: COURSE_ORDER.map((course) => ({
      slug: course,
      name: COURSE_LABELS[course],
      dishes: siteDishes
        .filter((dish) => dish.course === course)
        .map((dish) => ({
          id: `dish-${dish.id}`,
          slug: dish.id,
          name: dish.name,
          description: dish.description,
          priceCentavos: raise(dish.price * 100, priceIncreasePercent),
          imageUrl: dish.image,
          signature: dish.signature,
          orderable: !NOT_ORDERABLE.has(dish.id),
          soldOut: soldOutDishSlugs.includes(dish.id),
          optionGroups: OPTION_GROUPS[dish.id] ?? [],
        })),
    })),
  };
}
