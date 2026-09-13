import { fireEvent, render, screen } from '@testing-library/react';
import PaymentFields from '@/components/ordering/PaymentFields';
import type { OrderingStatus, PaymentMethod, Quote } from '@/lib/ordering/types';

const status: OrderingStatus = {
  acceptingOrders: true,
  message: null,
  pickupEnabled: true,
  deliveryEnabled: true,
  payAtPickup: true,
  cashOnDelivery: true,
  cashOnDeliveryMaxCentavos: 300000,
  onlinePaymentMethods: ['gcash', 'paymaya', 'card', 'qrph'],
};

function quote(totalCentavos: number, paymentMethods: PaymentMethod[]): Quote {
  return {
    lines: [],
    subtotalCentavos: totalCentavos,
    deliveryFeeCentavos: 0,
    totalCentavos,
    minimumOrderCentavos: null,
    paymentMethods,
  };
}

describe('PaymentFields', () => {
  it('offers online payment and pay at pickup for a pickup order', () => {
    render(
      <PaymentFields
        fulfilment="PICKUP"
        quote={quote(36000, ['ONLINE', 'PAY_AT_PICKUP'])}
        status={status}
        value=""
        onChange={jest.fn()}
        onBlur={jest.fn()}
      />,
    );

    expect(screen.getByRole('radio', { name: 'Pay online (GCash, Maya, card, QR Ph)' })).toBeEnabled();
    expect(screen.getByRole('radio', { name: /^Pay at pickup/ })).toBeEnabled();
    expect(screen.queryByRole('radio', { name: /^Cash on delivery/ })).not.toBeInTheDocument();
  });

  it('shows cash on delivery disabled with its reason over the cap', () => {
    const onChange = jest.fn();
    render(
      <PaymentFields
        fulfilment="DELIVERY"
        quote={quote(402000, ['ONLINE'])}
        status={status}
        value=""
        error="Choose how you’ll pay"
        onChange={onChange}
        onBlur={jest.fn()}
      />,
    );

    expect(screen.getByRole('radio', { name: /^Cash on delivery/ })).toBeDisabled();
    expect(screen.getByText('Available for orders up to ₱3,000')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Choose how you’ll pay');

    fireEvent.click(screen.getByRole('radio', { name: 'Pay online (GCash, Maya, card, QR Ph)' }));
    expect(onChange).toHaveBeenCalledWith('ONLINE');
  });
});
