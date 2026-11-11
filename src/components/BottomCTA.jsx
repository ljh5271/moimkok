/**
 * 화면 아래에 붙는 큰 버튼 영역 (토스 앱의 하단 고정 버튼).
 * 위쪽 띠만 배경색으로 흐려지고, 안내 문구와 버튼 뒤는 배경색으로 채워서 뒤 내용과 겹쳐 보이지 않게 한다.
 * 이 컴포넌트를 쓰는 화면은 맨 아래에 pb-36(문구가 있으면 pb-44) 정도 여백을 둔다.
 */
export default function BottomCTA({ children, note }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
      <div className="h-6 bg-gradient-to-t from-paper to-paper/0" />
      <div className="pointer-events-auto bg-paper">
        <div className="mx-auto max-w-xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          {note && <div className="mb-3">{note}</div>}
          {children}
        </div>
      </div>
    </div>
  )
}
