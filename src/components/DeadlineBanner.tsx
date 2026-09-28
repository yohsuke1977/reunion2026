// ページ上部バナー。一次締切まではカウントダウン、そのあとは会場への人数連絡までの
// カウントダウンに切り替わり、それも過ぎたら「引き続き受付中」の案内になる。
const DEADLINE = new Date(2026, 6, 31); // 一次締切 2026/07/31（金）
const HEADCOUNT = new Date(2026, 8, 10); // 会場へ人数の目安を伝える前日 2026/09/10（木）
const FINAL = new Date(2026, 9, 3);      // 最終締切 2026/10/03（土）。会場への最終報告（10/4）の前日
const LINE_URL = 'https://lin.ee/s4AsFK2';

export default function DeadlineBanner() {
  // カレンダー上の日数差で数える（締切当日は「本日まで！」）
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((DEADLINE.getTime() - today.getTime()) / 86_400_000);
  const headcountDays = Math.round((HEADCOUNT.getTime() - today.getTime()) / 86_400_000);
  const finalDays = Math.round((FINAL.getTime() - today.getTime()) / 86_400_000);

  // 一次締切後〜9/10: 会場へ人数を伝えるため、未定の方に更新を促す
  if (days < 0 && headcountDays >= 0) {
    return (
      <a className="dlbanner" href="#rsvp">
        <div className="dl-row">
          <span className="dl-tag">人数の確認</span>
          <span className="dl-date">9<small>月</small>10<small>日</small><small>（木）</small></span>
          {headcountDays > 0
            ? <span className="dl-days">あと<b>{headcountDays}</b>日</span>
            : <span className="dl-days dl-today">本日まで！</span>}
        </div>
        <span className="dl-cta">9/11に会場へ人数の目安を伝えます。出欠の登録・変更はこちら ▶</span>
      </a>
    );
  }

  // 9/11〜10/3: 最終締切のカウントダウン
  if (days < 0 && finalDays >= 0) {
    return (
      <a className="dlbanner" href="#rsvp">
        <div className="dl-row">
          <span className="dl-tag">最終締切</span>
          <span className="dl-date">10<small>月</small>3<small>日</small><small>（土）</small></span>
          {finalDays > 0
            ? <span className="dl-days">あと<b>{finalDays}</b>日</span>
            : <span className="dl-days dl-today">本日まで！</span>}
        </div>
        <span className="dl-cta">出欠の登録・変更はこちら ▶</span>
      </a>
    );
  }

  // 10/4以降: 締切済み。変更は幹事へ直接
  if (days < 0 && finalDays < 0) {
    return (
      <a className="dlbanner open" href={LINE_URL} target="_blank" rel="noopener noreferrer">
        <div className="dl-row">
          <span className="dl-tag">受付終了</span>
          <span className="dl-open-msg">出欠の受付は10/3で締め切りました</span>
        </div>
        <span className="dl-cta">変更がある方は幹事（LINE）へ ▶</span>
      </a>
    );
  }

  // （旧）一次締切後の受付中表示。上の分岐で全期間を覆うため通常は通らない
  if (days < 0) {
    return (
      <a className="dlbanner open" href="#rsvp">
        <div className="dl-row">
          <span className="dl-tag">出欠受付中</span>
          <span className="dl-open-msg">一次締切後も、登録・変更を受け付けています</span>
        </div>
        <span className="dl-cta">出欠を登録・変更する ▶</span>
      </a>
    );
  }

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
