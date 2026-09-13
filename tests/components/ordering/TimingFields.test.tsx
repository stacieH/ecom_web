import { fireEvent, render, screen } from '@testing-library/react';
import TimingFields, { TimingFieldsProps } from '@/components/ordering/TimingFields';
import type { SlotList } from '@/lib/ordering/types';

const days: SlotList[] = [
  {
    date: '2026-10-02',
    fulfilment: 'PICKUP',
    asapStartsAt: '2026-10-02T11:15:00Z',
    slots: [
      { startsAt: '2026-10-02T11:00:00Z', available: false },
      { startsAt: '2026-10-02T11:15:00Z', available: true },
    ],
  },
  {
    date: '2026-10-03',
    fulfilment: 'PICKUP',
    asapStartsAt: null,
    slots: [{ startsAt: '2026-10-03T09:30:00Z', available: true }],
  },
];

function renderTiming(props: Partial<TimingFieldsProps> = {}) {
  const handlers = { onTimeModeChange: jest.fn(), onStartsAtChange: jest.fn(), onBlur: jest.fn() };
  render(
    <TimingFields
      fulfilment="PICKUP"
      needsArea={false}
      days={days}
      timeMode=""
      startsAt=""
      errors={{}}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe('TimingFields', () => {
  it('offers as soon as possible with the estimate for pickup or delivery', () => {
    const { onTimeModeChange } = renderTiming();

    expect(screen.getByText('Ready around 7:15 PM')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /^As soon as possible/ }));
    expect(onTimeModeChange).toHaveBeenCalledWith('ASAP');
  });

  it('shows the delivery estimate, and disables as soon as possible when today is over', () => {
    const { unmount } = render(
      <TimingFields
        fulfilment="DELIVERY"
        needsArea={false}
        days={days}
        timeMode=""
        startsAt=""
        errors={{}}
        onTimeModeChange={jest.fn()}
        onStartsAtChange={jest.fn()}
        onBlur={jest.fn()}
      />,
    );
    expect(screen.getByText('Arriving around 7:30 PM')).toBeInTheDocument();
    unmount();

    renderTiming({ days: [{ ...days[0], asapStartsAt: null, slots: [] }, days[1]] });
    expect(screen.getByRole('radio', { name: /^As soon as possible/ })).toBeDisabled();
    expect(screen.getByText('Not available right now')).toBeInTheDocument();
  });

  it('lists today’s times with full ones disabled, and tomorrow’s on its tab', () => {
    const { onStartsAtChange } = renderTiming({ timeMode: 'SCHEDULED' });

    expect(screen.getByRole('radiogroup', { name: 'Pickup time' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^7:00 PM/ })).toBeDisabled();
    expect(screen.getByText('Full')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: '7:15 PM' }));
    expect(onStartsAtChange).toHaveBeenCalledWith('2026-10-02T11:15:00Z');

    fireEvent.click(screen.getByRole('button', { name: 'Tomorrow' }));
    expect(screen.getByRole('button', { name: 'Tomorrow' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('radio', { name: '5:30 PM' })).toBeInTheDocument();
  });

  it('asks for a delivery area before listing delivery times, and shows the time error', () => {
    renderTiming({
      fulfilment: 'DELIVERY',
      needsArea: true,
      timeMode: 'SCHEDULED',
      errors: { startsAt: 'Choose a delivery time' },
    });

    expect(screen.getByText('Choose a delivery area to see delivery times.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a delivery time');
  });
});
