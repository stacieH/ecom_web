import { fireEvent, screen, within } from '@testing-library/react';
import OrderMenu from '@/components/ordering/OrderMenu';
import { fakeDateAt } from '../../helpers/fakeDate';
import { createGuestClient, renderGuest } from '../../helpers/renderGuest';

// 5:00 PM on Friday 2 October 2026 in Manila.
const FRIDAY_5PM = '2026-10-02T09:00:00Z';

describe('OrderMenu', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('lists every course and dish with peso prices, badges, and course links', async () => {
    fakeDateAt(FRIDAY_5PM);
    renderGuest(<OrderMenu />);

    expect(await screen.findByRole('heading', { level: 2, name: 'Starters' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Order online' })).toBeInTheDocument();
    ['Starters', 'Mains', 'Sides', 'Desserts', 'Drinks'].forEach((course) => {
      expect(screen.getByRole('heading', { level: 2, name: course })).toBeInTheDocument();
    });
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(19);
    expect(screen.getByRole('link', { name: 'Mains' })).toHaveAttribute('href', '#order-mains');

    const ribeye = screen.getByRole('article', { name: 'Dry-Aged Ribeye' });
    expect(within(ribeye).getByText('₱1,980')).toBeInTheDocument();

    const oldFashioned = screen.getByRole('article', { name: 'Barrel-Aged Old Fashioned' });
    expect(within(oldFashioned).getByText('Order in person')).toBeInTheDocument();
    expect(within(oldFashioned).getByRole('button', { name: 'Add Barrel-Aged Old Fashioned' })).toBeDisabled();
  });

  it('marks a dish sold out by the demo scenario', async () => {
    fakeDateAt(FRIDAY_5PM);
    const client = createGuestClient();
    await client.demo.setScenarios({ soldOutDishSlugs: ['lobster'] });

    renderGuest(<OrderMenu />, { client });

    const lobster = await screen.findByRole('article', { name: 'Wood-Fired Lobster Tail' });
    expect(within(lobster).getByText('Sold out')).toBeInTheDocument();
    expect(within(lobster).getByRole('button', { name: 'Add Wood-Fired Lobster Tail' })).toBeDisabled();
  });

  it('adds a configured dish to the cart through the dish dialog', async () => {
    fakeDateAt(FRIDAY_5PM);
    const { cartStore } = renderGuest(<OrderMenu />);

    fireEvent.click(await screen.findByRole('button', { name: 'Add Dry-Aged Ribeye' }));
    const dialog = screen.getByRole('dialog', { name: 'Dry-Aged Ribeye' });
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Medium rare' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add to order ₱1,980' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(cartStore.getSnapshot().lines).toEqual([
      expect.objectContaining({ dishId: 'dish-ribeye', optionIds: ['ribeye-doneness-medium-rare'], quantity: 1 }),
    ]);
  });

  it('asks for a delivery area once delivery is chosen', async () => {
    fakeDateAt(FRIDAY_5PM);
    const { cartStore } = renderGuest(<OrderMenu />);

    fireEvent.click(await screen.findByRole('radio', { name: /^Delivery/ }));
    await screen.findByRole('option', { name: 'Poblacion · ₱60 delivery · ₱800 minimum' });
    fireEvent.change(screen.getByLabelText('Delivery area'), { target: { value: 'area-poblacion' } });

    expect(cartStore.getSnapshot()).toMatchObject({ fulfilment: 'DELIVERY', areaId: 'area-poblacion' });
  });

  it('names the next opening on a closed evening and still lets guests order ahead', async () => {
    fakeDateAt('2026-10-05T09:00:00Z'); // Monday, when the venue is closed

    renderGuest(<OrderMenu />);

    expect(
      await screen.findByText('Online ordering is closed right now. Next orders from Tuesday 6:00 PM'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Classic Tiramisu' })).toBeEnabled();
  });

  it('disables every Add button when neither today nor tomorrow has a slot', async () => {
    fakeDateAt('2026-10-04T13:45:00Z'); // Sunday 9:45 PM, and Monday is closed

    renderGuest(<OrderMenu />);

    expect(await screen.findByText('Online ordering is closed right now.')).toBeInTheDocument();
    screen.getAllByRole('button', { name: /^Add / }).forEach((button) => {
      expect(button).toBeDisabled();
    });
  });
});
