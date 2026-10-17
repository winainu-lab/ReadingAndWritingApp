import { AlertCircle, CheckCircle2, LoaderCircle, X } from 'lucide-react'
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}) {
  return (
    <button className={`button button--${variant} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="page-header__action">{action}</div>}
    </header>
  )
}

export function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}

export function LoadingState({ label = 'กำลังโหลดข้อมูล' }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" size={22} /> {label}
    </div>
  )
}

export function Notice({ tone, children }: { tone: 'success' | 'error' | 'info'; children: ReactNode }) {
  return (
    <div className={`notice notice--${tone}`}>
      {tone === 'success' ? <CheckCircle2 size={20} /> : tone === 'error' ? <AlertCircle size={20} /> : null}
      <span>{children}</span>
    </div>
  )
}

export function Modal({ title, children, onClose, closeOnBackdrop = false }: { title: string; children: ReactNode; onClose: () => void; closeOnBackdrop?: boolean }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (closeOnBackdrop && event.target === event.currentTarget) onClose() }}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal__header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="ปิด">
            <X size={22} />
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}

/**
 * Number field that lets people type freely. The value is only forced into [min, max] when the
 * field loses focus or Enter is pressed, so typing "180" never gets rewritten halfway as "1" → "10".
 * In-range values are reported immediately; out-of-range drafts wait until the field is left.
 */
export function NumberInput({ value, min, max, onChange, className, ...rest }: {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  className?: string
  'aria-label'?: string
}) {
  const [draft, setDraft] = useState(String(value))
  const focused = useRef(false)

  // Follow outside changes (e.g. a "use all" button) while the user is not typing.
  useEffect(() => { if (!focused.current) setDraft(String(value)) }, [value])

  const commit = () => {
    const parsed = Number(draft)
    const next = draft.trim() === '' || !Number.isFinite(parsed) ? value : Math.min(max, Math.max(min, Math.round(parsed)))
    setDraft(String(next))
    if (next !== value) onChange(next)
  }

  return <input
    {...rest}
    className={className}
    type="text"
    inputMode="numeric"
    pattern="[0-9]*"
    value={draft}
    onFocus={(event) => { focused.current = true; event.target.select() }}
    onChange={(event) => {
      const text = event.target.value.replace(/[^0-9]/g, '')
      setDraft(text)
      const parsed = Number(text)
      if (text !== '' && parsed >= min && parsed <= max) onChange(parsed)
    }}
    onBlur={() => { focused.current = false; commit() }}
    onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commit() } }}
  />
}
