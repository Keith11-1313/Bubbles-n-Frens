import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

export function Modal({ isOpen, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card-dark rounded-app min-w-[460px] max-w-[600px] max-h-[80vh] flex flex-col animate-fadeIn" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

Modal.Header = function ModalHeader({
  title,
  onClose,
}: {
  title: string
  onClose: () => void
}) {
  return (
    <div className="flex justify-between items-center p-5 border-b border-white/10">
      <h2 className="text-accent font-bold text-xl">{title}</h2>
      <button
        onClick={onClose}
        className="text-white/40 hover:text-white transition-colors cursor-pointer"
      >
        <X size={20} />
      </button>
    </div>
  )
}

Modal.Body = function ModalBody({ children }: { children: React.ReactNode }) {
  return <div className="p-5 overflow-auto">{children}</div>
}

Modal.Footer = function ModalFooter({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="p-5 border-t border-white/10 flex gap-3 justify-end">
      {children}
    </div>
  )
}
