import { fireEvent, render, screen } from '@testing-library/react';
import DishDialog from '@/components/ordering/DishDialog';
import { buildMockMenu } from '@/lib/ordering/mock/mockData';
import type { MenuDish } from '@/lib/ordering/types';

const dishes = buildMockMenu().categories.flatMap((category) => category.dishes);
const ribeye = dishes.find((dish) => dish.slug === 'ribeye') as MenuDish;
const lobster = dishes.find((dish) => dish.slug === 'lobster') as MenuDish;

// A made-up dish whose extras allow two choices, to exercise the maximum.
const platter: MenuDish = {
  ...lobster,
  id: 'dish-test-platter',
  name: 'Test Platter',
  optionGroups: [
    {
      id: 'platter-extras',
      name: 'Extras',
      minSelect: 0,
      maxSelect: 2,
      options: [
        { id: 'platter-extras-a', name: 'Garlic butter', priceDeltaCentavos: 8000, soldOut: false },
        { id: 'platter-extras-b', name: 'Chimichurri', priceDeltaCentavos: 5000, soldOut: false },
        { id: 'platter-extras-c', name: 'Truffle salt', priceDeltaCentavos: 12000, soldOut: false },
      ],
    },
  ],
};

describe('DishDialog', () => {
  it('requires a choice in a required group, then adds the line', () => {
    const onSubmit = jest.fn();
    render(<DishDialog dish={ribeye} onSubmit={onSubmit} onClose={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add to order ₱1,980' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Choose a doneness');
    expect(screen.getByRole('radio', { name: 'Rare' })).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('radio', { name: 'Medium' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add to order ₱1,980' }));
    expect(onSubmit).toHaveBeenCalledWith({
      dishId: 'dish-ribeye',
      optionIds: ['ribeye-doneness-medium'],
      quantity: 1,
      note: '',
    });
  });

  it('limits a multi-choice group and prices the extras into the running total', () => {
    const onSubmit = jest.fn();
    render(<DishDialog dish={platter} onSubmit={onSubmit} onClose={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Add to order ₱1,650' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /Garlic butter/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Chimichurri/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Truffle salt/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Add to order ₱1,900' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Choose up to 2 extras');
    expect(screen.getByRole('group', { name: /^Extras/ })).toHaveAttribute('aria-invalid', 'true');

    fireEvent.click(screen.getByRole('checkbox', { name: /Truffle salt/ }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add to order ₱1,780' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ optionIds: ['platter-extras-a', 'platter-extras-b'] }),
    );
  });

  it('multiplies by the quantity and checks a typed quantity', () => {
    render(<DishDialog dish={ribeye} onSubmit={jest.fn()} onClose={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Increase quantity' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase quantity' }));
    expect(screen.getByRole('button', { name: 'Add to order ₱5,940' })).toBeInTheDocument();

    const quantity = screen.getByLabelText('Quantity');
    fireEvent.change(quantity, { target: { value: '25' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.blur(quantity);
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a quantity from 1 to 20');
    expect(screen.getByRole('button', { name: 'Add to order ₱1,980' })).toBeInTheDocument();

    fireEvent.change(quantity, { target: { value: '2' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add to order ₱3,960' })).toBeInTheDocument();
  });

  it('shows sold-out options as unavailable', () => {
    const soldOutRare: MenuDish = {
      ...ribeye,
      optionGroups: ribeye.optionGroups.map((group) => ({
        ...group,
        options: group.options.map((option) => ({ ...option, soldOut: option.name === 'Rare' })),
      })),
    };
    render(<DishDialog dish={soldOutRare} onSubmit={jest.fn()} onClose={jest.fn()} />);

    // The name and description are adjacent inline spans, so match the start only.
    expect(screen.getByRole('radio', { name: /^Rare/ })).toBeDisabled();
    expect(screen.getByText('Sold out')).toBeInTheDocument();
  });

  it('checks the note length when the note loses focus', () => {
    render(<DishDialog dish={ribeye} onSubmit={jest.fn()} onClose={jest.fn()} />);

    const note = screen.getByLabelText('Note for the kitchen (optional)');
    fireEvent.change(note, { target: { value: 'x'.repeat(141) } });
    fireEvent.blur(note);

    expect(screen.getByRole('alert')).toHaveTextContent('Keep the note under 140 characters');
  });

  it('edits an existing line with its current choices', () => {
    render(
      <DishDialog
        dish={ribeye}
        mode="update"
        initial={{ optionIds: ['ribeye-doneness-well-done'], quantity: 2, note: 'Extra jus' }}
        onSubmit={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByRole('radio', { name: 'Well done' })).toBeChecked();
    expect(screen.getByLabelText('Note for the kitchen (optional)')).toHaveValue('Extra jus');
    expect(screen.getByRole('button', { name: 'Update order ₱3,960' })).toBeInTheDocument();
  });

  it('moves focus in, locks page scroll, closes on Escape, and hands focus back', () => {
    const opener = document.createElement('button');
    opener.textContent = 'Add';
    document.body.appendChild(opener);
    opener.focus();
    const onClose = jest.fn();

    const { unmount } = render(<DishDialog dish={ribeye} onSubmit={jest.fn()} onClose={onClose} />);

    expect(screen.getByRole('dialog', { name: 'Dry-Aged Ribeye' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    expect(document.documentElement.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    unmount();
    expect(opener).toHaveFocus();
    expect(document.documentElement.style.overflow).toBe('');
    opener.remove();
  });

  it('closes from the backdrop but not from inside the dialog', () => {
    const onClose = jest.fn();
    render(<DishDialog dish={ribeye} onSubmit={jest.fn()} onClose={onClose} />);

    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(dialog.parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
