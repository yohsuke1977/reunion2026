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
            三ノ宮〜神戸エリア <span className="tbd">調整中</span>
            <small>お店が決まり次第ご連絡します</small>
          </div>
        </div>
        <div className="row">
          <div className="k">会費</div>
          <div className="v">
            8,000〜10,000円 あたりを予定 <span className="tbd">調整中</span>
            <small>当日受付にてお支払い</small>
          </div>
        </div>
      </div>
      <div className="ev second">
        <div className="cap"><span className="b">二次会</span><h3>もう少しだけ、続きを</h3></div>
        <div className="row">
          <div className="k">時間</div>
          <div className="v">
            同日 17:00〜（予定）
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
