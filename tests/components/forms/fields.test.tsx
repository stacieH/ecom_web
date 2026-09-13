import { fireEvent, render, screen } from '@testing-library/react';
import {
  CheckboxField,
  describedBy,
  focusFirstInvalid,
  FormAlert,
  RadioGroupField,
  SelectField,
  TextAreaField,
  TextField,
} from '@/components/forms/fields';

describe('field helpers', () => {
  it('joins the hint and error ids that exist', () => {
    expect(describedBy('email', { hint: 'We send the receipt here' })).toBe('email-hint');
    expect(describedBy('email', { hint: 'Hint', error: 'Oops' })).toBe('email-hint email-error');
    expect(describedBy('email', {})).toBeUndefined();
  });

  it('focuses the first field id that exists on the page', () => {
    render(
      <>
        <input id="second" />
        <input id="third" />
      </>,
    );

    focusFirstInvalid(['first', 'second', 'third']);

    expect(document.getElementById('second')).toHaveFocus();
  });
});

describe('TextField', () => {
  it('labels the input and reports typing and blur as plain strings', () => {
    const onChange = jest.fn();
    const onBlur = jest.fn();
    render(
      <TextField id="name" label="Name" value="" onChange={onChange} onBlur={onBlur} autoComplete="name" />,
    );

    const input = screen.getByLabelText('Name');
    fireEvent.change(input, { target: { value: 'Alex' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith('Alex');
    expect(onBlur).toHaveBeenCalled();
    expect(input).toHaveAttribute('autocomplete', 'name');
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(input).not.toHaveAttribute('aria-describedby');
  });

  it('marks an optional field in its label', () => {
    render(<TextField id="building" label="Building" optional value="" onChange={jest.fn()} />);
    expect(screen.getByLabelText('Building (optional)')).toBeInTheDocument();
  });

  it('shows the hint and the error, and links both to the input', () => {
    render(
      <TextField
        id="email"
        label="Email"
        hint="We send your receipt here"
        error="Enter a valid email address"
        value="alex@"
        onChange={jest.fn()}
      />,
    );

    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'email-hint email-error');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address');
    expect(screen.getByText('We send your receipt here')).toHaveAttribute('id', 'email-hint');
  });
});

describe('TextAreaField', () => {
  it('works like a text field', () => {
    const onChange = jest.fn();
    render(
      <TextAreaField id="notes" label="Order notes" optional value="" error="Too long" onChange={onChange} />,
    );

    const textarea = screen.getByLabelText('Order notes (optional)');
    fireEvent.change(textarea, { target: { value: 'Extra napkins' } });

    expect(onChange).toHaveBeenCalledWith('Extra napkins');
    expect(textarea).toHaveAttribute('aria-describedby', 'notes-error');
  });
});

describe('SelectField', () => {
  it('lists a disabled placeholder and the options', () => {
    const onChange = jest.fn();
    render(
      <SelectField
        id="area"
        label="Delivery area"
        placeholder="Choose an area"
        value=""
        options={[
          { value: 'a1', label: 'Poblacion' },
          { value: 'a2', label: 'Rockwell', disabled: true },
        ]}
        onChange={onChange}
      />,
    );

    const select = screen.getByLabelText('Delivery area') as HTMLSelectElement;
    expect(Array.from(select.options).map((option) => [option.textContent, option.disabled])).toEqual(
      [
        ['Choose an area', true],
        ['Poblacion', false],
        ['Rockwell', true],
      ],
    );

    fireEvent.change(select, { target: { value: 'a1' } });
    expect(onChange).toHaveBeenCalledWith('a1');
  });
});

describe('CheckboxField', () => {
  it('reports checked state and shows its error', () => {
    const onChange = jest.fn();
    render(
      <CheckboxField
        id="consent"
        label="I agree to the privacy notice"
        checked={false}
        error="Please agree to the privacy notice"
        onChange={onChange}
      />,
    );

    const checkbox = screen.getByLabelText('I agree to the privacy notice');
    fireEvent.click(checkbox);

    expect(onChange).toHaveBeenCalledWith(true);
    expect(checkbox).toHaveAttribute('aria-describedby', 'consent-error');
    expect(screen.getByRole('alert')).toHaveTextContent('Please agree to the privacy notice');
  });
});

describe('RadioGroupField', () => {
  it('groups options under a legend, with descriptions and disabled choices', () => {
    const onChange = jest.fn();
    render(
      <RadioGroupField
        id="payment"
        legend="Payment"
        value=""
        error="Choose how you’ll pay"
        options={[
          { value: 'ONLINE', label: 'Pay online', description: 'GCash, Maya, card, QR Ph' },
          {
            value: 'CASH_ON_DELIVERY',
            label: 'Cash on delivery',
            description: 'Available for orders up to ₱3,000',
            disabled: true,
          },
        ]}
        onChange={onChange}
      />,
    );

    const group = screen.getByRole('radiogroup', { name: 'Payment' });
    expect(group).toHaveAttribute('aria-describedby', 'payment-error');
    expect(group).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('radio', { name: /Cash on delivery/ })).toBeDisabled();

    fireEvent.click(screen.getByRole('radio', { name: /Pay online/ }));

    expect(onChange).toHaveBeenCalledWith('ONLINE');
    expect(screen.getByRole('alert')).toHaveTextContent('Choose how you’ll pay');
  });
});

describe('FormAlert', () => {
  it('announces a form-level message', () => {
    render(<FormAlert message="Please fix the 3 highlighted fields." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Please fix the 3 highlighted fields.');
  });

  it('renders nothing without a message', () => {
    const { container } = render(<FormAlert message={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
