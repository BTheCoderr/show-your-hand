import { useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { FEEDBACK_PLATFORMS, FEEDBACK_TOPICS, type FeedbackTopic } from './siteConfig'

export const FEEDBACK_FORM_NAME = 'feedback'
export const FEEDBACK_FIELDS = ['topic', 'platform', 'message', 'name', 'email', 'room-code', 'page'] as const
const SUBMIT_TIMEOUT_MS = 15000
const MESSAGE_MIN = 10
const MESSAGE_MAX = 2500

type Values = {
  topic: FeedbackTopic
  platform: string
  message: string
  name: string
  email: string
  roomCode: string
}

type Field = 'topic' | 'message' | 'email' | 'roomCode'
type Errors = Partial<Record<Field, string>>
type Status = 'idle' | 'sending' | 'sent' | 'error'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ROOM_CODE_PATTERN = /^[A-Fa-f0-9]{6}$/

export function validateFeedback(values: Values): Errors {
  const errors: Errors = {}
  if (!FEEDBACK_TOPICS.some((topic) => topic.value === values.topic)) {
    errors.topic = 'Choose what your message is about.'
  }
  const message = values.message.trim()
  if (!message) errors.message = 'Tell us what happened.'
  else if (message.length < MESSAGE_MIN) errors.message = `Add a little more detail (at least ${MESSAGE_MIN} characters).`
  else if (message.length > MESSAGE_MAX) errors.message = `Keep it under ${MESSAGE_MAX} characters.`
  const email = values.email.trim()
  if (email && !EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address, or leave it blank.'
  const roomCode = values.roomCode.trim()
  if (roomCode && !ROOM_CODE_PATTERN.test(roomCode)) {
    errors.roomCode = 'Room codes are 6 characters using 0–9 and A–F, for example 3FA9C2.'
  }
  return errors
}

export function encodeFeedback(values: Values, page: string): string {
  return new URLSearchParams({
    'form-name': FEEDBACK_FORM_NAME,
    'bot-field': '',
    topic: values.topic,
    platform: values.platform,
    message: values.message.trim(),
    name: values.name.trim(),
    email: values.email.trim(),
    'room-code': values.roomCode.trim().toUpperCase(),
    page,
  }).toString()
}

function topicFromLocation(): FeedbackTopic | null {
  if (typeof window === 'undefined') return null
  const raw = new URLSearchParams(window.location.search).get('topic')
  return FEEDBACK_TOPICS.find((topic) => topic.value === raw)?.value ?? null
}

const EMPTY: Omit<Values, 'topic'> = { platform: '', message: '', name: '', email: '', roomCode: '' }

export function FeedbackForm({
  defaultTopic = 'support',
  page,
  headingLevel = 2,
}: {
  defaultTopic?: FeedbackTopic
  page: string
  headingLevel?: 2 | 3
}) {
  const id = useId()
  const [values, setValues] = useState<Values>({ topic: defaultTopic, ...EMPTY })
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const summaryRef = useRef<HTMLDivElement>(null)
  const sentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const topic = topicFromLocation()
    if (topic) setValues((current) => ({ ...current, topic }))
  }, [])

  useEffect(() => {
    if (status === 'sent') sentRef.current?.focus()
  }, [status])

  const fieldId = (name: string) => `${id}-${name}`
  const errorId = (name: Field) => `${id}-${name}-error`

  const update =
    (key: keyof Values) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const next = { ...values, [key]: event.target.value }
      setValues(next)
      if (key in errors) setErrors(validateFeedback(next))
    }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const honeypot = (form.elements.namedItem('bot-field') as HTMLInputElement | null)?.value
    const nextErrors = validateFeedback(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setStatus('idle')
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    if (honeypot) {
      setStatus('sent')
      return
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setStatus('error')
      setErrorMessage('You appear to be offline. Reconnect to the internet and send again — your message is still here.')
      return
    }

    setStatus('sending')
    setErrorMessage('')
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS)
    try {
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encodeFeedback(values, page),
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`status ${response.status}`)
      setValues({ topic: values.topic, ...EMPTY })
      setStatus('sent')
    } catch (error) {
      setStatus('error')
      setErrorMessage(
        error instanceof DOMException && error.name === 'AbortError'
          ? 'The request timed out. Check your connection and send again — your message is still here.'
          : 'We could not send your message right now. Please try again in a few minutes — your message is still here.',
      )
    } finally {
      window.clearTimeout(timer)
    }
  }

  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  const errorEntries = Object.entries(errors) as Array<[Field, string]>
  const fieldFor: Record<Field, string> = {
    topic: fieldId('topic'),
    message: fieldId('message'),
    email: fieldId('email'),
    roomCode: fieldId('room-code'),
  }
  const describedBy = (field: Field, hint?: string) =>
    [hint, errors[field] ? errorId(field) : null].filter(Boolean).join(' ') || undefined

  if (status === 'sent') {
    return (
      <div className="syh-form-sent" role="status" tabIndex={-1} ref={sentRef}>
        <Heading>Message received</Heading>
        <p>
          Thanks — your message was sent to the SHOW YOUR HAND team.
          {' '}If you added an email address, we can reply to you there.
        </p>
        <button type="button" className="syh-secondary" onClick={() => setStatus('idle')}>
          Send another message
        </button>
      </div>
    )
  }

  return (
    <form
      ref={formRef}
      name={FEEDBACK_FORM_NAME}
      method="POST"
      data-netlify="true"
      netlify-honeypot="bot-field"
      onSubmit={submit}
      className="syh-feedback-form"
      noValidate
      aria-busy={status === 'sending'}
    >
      <input type="hidden" name="form-name" value={FEEDBACK_FORM_NAME} />
      <input type="hidden" name="page" value={page} />
      <p className="syh-visually-hidden" aria-hidden="true">
        <label>
          Leave this empty
          <input name="bot-field" tabIndex={-1} autoComplete="off" />
        </label>
      </p>

      {errorEntries.length > 0 ? (
        <div className="syh-form-error-summary" role="alert" tabIndex={-1} ref={summaryRef}>
          <p>Please fix {errorEntries.length === 1 ? 'this' : 'these'} before sending:</p>
          <ul>
            {errorEntries.map(([field, message]) => (
              <li key={field}>
                <a href={`#${fieldFor[field]}`}>{message}</a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="syh-form-row">
        <div className="syh-field">
          <label htmlFor={fieldId('topic')}>What is this about?</label>
          <select
            id={fieldId('topic')}
            name="topic"
            value={values.topic}
            onChange={update('topic')}
            aria-invalid={errors.topic ? true : undefined}
            aria-describedby={describedBy('topic')}
            required
          >
            {FEEDBACK_TOPICS.map((topic) => (
              <option key={topic.value} value={topic.value}>
                {topic.label}
              </option>
            ))}
          </select>
          {errors.topic ? <p className="syh-field-error" id={errorId('topic')}>{errors.topic}</p> : null}
        </div>
        <div className="syh-field">
          <label htmlFor={fieldId('platform')}>
            Where are you playing? <span>(optional)</span>
          </label>
          <select id={fieldId('platform')} name="platform" value={values.platform} onChange={update('platform')}>
            <option value="">Choose…</option>
            {FEEDBACK_PLATFORMS.map((platform) => (
              <option key={platform.value} value={platform.value}>
                {platform.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="syh-field">
        <label htmlFor={fieldId('message')}>What happened?</label>
        <p className="syh-field-hint" id={fieldId('message-hint')}>
          For bugs, include what you tapped, what you expected, and what happened instead.
        </p>
        <textarea
          id={fieldId('message')}
          name="message"
          rows={7}
          maxLength={MESSAGE_MAX}
          value={values.message}
          onChange={update('message')}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={describedBy('message', `${fieldId('message-hint')} ${fieldId('message-count')}`)}
          required
        />
        <p className="syh-field-count" id={fieldId('message-count')}>
          {values.message.length} / {MESSAGE_MAX}
        </p>
        {errors.message ? <p className="syh-field-error" id={errorId('message')}>{errors.message}</p> : null}
      </div>

      <div className="syh-form-row">
        <div className="syh-field">
          <label htmlFor={fieldId('name')}>
            Your name <span>(optional)</span>
          </label>
          <input
            id={fieldId('name')}
            name="name"
            maxLength={80}
            autoComplete="name"
            value={values.name}
            onChange={update('name')}
          />
        </div>
        <div className="syh-field">
          <label htmlFor={fieldId('email')}>
            Email <span>(optional — only if you want a reply)</span>
          </label>
          <input
            id={fieldId('email')}
            name="email"
            type="email"
            inputMode="email"
            maxLength={254}
            autoComplete="email"
            value={values.email}
            onChange={update('email')}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={describedBy('email')}
          />
          {errors.email ? <p className="syh-field-error" id={errorId('email')}>{errors.email}</p> : null}
        </div>
      </div>

      <div className="syh-field syh-field-short">
        <label htmlFor={fieldId('room-code')}>
          Room code <span>(optional, online issues only)</span>
        </label>
        <input
          id={fieldId('room-code')}
          name="room-code"
          maxLength={6}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          value={values.roomCode}
          onChange={update('roomCode')}
          aria-invalid={errors.roomCode ? true : undefined}
          aria-describedby={describedBy('roomCode')}
        />
        {errors.roomCode ? <p className="syh-field-error" id={errorId('roomCode')}>{errors.roomCode}</p> : null}
      </div>

      <p className="syh-form-privacy">
        Please don’t include passwords, payment details, or your private room token. See the{' '}
        <a href="/privacy#feedback">Privacy Policy</a> for how messages are stored.
      </p>

      <div className="syh-form-actions">
        <button type="submit" className="syh-primary" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Send message'}
        </button>
      </div>
      {status === 'error' ? (
        <p className="syh-form-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </form>
  )
}
