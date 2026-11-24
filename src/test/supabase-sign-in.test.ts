import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { panelEmailFor, signInOutcomeFor } from '../services/supabase-sign-in'

describe('Supabase sign-in for the panel', () => {
  it('signs in with the phone as an address the admin never sees', () => {
    expect(panelEmailFor('9981234567')).toBe('9981234567@panel.calm.invalid')
  })

  it.each([
    ['a wrong phone or password', 'wrongCredentials', new AuthApiError('Invalid login credentials', 400, 'invalid_credentials')],
    ['the rate limit code', 'tooManyAttempts', new AuthApiError('Request rate limit reached', 429, 'over_request_rate_limit')],
    ['an HTTP 429 without a code', 'tooManyAttempts', new AuthApiError('Too many requests', 429, undefined)],
    ['a failed request', 'unavailable', new AuthRetryableFetchError('Failed to fetch', 0)],
    ['any other refusal', 'unavailable', new AuthApiError('Email not confirmed', 400, 'email_not_confirmed')],
  ])('reads %s as %s', (_case, outcome, error) => {
    expect(signInOutcomeFor(error)).toBe(outcome)
  })
})
