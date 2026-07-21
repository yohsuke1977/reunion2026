// 一次締め切りを目立たせる上部バナー。締切を過ぎたら自動で非表示。
const DEADLINE = new Date(2026, 6, 31); // 2026/07/31（金）

export default function DeadlineBanner() {
  // カレンダー上の日数差で数える（7/21なら「あと10日」、7/31当日は「本日まで！」）
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((DEADLINE.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return null;

  return (
    <a className="dlbanner" href="#rsvp">
      <div className="dl-row">
        <span className="dl-tag">一次締切</span>
        <span className="dl-date">7<small>月</small>31<small>日</small><small>（金）</small></span>
        {days > 0
          ? <span className="dl-days">あと<b>{days}</b>日</span>
          : <span className="dl-days dl-today">本日まで！</span>}
      </div>
      <span className="dl-cta">出欠を登録する ▶</span>
    </a>
  );
}
