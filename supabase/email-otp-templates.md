# Supabase email OTP templates

The Admin authentication UI expects two Supabase email templates to show the
six-digit `{{ .Token }}` value instead of a clickable magic link.

## 1. Admin sign-in code

In the Supabase Dashboard, open **Authentication → Emails → Templates → Magic
Link** and use a template similar to this:

```html
<h2>Your Tang Portfolio Admin sign-in code</h2>
<p>Enter this one-time code to finish signing in:</p>
<h1 style="letter-spacing: 0.3em">{{ .Token }}</h1>
<p>This code can only be used once. If you did not request it, ignore this email.</p>
```

Suggested subject:

```text
Your Tang Portfolio Admin sign-in code
```

## 2. Password recovery code

Open **Authentication → Emails → Templates → Reset Password** and use:

```html
<h2>Reset your Tang Portfolio Admin password</h2>
<p>Enter this one-time recovery code:</p>
<h1 style="letter-spacing: 0.3em">{{ .Token }}</h1>
<p>This code can only be used once. If you did not request it, ignore this email.</p>
```

Suggested subject:

```text
Your Tang Portfolio password recovery code
```

## 3. Recommended Auth settings

In **Authentication → Sign In / Providers → Email**:

- Keep Email authentication enabled.
- Set Email OTP length to 6 digits.
- Set Email OTP expiry to 600 seconds (10 minutes).

Supabase's built-in SMTP is sufficient for initial testing with an email that is
part of the Supabase organization team. It is limited to two Auth emails per
hour and is not intended for production email delivery.

Do not add a secret key or `service_role` key to the Vite frontend. The existing
publishable key is the correct key for these client-side Auth calls.
