import {
  ACCOUNT_FIELD_ERRORS,
  CHECKOUT_FIELD_ERRORS,
  lineFieldErrors,
  mapFieldErrors,
} from '@/lib/ordering/validation/serverErrors';

describe('server field errors', () => {
  it('maps checkout keys onto form fields, first message only, ignoring unknown keys', () => {
    expect(
      mapFieldErrors(
        {
          'customer.email': ['Email address is not deliverable', 'Second'],
          'delivery.landmark': ['Add a landmark so our rider can find you'],
          'timing.startsAt': ['That time is no longer available'],
          somethingElse: ['Ignored'],
        },
        CHECKOUT_FIELD_ERRORS,
      ),
    ).toEqual({
      email: 'Email address is not deliverable',
      landmark: 'Add a landmark so our rider can find you',
      startsAt: 'That time is no longer available',
    });
  });

  it('maps account keys onto the same-named fields', () => {
    expect(
      mapFieldErrors({ currentPassword: ['Your current password is incorrect'] }, ACCOUNT_FIELD_ERRORS),
    ).toEqual({ currentPassword: 'Your current password is incorrect' });
  });

  it('collects the first message for each cart line', () => {
    expect(
      lineFieldErrors({
        'lines.0.optionIds': ['Choose a doneness'],
        'lines.0.note': ['Keep the note under 140 characters'],
        'lines.2.dishId': ['This dish is no longer available'],
        'customer.name': ['Please tell us your name'],
      }),
    ).toEqual({ 0: 'Choose a doneness', 2: 'This dish is no longer available' });
  });
});
