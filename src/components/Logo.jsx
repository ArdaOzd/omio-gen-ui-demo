import { Button } from '@/components/ui/button'

export default function Logo({ inverse = false, onClick }) {
  const content = (
    <span className={`brand-logo ${inverse ? 'brand-logo--inverse' : ''}`} aria-label="Omio home">
      <span className="brand-logo__dot" aria-hidden="true" />
      <span>omio</span>
    </span>
  )

  if (!onClick) return content
  return (
    <Button className="logo-button" variant="ghost" size="icon" type="button" onClick={onClick} aria-label="Return home">
      {content}
    </Button>
  )
}
