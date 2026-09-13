import type { Fulfilment } from '../types';
import { LIMITS } from '../validation/rules';

export interface CartLine {
  /** Dish id, sorted option ids, and trimmed note: one line per configuration. */
  key: string;
  dishId: string;
  optionIds: string[];
  quantity: number;
  note: string;
}

export interface CartState {
  version: 1;
  fulfilment: Fulfilment;
  areaId: string | null;
  lines: CartLine[];
}

export interface LineChoice {
  dishId: string;
  optionIds: string[];
  quantity: number;
  note: string;
}

export type CartAction =
  | { type: 'ADD'; line: LineChoice }
  | { type: 'REPLACE'; key: string; line: LineChoice }
  | { type: 'SET_QUANTITY'; key: string; quantity: number }
  | { type: 'REMOVE'; key: string }
  | { type: 'SET_FULFILMENT'; fulfilment: Fulfilment }
  | { type: 'SET_AREA'; areaId: string | null }
  | { type: 'CLEAR' };

export const EMPTY_CART: CartState = { version: 1, fulfilment: 'PICKUP', areaId: null, lines: [] };

export function lineKey({ dishId, optionIds, note }: Omit<LineChoice, 'quantity'>): string {
  return [dishId, [...optionIds].sort().join(','), note.trim()].join('|');
}

const clampQuantity = (quantity: number) =>
  Math.min(LIMITS.maxQuantity, Math.max(1, Math.floor(quantity)));

function toLine(choice: LineChoice): CartLine {
  const optionIds = [...choice.optionIds].sort();
  const note = choice.note.trim();

  return {
    key: lineKey({ dishId: choice.dishId, optionIds, note }),
    dishId: choice.dishId,
    optionIds,
    quantity: clampQuantity(choice.quantity),
    note,
  };
}

function merge(lines: CartLine[], line: CartLine): CartLine[] {
  if (!lines.some((candidate) => candidate.key === line.key)) return [...lines, line];

  return lines.map((candidate) =>
    candidate.key === line.key
      ? { ...candidate, quantity: clampQuantity(candidate.quantity + line.quantity) }
      : candidate,
  );
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD':
      return { ...state, lines: merge(state.lines, toLine(action.line)) };

    case 'REPLACE': {
      const index = state.lines.findIndex((line) => line.key === action.key);
      if (index === -1) return state;

      const replacement = toLine(action.line);
      const others = state.lines.filter((line) => line.key !== action.key);
      if (others.some((line) => line.key === replacement.key)) {
        return { ...state, lines: merge(others, replacement) };
      }

      const lines = [...others];
      lines.splice(index, 0, replacement);
      return { ...state, lines };
    }

    case 'SET_QUANTITY':
      return {
        ...state,
        lines: state.lines.map((line) =>
          line.key === action.key ? { ...line, quantity: clampQuantity(action.quantity) } : line,
        ),
      };

    case 'REMOVE':
      return { ...state, lines: state.lines.filter((line) => line.key !== action.key) };

    case 'SET_FULFILMENT':
      return state.fulfilment === action.fulfilment ? state : { ...state, fulfilment: action.fulfilment };

    case 'SET_AREA':
      return state.areaId === action.areaId ? state : { ...state, areaId: action.areaId };

    case 'CLEAR':
      return { ...EMPTY_CART, fulfilment: state.fulfilment, areaId: state.areaId };

    default:
      return state;
  }
}

export function cartItemCount(state: CartState): number {
  return state.lines.reduce((total, line) => total + line.quantity, 0);
}

function isStoredLine(value: unknown): value is LineChoice {
  const line = value as Partial<LineChoice> | null;
  return (
    typeof line === 'object' &&
    line !== null &&
    typeof line.dishId === 'string' &&
    Array.isArray(line.optionIds) &&
    line.optionIds.every((id) => typeof id === 'string') &&
    typeof line.quantity === 'number' &&
    Number.isFinite(line.quantity) &&
    typeof line.note === 'string'
  );
}

/**
 * Reads a stored cart. Lines are kept even when a dish has since changed: the
 * next quote re-checks them and flags anything no longer available.
 */
export function parseStoredCart(raw: string | null): CartState {
  if (!raw) return EMPTY_CART;

  try {
    const parsed = JSON.parse(raw) as Partial<CartState>;
    if (parsed.version !== 1 || !Array.isArray(parsed.lines)) return EMPTY_CART;

    return {
      version: 1,
      fulfilment: parsed.fulfilment === 'DELIVERY' ? 'DELIVERY' : 'PICKUP',
      areaId: typeof parsed.areaId === 'string' ? parsed.areaId : null,
      lines: (parsed.lines as unknown[]).filter(isStoredLine).map(toLine).reduce<CartLine[]>(merge, []),
    };
  } catch {
    return EMPTY_CART;
  }
}
