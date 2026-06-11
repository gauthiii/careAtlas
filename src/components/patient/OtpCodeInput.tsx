import { Eye, EyeOff } from 'lucide-react'
import { useRef, useState } from 'react'

const OTP_LENGTH = 6

export function OtpCodeInput({
  value,
  onChange,
  disabled = false,
  label = 'Authenticator code',
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  label?: string
}) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])
  const [isVisible, setIsVisible] = useState(false)
  const digits = Array.from({ length: OTP_LENGTH }, (_, index) => value[index] ?? '')

  function focusInput(index: number) {
    inputsRef.current[index]?.focus()
    inputsRef.current[index]?.select()
  }

  function updateDigit(index: number, nextDigit: string) {
    const next = [...digits]
    next[index] = nextDigit
    onChange(next.join('').slice(0, OTP_LENGTH))
  }

  return (
    <fieldset className="grid gap-[7px] text-md font-bold" disabled={disabled}>
      <legend className="sr-only">{label}</legend>
      <div className="flex items-center justify-between gap-3">
        <span>{label}</span>
        <button
          type="button"
          className="inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-[9px] border border-[#cbdde6] bg-white px-2.5 text-[0.78rem] font-black text-[#143A57] transition hover:bg-[#f7fbfd] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => setIsVisible((current) => !current)}
          disabled={disabled}
          aria-label={isVisible ? 'Hide authenticator code' : 'Show authenticator code'}
        >
          {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
          {isVisible ? 'Hide' : 'Show'}
        </button>
      </div>
      <div className="flex gap-2 max-[420px]:gap-1.5" aria-label={label}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              inputsRef.current[index] = element
            }}
            className="h-12 w-12 rounded-[10px] border border-[#cbdde6] bg-white text-center text-xl font-black text-[#102033] outline-none transition focus:border-[#143A57] focus:ring-2 focus:ring-[#143A57]/20 disabled:cursor-not-allowed disabled:bg-[#f2f6f8] max-[420px]:h-11 max-[420px]:w-10"
            type={isVisible ? 'text' : 'password'}
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            value={digit}
            onChange={(event) => {
              const nextValue = event.target.value.replace(/\D/g, '')
              if (!nextValue) {
                updateDigit(index, '')
                return
              }

              updateDigit(index, nextValue[nextValue.length - 1])
              if (index < OTP_LENGTH - 1) focusInput(index + 1)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Backspace' && !digits[index] && index > 0) {
                event.preventDefault()
                focusInput(index - 1)
              }
              if (event.key === 'ArrowLeft' && index > 0) {
                event.preventDefault()
                focusInput(index - 1)
              }
              if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
                event.preventDefault()
                focusInput(index + 1)
              }
            }}
            onPaste={(event) => {
              event.preventDefault()
              const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
              if (!pasted) return
              onChange(pasted)
              focusInput(Math.min(pasted.length, OTP_LENGTH) - 1)
            }}
          />
        ))}
      </div>
    </fieldset>
  )
}
