import { render, screen, within } from '@testing-library/react';
import OrderDetails from '@/components/ordering/OrderDetails';
import { orderSummary } from '../../helpers/orderSummary';

describe('OrderDetails', () => {
  it('shows the reference, status, progress, promised time, items, and payment', () => {
    render(<OrderDetails order={orderSummary()} />);

    expect(screen.getByRole('heading', { level: 2, name: 'O-7K2M9Q' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Preparing');

    const steps = within(screen.getByRole('list', { name: 'Order progress' })).getAllByRole('listitem');
    expect(steps.map((step) => step.textContent)).toEqual([
      'Order received',
      'Preparing',
      'Ready for pickup',
      'Picked up',
    ]);
    expect(steps[1]).toHaveAttribute('aria-current', 'step');

    expect(screen.getByText('Ready around').nextSibling).toHaveTextContent('Friday 2 October 2026 · 5:30 PM');
    expect(screen.getByText('1 × Dry-Aged Ribeye')).toBeInTheDocument();
    expect(screen.getByText('Doneness: Medium rare')).toBeInTheDocument();
    expect(screen.getByText('Payment').nextSibling).toHaveTextContent('Pay at pickup · Not paid yet');
  });

  it('shows the address and a call link for the rider while out for delivery', () => {
    render(
      <OrderDetails
        order={orderSummary({
          fulfilment: 'DELIVERY',
          status: 'OUT_FOR_DELIVERY',
          promisedAt: '2026-10-02T10:00:00Z',
          deliveryFeeCentavos: 6000,
          totalCentavos: 204000,
          payment: { method: 'CASH_ON_DELIVERY', status: 'UNPAID' },
          delivery: {
            areaName: 'Poblacion',
            street: '12 Jupiter Street',
            building: 'Unit 3B',
            landmark: 'Beside the bakery',
            instructions: null,
            riderName: 'Nico',
            riderPhone: '+63 917 555 0100',
          },
        })}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('On the way');
    expect(screen.getByText('Arriving around').nextSibling).toHaveTextContent('6:00 PM');
    expect(screen.getByText('Deliver to').nextSibling).toHaveTextContent('12 Jupiter Street, Unit 3B, Poblacion');
    expect(screen.getByRole('link', { name: '+63 917 555 0100' })).toHaveAttribute('href', 'tel:+639175550100');
  });
});
