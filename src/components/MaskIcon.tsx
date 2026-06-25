import clsx from 'clsx'

interface MaskIconProps {
  /** Image URL (monochrome PNG/SVG). Only its alpha is used. */
  src: string
  /** Tailwind size + `text-*` color classes, e.g. "w-5 h-5 text-cream". */
  className?: string
}

/**
 * Renders a monochrome icon asset tinted to any color via CSS masking.
 * The icon's shape is taken from the image's alpha channel and filled with
 * the current text color, so the same dark PNG can appear in cream, navy,
 * accent, etc. Control the color with a `text-*` class on this element or a
 * parent (e.g. the icon inherits an active nav link's color automatically).
 */
export function MaskIcon({ src, className }: MaskIconProps) {
  return (
    <span
      aria-hidden
      className={clsx('inline-block shrink-0', className)}
      style={{
        backgroundColor: 'currentColor',
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
      }}
    />
  )
}
