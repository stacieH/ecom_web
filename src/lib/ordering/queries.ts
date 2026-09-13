import { useQuery } from '@tanstack/react-query';
import { addDays, venueDateOf } from '@/lib/booking/time';
import { useOrderingClient } from './clientContext';
import { orderingKeys } from './queryKeys';
import type { SlotList, Fulfilment } from './types';

export function useMenu() {
  const client = useOrderingClient();
  return useQuery({ queryKey: orderingKeys.menu, queryFn: () => client.getMenu() });
}

export function useOrderingStatus() {
  const client = useOrderingClient();
  return useQuery({ queryKey: orderingKeys.status, queryFn: () => client.getOrderingStatus() });
}

export function useDeliveryAreas() {
  const client = useOrderingClient();
  return useQuery({ queryKey: orderingKeys.areas, queryFn: () => client.getDeliveryAreas() });
}

/**
 * Today's and tomorrow's slots. "Today" is read when the query runs, never
 * during render. Delivery slots need an area; until one is chosen this asks for
 * pickup slots, which still show whether the kitchen is open.
 */
export function useSlotDays(fulfilment: Fulfilment, areaId: string | null) {
  const client = useOrderingClient();
  const delivery = fulfilment === 'DELIVERY' && areaId !== null;

  return useQuery({
    queryKey: [...orderingKeys.slotsRoot, 'days', delivery ? 'DELIVERY' : 'PICKUP', delivery ? areaId : null],
    queryFn: (): Promise<SlotList[]> => {
      const today = venueDateOf(new Date());
      return Promise.all(
        [today, addDays(today, 1)].map((date) =>
          client.getSlots(
            delivery
              ? { fulfilment: 'DELIVERY', date, areaId: areaId as string }
              : { fulfilment: 'PICKUP', date },
          ),
        ),
      );
    },
  });
}
