import { useState } from 'react';
import emailjs from '@emailjs/browser';
import { SectionHeading } from '../ui/SectionHeading';

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

function validate(name: string, email: string, message: string): FormErrors {
  const errors: FormErrors = {};
  if (!name.trim()) errors.name = 'Name is required.';
  if (!email.trim()) {
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  if (!message.trim()) errors.message = 'Message is required.';
  else if (message.trim().length < 10) errors.message = 'Message must be at least 10 characters.';
  return errors;
}

export function Connect() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<FormTouched>({ name: false, email: false, message: false });

  const handleBlur = (field: keyof FormTouched, value: string) => {
    setTouched(t => ({ ...t, [field]: true }));
    const form = { name: '', email: '', message: '', [field]: value };
    const errs = validate(form.name, form.email, form.message);
    setErrors(prev => ({ ...prev, [field]: errs[field] }));
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
    if (Object.keys(errs).length > 0) return;

    setStatus('sending');
    try {
      await emailjs.send(
        'service_2hz6tjs',
        'template_gezwadr',
        { name, email, message },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
      );
      setStatus('sent');
      form.reset();
      setTouched({ name: false, email: false, message: false });
      setErrors({});
    } catch {
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
              <label htmlFor="name" className="font-mono text-xs text-accent tracking-[0.04em]">name</label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="your name"
                data-keynav-element
                className={fieldClass('name')}
                onBlur={e => handleBlur('name', e.target.value)}
                aria-invalid={touched.name && !!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {touched.name && errors.name && (
                <p id="name-error" className="font-mono text-xs text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="flex flex-col gap-[0.4rem]">
              <label htmlFor="email" className="font-mono text-xs text-accent tracking-[0.04em]">email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                data-keynav-element
                className={fieldClass('email')}
                onBlur={e => handleBlur('email', e.target.value)}
                aria-invalid={touched.email && !!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {touched.email && errors.email && (
                <p id="email-error" className="font-mono text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="flex flex-col gap-[0.4rem]">
              <label htmlFor="message" className="font-mono text-xs text-accent tracking-[0.04em]">message</label>
              <textarea
                id="message"
                name="message"
                rows={5}
                placeholder="What's on your mind?"
                data-keynav-element
                className={fieldClass('message')}
                onBlur={e => handleBlur('message', e.target.value)}
                aria-invalid={touched.message && !!errors.message}
                aria-describedby={errors.message ? 'message-error' : undefined}
              />
              {touched.message && errors.message && (
                <p id="message-error" className="font-mono text-xs text-red-500">{errors.message}</p>
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
              <li className="flex flex-col gap-[0.2rem]">
                <span className="text-accent font-mono text-xs">email</span>
                <a href="mailto:sarvin5124@gmail.com" className="text-text hover:text-accent hover:opacity-100 text-[0.9rem]">sarvin5124@gmail.com</a>
              </li>
              <li className="flex flex-col gap-[0.2rem]">
                <span className="text-accent font-mono text-xs">github</span>
                <a href="https://github.com/sarvinshrivastava" target="_blank" rel="noopener noreferrer" className="text-text hover:text-accent hover:opacity-100 text-[0.9rem]">
                  sarvinshrivastava
                </a>
              </li>
              <li className="flex flex-col gap-[0.2rem]">
                <span className="text-accent font-mono text-xs">linkedin</span>
                <a href="https://linkedin.com/in/sarvin-shrivastava" target="_blank" rel="noopener noreferrer" className="text-text hover:text-accent hover:opacity-100 text-[0.9rem]">
                  sarvin-shrivastava
                </a>
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
}
