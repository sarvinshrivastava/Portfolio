import { useState } from 'react';
import emailjs from '@emailjs/browser';
import { SectionHeading } from '../ui/SectionHeading';
import { track, trackOnce, trackSocial, type SocialNetwork } from '../../lib/analytics';

interface Contact {
  network: SocialNetwork;
  label: string;
  href: string;
  text: string;
  external: boolean;
}

/**
 * The aside's reach-me links. Hardcoded here, unlike Footer/About which read
 * the same URLs from `useAbout()` — worth unifying once the data is plumbed in.
 */
const CONTACTS: Contact[] = [
  {
    network: 'email',
    label: 'email',
    href: 'mailto:sarvin5124@gmail.com',
    text: 'sarvin5124@gmail.com',
    external: false,
  },
  {
    network: 'github',
    label: 'github',
    href: 'https://github.com/sarvinshrivastava',
    text: 'sarvinshrivastava',
    external: true,
  },
  {
    network: 'linkedin',
    label: 'linkedin',
    href: 'https://linkedin.com/in/sarvin-shrivastava',
    text: 'sarvin-shrivastava',
    external: true,
  },
];

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

interface FormTouched {
  name: boolean;
  email: boolean;
  message: boolean;
}

function validateField(field: keyof FormTouched, value: string): string | undefined {
  const v = value.trim();
  if (field === 'name') return v ? undefined : 'Name is required.';
  if (field === 'email') {
    if (!v) return 'Email is required.';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? undefined : 'Enter a valid email address.';
  }
  if (field === 'message') {
    if (!v) return 'Message is required.';
    return v.length >= 10 ? undefined : 'Message must be at least 10 characters.';
  }
}

function validate(name: string, email: string, message: string): FormErrors {
  return {
    name: validateField('name', name),
    email: validateField('email', email),
    message: validateField('message', message),
  };
}

/**
 * Turns an EmailJS rejection into a short, PII-free reason for analytics.
 *
 * @emailjs/browser@4.4.1 rejects in three different shapes:
 *  - `EmailJSResponseStatus` (`{ status, text }`) for every server rejection
 *    and for the SDK's own guards (403 blocklist, 429 throttle, 451 headless);
 *  - a BARE STRING from `validateParams` — the missing-env-var case
 *    (VITE_EMAILJS_PUBLIC_KEY / _SERVICE_ID / _TEMPLATE_ID absent from the
 *    deploy environment), which is the failure this event mostly exists to
 *    catch, and which a `typeof err === 'object'` guard silently swallows;
 *  - a `TypeError` from `fetch` when the network is down — no status attached.
 *
 * `text` is deliberately never reported. It is server-authored free text and
 * SMTP rejections routinely echo the recipient address, which here derives
 * from the visitor's typed email (`550 5.1.1 <typo@gmial.com> ...`).
 * Truncation is not sanitisation. It is unreachable in 4.4.1 — every rejection
 * carries a non-zero status — but a minor bump would turn it into a silent PII
 * leak to the analytics host, so the branch is gone rather than trimmed.
 */
function sendErrorReason(err: unknown): string {
  // Bare string: SDK config validation. EmailJS-authored, never visitor input.
  if (typeof err === 'string') return `config_${err.slice(0, 40)}`;
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const { status } = err as { status?: number };
    // Falsy-zero is intentional, not a bug: 0 is EmailJSResponseStatus's
    // "Network Error" default, not a real EmailJS code. Do NOT change this to
    // `status !== undefined` — 0 should fall through to 'unknown'.
    if (status) return `emailjs_${status}`;
  }
  if (err instanceof Error) return 'network';
  return 'unknown';
}

export function Connect() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<FormTouched>({
    name: false,
    email: false,
    message: false,
  });

  // First touch of any field = funnel entry; deduped so it fires once per visit
  const handleFocus = () => trackOnce('contact_form_start', 'contact_form_start');

  const handleBlur = (field: keyof FormTouched, value: string) => {
    setTouched(t => ({ ...t, [field]: true }));
    setErrors(prev => ({ ...prev, [field]: validateField(field, value) }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = fd.get('name') as string;
    const email = fd.get('email') as string;
    const message = fd.get('message') as string;

    // Mark all touched and validate
    setTouched({ name: true, email: true, message: true });
    const errs = validate(name, email, message);
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) {
      // One event per blocking field — the message is ours, not the visitor's input
      for (const [field, error] of Object.entries(errs)) {
        if (error) track('contact_validation_error', { field, error });
      }
      return;
    }

    track('contact_form_submit');
    setStatus('sending');
    try {
      await emailjs.send(
        'service_2hz6tjs',
        'template_gezwadr',
        { name, email, message },
        {
          publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
          // Unauthenticated mail relay: service id, template id and public key
          // all ship in the bundle, so anyone can POST the EmailJS API direct.
          // This localStorage throttle is a speed bump for the honest path
          // only — the real controls are reCAPTCHA + allowed origins in the
          // EmailJS dashboard. A hit rejects with status 429 (`emailjs_429`).
          limitRate: { id: 'contact_form', throttle: 60_000 },
        },
      );
      track('contact_form_success');
      setStatus('sent');
      form.reset();
      setTouched({ name: false, email: false, message: false });
      setErrors({});
    } catch (err) {
      track('contact_form_error', { reason: sendErrorReason(err) });
      setStatus('error');
    }
  };

  const baseInput =
    'bg-bg-secondary border rounded text-text font-sans text-[0.9375rem] px-4 py-3 w-full transition-colors duration-200 placeholder:text-text-muted focus:outline-none resize-none';

  const fieldClass = (field: keyof FormTouched) =>
    `${baseInput} ${touched[field] && errors[field] ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-accent'}`;

  return (
    <section id="connect" className="py-24" aria-label="Contact" data-keynav-section>
      <div className="container">
        <SectionHeading
          prefix="## connect"
          title="Get In Touch"
          subtitle="Have a project in mind, or just want to say hi? Drop a message."
        />

        <div className="grid grid-cols-[1fr_320px] gap-16 items-start max-[900px]:grid-cols-1 max-[900px]:gap-12">
          <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-[0.4rem]">
              <label htmlFor="name" className="font-mono text-xs text-accent tracking-[0.04em]">
                name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="your name"
                data-keynav-element
                className={fieldClass('name')}
                onFocus={handleFocus}
                onBlur={e => handleBlur('name', e.target.value)}
                aria-invalid={touched.name && !!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {touched.name && errors.name && (
                <p id="name-error" className="font-mono text-xs text-red-500">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-[0.4rem]">
              <label htmlFor="email" className="font-mono text-xs text-accent tracking-[0.04em]">
                email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                data-keynav-element
                className={fieldClass('email')}
                onFocus={handleFocus}
                onBlur={e => handleBlur('email', e.target.value)}
                aria-invalid={touched.email && !!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {touched.email && errors.email && (
                <p id="email-error" className="font-mono text-xs text-red-500">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-[0.4rem]">
              <label htmlFor="message" className="font-mono text-xs text-accent tracking-[0.04em]">
                message
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                placeholder="What's on your mind?"
                data-keynav-element
                className={fieldClass('message')}
                onFocus={handleFocus}
                onBlur={e => handleBlur('message', e.target.value)}
                aria-invalid={touched.message && !!errors.message}
                aria-describedby={errors.message ? 'message-error' : undefined}
              />
              {touched.message && errors.message && (
                <p id="message-error" className="font-mono text-xs text-red-500">
                  {errors.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              data-keynav-element
              className="font-mono text-sm bg-transparent border border-accent text-accent px-6 py-[0.875rem] rounded cursor-pointer transition-all duration-200 self-start hover:bg-accent hover:text-black disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={status === 'sending' || status === 'sent'}
            >
              {status === 'idle' && '$ send --message'}
              {status === 'sending' && '$ sending...'}
              {status === 'sent' && '✓ message sent!'}
              {status === 'error' && '$ retry (something went wrong)'}
            </button>
          </form>

          <aside className="pt-1">
            <p className="font-mono text-xs text-text-muted mb-5"># or reach me at</p>
            <ul className="list-none flex flex-col gap-4">
              {CONTACTS.map(({ network, label, href, text, external }) => (
                <li key={network} className="flex flex-col gap-[0.2rem]">
                  <span className="text-accent font-mono text-xs">{label}</span>
                  <a
                    href={href}
                    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    onClick={trackSocial(network, 'connect_aside')}
                    className="text-text hover:text-accent hover:opacity-100 text-[0.9rem]"
                  >
                    {text}
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
}
