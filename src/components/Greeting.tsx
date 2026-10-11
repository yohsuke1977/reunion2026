import { EVENT_DONE, ATTENDED } from '../config';

export default function Greeting() {
  if (EVENT_DONE) {
    return (
      <section className="greet">
        <div className="lead">
          10年ぶりに、<br />
          <span className="v">集まれました。</span>
        </div>
        <p>2026年10月11日、{ATTENDED}名の同級生と先生にお集まりいただき、魚崎中学校44回生の同窓会を無事に開催できました。</p>
        <p>ご参加いただいた皆さま、近況を寄せてくださった皆さま、本当にありがとうございました。来られなかった方とも、またどこかでお会いできるのを楽しみにしています。</p>
      </section>
    );
  }

  return (
    <section className="greet">
      <div className="lead">
        10年ぶりに、<br />
        <span className="v">集まりませんか。</span>
      </div>
      <p>前回はあの感染症の流行で開催できず。気づけば前の同窓会から10年、私たちは揃って50歳を迎えます。</p>
      <p>人生の折り返しに、もう一度あの頃の仲間と語り合いたい——そんな思いで幹事一同、準備を進めています。お気軽にお越しください。</p>
    </section>
  );
}
