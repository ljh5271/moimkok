// 여러 화면에서 반복되는 Tailwind 클래스 묶음
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'

export const btnPrimary = `inline-flex h-12 items-center justify-center rounded-xl bg-ink px-5 font-bold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-ink-soft/40 ${focus}`

export const btnSecondary = `inline-flex h-12 items-center justify-center rounded-xl border border-line bg-white px-5 font-semibold text-ink transition active:scale-[0.98] ${focus}`

export const input = `w-full rounded-xl border border-line bg-white px-4 py-3 text-base text-ink placeholder:text-ink-soft/60 focus:border-ink focus:outline-none focus:ring-2 focus:ring-mark aria-invalid:border-sun`

export const label = 'mb-2 block font-bold'

export const errorText = 'mt-2 text-sm font-medium text-sun'

export const card = 'rounded-2xl border border-line bg-white p-5'
