export default function Details() {
  return (
    <section className="details">
      <div className="ev">
        <div className="cap"><span className="b">一次会</span><h3>みんなで乾杯</h3></div>
        <div className="row">
          <div className="k">日時</div>
          <div className="v">
            2026年10月11日（日）
            <small>13:00 開宴（受付 12:30〜）</small>
          </div>
        </div>
        <div className="row">
          <div className="k">会場</div>
          <div className="v">
            <a className="venue-link" href="https://www.zeroforme.com/giorone/" target="_blank" rel="noopener">
              ジョルオーネ（GIORONE）
            </a>
            <small>
              神戸市中央区京町68-2 3F ／ 各線 三宮駅から徒歩7分<br />
              旧居留地のレストラン・貸切／エレベーターあり
            </small>
          </div>
        </div>
        <div className="row">
          <div className="k">会費</div>
          <div className="v">
            8,000円
            <small>
              着席ビュッフェ15品＋飲み放題（アルコールあり）込み<br />
              当日、受付にてお支払いください
            </small>
          </div>
        </div>
      </div>
      <div className="ev second">
        <div className="cap"><span className="b">二次会</span><h3>もう少しだけ、続きを</h3></div>
        <div className="row">
          <div className="k">時間</div>
          <div className="v">
            同日 16:30〜（予定）
            <small>一次会のあと、出入り自由でゆるりと</small>
          </div>
        </div>
        <div className="row">
          <div className="k">場所</div>
          <div className="v">
            一次会の近く <span className="tbd">調整中</span>
            <small>お店が決まり次第ご連絡します</small>
          </div>
        </div>
      </div>
    </section>
  );
}
