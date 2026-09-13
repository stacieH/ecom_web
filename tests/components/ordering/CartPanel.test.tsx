import { act, fireEvent, screen } from '@testing-library/react';
import CartPanel from '@/components/ordering/CartPanel';
import { ApiError } from '@/lib/api/client';
import type { CartState } from '@/lib/ordering/cart/cartReducer';
import { buildMockMenu, MOCK_DELIVERY_AREAS } from '@/lib/ordering/mock/mockData';
import { cartLine, createGuestClient, renderGuest } from '../../helpers/renderGuest';

const menu = buildMockMenu();

function renderCart(cart: Partial<CartState>, client = createGuestClient(), cartMenu = menu) {
  const onEditLine = jest.fn();
  const view = renderGuest(<CartPanel menu={cartMenu} areas={MOCK_DELIVERY_AREAS} onEditLine={onEditLine} />, {
    client,
    cart,
  });
  return { ...view, onEditLine };
}

describe('CartPanel', () => {
  it('shows quoted lines, options, notes, and totals, and opens checkout', async () => {
    renderCart({
      lines: [
        cartLine('dish-ribeye', ['ribeye-doneness-medium-rare'], 1, 'Extra jus'),
        cartLine('dish-tiramisu', [], 2),
      ],
    });

    expect(await screen.findByRole('link', { name: 'Checkout' })).toHaveAttribute('href', '/order/checkout');
    expect(screen.getByText('Doneness: Medium rare')).toBeInTheDocument();
    expect(screen.getByText('Note: Extra jus')).toBeInTheDocument();
    expect(screen.getByText('₱720')).toBeInTheDocument();
    expect(screen.getByText('Subtotal').parentElement).toHaveTextContent('Subtotal₱2,700');
    expect(screen.getByText('Total').parentElement).toHaveTextContent('Total₱2,700');
    expect(screen.getByRole('button', { name: 'View order · 3 items · ₱2,700' })).toBeInTheDocument();
  });

  it('changes quantities and removes lines', async () => {
    const { cartStore } = renderCart({ lines: [cartLine('dish-tiramisu')] });

    fireEvent.click(await screen.findByRole('button', { name: 'Increase Classic Tiramisu quantity' }));
    expect(cartStore.getSnapshot().lines[0].quantity).toBe(2);
    expect(await screen.findByRole('button', { name: 'View order · 2 items · ₱720' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Classic Tiramisu' }));
    expect(screen.getByText('Your order is empty')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Checkout' })).toBeDisabled();
  });

  it('opens the dish dialog to edit a line that can still be ordered', async () => {
    const { onEditLine } = renderCart({ lines: [cartLine('dish-ribeye', ['ribeye-doneness-rare'])] });

    fireEvent.click(await screen.findByRole('button', { name: 'Edit Dry-Aged Ribeye' }));

    expect(onEditLine).toHaveBeenCalledWith(
      expect.objectContaining({ dishId: 'dish-ribeye', optionIds: ['ribeye-doneness-rare'] }),
      expect.objectContaining({ id: 'dish-ribeye' }),
    );
  });

  it('holds checkout until delivery has an area and meets its minimum', async () => {
    const { cartStore } = renderCart({ fulfilment: 'DELIVERY', lines: [cartLine('dish-tiramisu')] });

    expect((await screen.findByText('Delivery fee')).parentElement).toHaveTextContent('Delivery feeChoose an area');
    expect(screen.getByText('Choose a delivery area to continue')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Checkout' })).toBeDisabled();

    act(() => cartStore.dispatch({ type: 'SET_AREA', areaId: 'area-poblacion' }));

    expect(await screen.findByText('Add ₱440 more to reach Poblacion’s ₱800 minimum')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Checkout' })).toBeDisabled();
  });

  it('flags a line the latest quote refuses', async () => {
    const client = createGuestClient();
    await client.demo.setScenarios({ soldOutDishSlugs: ['ribeye'] });

    renderCart(
      { lines: [cartLine('dish-ribeye', ['ribeye-doneness-rare'])] },
      client,
      buildMockMenu({ soldOutDishSlugs: ['ribeye'] }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('This dish is no longer available');
    expect(screen.queryByRole('button', { name: 'Edit Dry-Aged Ribeye' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Checkout' })).toBeDisabled();
  });

  it('limits an order to 30 items', async () => {
    renderCart({ lines: [cartLine('dish-tiramisu', [], 20), cartLine('dish-cannoli', [], 20)] });

    expect(await screen.findByText('Orders are limited to 30 items')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Checkout' })).toBeDisabled();
  });

  it('offers a way to retry when the quote fails to load', async () => {
    const client = createGuestClient();
    jest.spyOn(client, 'quote').mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'Offline'));
    renderCart({ lines: [cartLine('dish-tiramisu')] }, client);

    expect(await screen.findByText('We couldn’t price your order. Please try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Checkout' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('link', { name: 'Checkout' })).toHaveAttribute('href', '/order/checkout');
  });
});
