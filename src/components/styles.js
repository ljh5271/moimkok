// 여러 화면에서 반복되는 Tailwind 클래스 묶음 (토스 스타일: 테두리·그림자 없이 면과 여백으로 구분)
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

const btnBase = `inline-flex items-center justify-center rounded-2xl font-semibold transition-[background-color,transform] duration-100 active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100 ${focus}`

/** 큰 파란 버튼 (화면의 주요 행동) */
export const btnPrimary = `${btnBase} h-14 px-5 text-[17px] bg-primary text-white active:bg-primary-deep disabled:bg-primary/30`

/** 연한 파란 버튼 (보조 행동) */
export const btnSecondary = `${btnBase} h-14 px-5 text-[17px] bg-primary-weak text-primary active:bg-primary/20 disabled:opacity-50`

/** 작은 회색 버튼 (복사, 이름 바꾸기 같은 가벼운 행동) */
export const btnGhost = `${btnBase} h-10 px-3.5 text-[15px] bg-paper text-ink-soft active:bg-line disabled:opacity-50`

export const input = `w-full h-14 rounded-2xl bg-paper px-4 text-[17px] text-ink placeholder:text-ink-faint transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary aria-invalid:ring-2 aria-invalid:ring-sun`

export const textarea = `w-full rounded-2xl bg-paper px-4 py-3.5 text-[17px] leading-relaxed text-ink placeholder:text-ink-faint transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary`

export const label = 'mb-2 block text-[15px] font-semibold text-ink-soft'

export const errorText = 'mt-2 text-[14px] font-medium text-sun'

/** 흰 카드. 회색 배경 위에 올린다 */
export const card = 'rounded-3xl bg-white p-6'

/** 화면 맨 위 큰 제목 */
export const pageTitle = 'text-[26px] leading-[1.35] font-bold tracking-[-0.02em]'

/** 카드 안 소제목 */
export const sectionTitle = 'text-[19px] leading-snug font-bold tracking-[-0.01em]'
