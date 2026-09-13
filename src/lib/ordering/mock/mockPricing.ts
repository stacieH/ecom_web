// Mirrors the QuotePricer rules in the 3A spec, "Pricing (QuotePricer)".
import { ApiError } from '@/lib/api/client';
import type {
  DeliveryArea,
  Fulfilment,
  Menu,
  MenuDish,
  OrderDraft,
  PaymentMethod,
  PricedLine,
  Quote,
} from '../types';
import { cartItemsRule, lineNoteRule, optionGroupRule, quantityRule } from '../validation/rules';
import type { MockSettings } from './mockData';

export function findDish(menu: Menu, dishId: string): MenuDish | undefined {
  for (const category of menu.categories) {
    const dish = category.dishes.find((candidate) => candidate.id === dishId);
    if (dish) return dish;
  }
  return undefined;
}

export function allowedPaymentMethods(
  fulfilment: Fulfilment,
  totalCentavos: number,
  settings: MockSettings,
): PaymentMethod[] {
  const methods: PaymentMethod[] = [];

  if (settings.onlinePaymentMethods.length > 0) methods.push('ONLINE');
  if (fulfilment === 'PICKUP' && settings.payAtPickupEnabled) methods.push('PAY_AT_PICKUP');
  if (
    fulfilment === 'DELIVERY' &&
    settings.cashOnDeliveryEnabled &&
    totalCentavos <= settings.cashOnDeliveryMaxCentavos
  ) {
    methods.push('CASH_ON_DELIVERY');
  }

  return methods;
}

export interface PricingInput {
  draft: OrderDraft;
  menu: Menu;
  areas: DeliveryArea[];
  settings: MockSettings;
}

export function priceDraft({ draft, menu, areas, settings }: PricingInput): Quote {
  if (draft.fulfilment === 'PICKUP' && !settings.pickupEnabled) {
    throw new ApiError(409, 'ORDERING_PAUSED', 'Pickup is not available right now.');
  }
  if (draft.fulfilment === 'DELIVERY' && !settings.deliveryEnabled) {
    throw new ApiError(409, 'ORDERING_PAUSED', 'Delivery is not available right now.');
  }

  const unavailable: Record<string, string[]> = {};
  const invalid: Record<string, string[]> = {};
  const lines: PricedLine[] = [];

  draft.lines.forEach((line, index) => {
    const dish = findDish(menu, line.dishId);
    if (!dish || !dish.orderable || dish.soldOut) {
      unavailable[`lines.${index}.dishId`] = ['This dish is no longer available'];
      return;
    }

    const quantityError = quantityRule(line.quantity);
    if (quantityError) invalid[`lines.${index}.quantity`] = [quantityError];

    const knownOptionIds = dish.optionGroups.flatMap((optionGroup) =>
      optionGroup.options.map((option) => option.id),
    );
    if (line.optionIds.some((id) => !knownOptionIds.includes(id))) {
      invalid[`lines.${index}.optionIds`] = ['Choose from the listed options'];
    } else {
      const soldOutChosen = dish.optionGroups.some((optionGroup) =>
        optionGroup.options.some((option) => option.soldOut && line.optionIds.includes(option.id)),
      );
      if (soldOutChosen) {
        unavailable[`lines.${index}.optionIds`] = ['This option is sold out'];
      } else {
        const groupError = dish.optionGroups
          .map((optionGroup) => optionGroupRule(optionGroup, line.optionIds))
          .find(Boolean);
        if (groupError) invalid[`lines.${index}.optionIds`] = [groupError];
      }
    }

    const noteError = lineNoteRule(line.note);
    if (noteError) invalid[`lines.${index}.note`] = [noteError];

    const options = dish.optionGroups.flatMap((optionGroup) =>
      optionGroup.options
        .filter((option) => line.optionIds.includes(option.id))
        .map((option) => ({
          groupName: optionGroup.name,
          optionName: option.name,
          priceDeltaCentavos: option.priceDeltaCentavos,
        })),
    );
    const unitPriceCentavos =
      dish.priceCentavos + options.reduce((total, option) => total + option.priceDeltaCentavos, 0);

    lines.push({
      dishId: dish.id,
      name: dish.name,
      quantity: line.quantity,
      unitPriceCentavos,
      options,
      note: line.note.trim(),
      lineTotalCentavos: unitPriceCentavos * line.quantity,
    });
  });

  if (Object.keys(unavailable).length > 0) {
    throw new ApiError(409, 'ITEM_UNAVAILABLE', 'Some items are no longer available.', unavailable);
  }

  const itemsError = cartItemsRule(draft.lines.reduce((total, line) => total + line.quantity, 0));
  if (itemsError) invalid.lines = [itemsError];

  let deliveryFeeCentavos = 0;
  let minimumOrderCentavos: number | null = null;

  if (draft.fulfilment === 'DELIVERY') {
    const area = areas.find((candidate) => candidate.id === draft.delivery?.areaId);
    if (!area) {
      throw new ApiError(422, 'DELIVERY_AREA_UNAVAILABLE', 'We don’t deliver to that area.', {
        'delivery.areaId': ['Choose a delivery area'],
      });
    }
    deliveryFeeCentavos = area.feeCentavos;
    minimumOrderCentavos = area.minOrderCentavos;
  }

  if (Object.keys(invalid).length > 0) {
    throw new ApiError(422, 'VALIDATION_FAILED', 'Please check your order.', invalid);
  }

  const subtotalCentavos = lines.reduce((total, line) => total + line.lineTotalCentavos, 0);
  const totalCentavos = subtotalCentavos + deliveryFeeCentavos;

  return {
    lines,
    subtotalCentavos,
    deliveryFeeCentavos,
    totalCentavos,
    minimumOrderCentavos,
    paymentMethods: allowedPaymentMethods(draft.fulfilment, totalCentavos, settings),
  };
}
