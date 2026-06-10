import { useState } from 'react';
import { submitForm, type FormData } from '../lib/submitForm';

type SegValue = '出席' | '欠席' | '未定';

export default function RSVPForm() {
  const [name, setName] = useState('');
  const [classOf, setClassOf] = useState('');
  const [party1, setParty1] = useState<SegValue>('出席');
  const [party2, setParty2] = useState<SegValue>('未定');
  const [commentName, setCommentName] = useState('');
  const [now, setNow] = useState('');
  const [memory, setMemory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      setError('お名前（本名）をご記入ください');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data: FormData = { name, classOf, party1, party2, commentName, now, memory };
      await submitForm(data);
      setDone(true);
    } catch {
      setError('送信に失敗しました。しばらくしてから再度お試しください。');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="thanks">
        <div className="big">ありがとうございます</div>
        <p>ご登録ありがとうございました。<br />当日お会いできるのを楽しみにしています。</p>
        <p className="thanks-resend">出欠の変更やコメントの追加は、<br />何度でも再送信できます。</p>
      </div>
    );
  }

  return (
    <section className="form-wrap">
      <div className="deadline-band">
        <span className="deadline-label">一次締め切り</span>
        <span className="deadline-date">7月31日（金）</span>
      </div>
      <div className="formcard">
        <div className="fmhd">
          <span className="fmno">①</span>出欠の登録
          <span className="fmsub">参加者の管理に使うため、お名前は本名でお願いします</span>
        </div>

        <div className="fld">
          <label>お名前（本名 / 旧姓）</label>
          <input
            type="text"
            placeholder="例）山田 太郎（旧姓 ◯◯）"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="fld">
          <label>3年時のクラス <span className="opt">任意</span></label>
          <div className="selwrap">
            <select value={classOf} onChange={e => setClassOf(e.target.value)}>
              <option value="">選択してください</option>
              <option>1組</option>
              <option>2組</option>
              <option>3組</option>
              <option>4組</option>
              <option>5組</option>
              <option>6組</option>
              <option>7組</option>
              <option>わからない</option>
            </select>
          </div>
        </div>

        <div className="fld">
          <label>一次会の出欠</label>
          <SegControl value={party1} onChange={setParty1} options={['出席', '欠席', '未定']} variant="navy" />
        </div>

        <div className="fld">
          <label>二次会の出欠</label>
          <SegControl value={party2} onChange={setParty2} options={['出席', '欠席', '未定']} variant="verm" />
        </div>

        <p className="note">※ お名前・クラス・ご連絡先は、同窓会の運営目的のみに使用します。</p>
      </div>

      <div className="formcard">
        <div className="fmhd">
          <span className="fmno">②</span>コメントを投稿
          <span className="fmsub">こちらはすべて任意です。匿名・ニックネームでOK、「みんなの近況」で紹介します</span>
        </div>

        <div className="fld">
          <label>お名前 <span className="opt">任意・匿名/ニックネーム可</span></label>
          <input
            type="text"
            placeholder="例）やまちゃん／匿名希望"
            value={commentName}
            onChange={e => setCommentName(e.target.value)}
          />
        </div>

        <div className="fld">
          <label>今、何してる？ <span className="opt">任意</span></label>
          <textarea
            placeholder="お仕事・住んでる場所・最近ハマってること など"
            value={now}
            onChange={e => setNow(e.target.value)}
          />
        </div>

        <div className="fld">
          <label>当時の思い出 / 最近の悩み <span className="opt">任意</span></label>
          <textarea
            placeholder="懐かしい思い出や、いま誰かに聞いてほしいこと"
            value={memory}
            onChange={e => setMemory(e.target.value)}
          />
        </div>

        <p className="note">
          ※ いただいたコメントは、当日の会場やこのページで<br />
          ニックネーム / 匿名にて紹介させていただく場合があります。
        </p>
      </div>

      {error && <p className="error-msg">{error}</p>}

      <button className="submit" onClick={handleSubmit} disabled={loading}>
        {loading ? '送信中…' : '送 信 す る'}
      </button>
      <p className="note" style={{ marginTop: '12px' }}>
        ※ 出欠の変更やコメントの追加は、何度でも再送信できます。
      </p>
    </section>
  );
}

interface SegProps {
  value: SegValue;
  onChange: (v: SegValue) => void;
  options: SegValue[];
  variant: 'navy' | 'verm';
}

function SegControl({ value, onChange, options, variant }: SegProps) {
  return (
    <div className={`seg${variant === 'verm' ? ' verm' : ''}`}>
      {options.map(opt => (
        <div
          key={opt}
          className={`opt-btn${value === opt ? ' on' : ''}`}
          onClick={() => onChange(opt)}
        >
          {opt}
        </div>
      ))}
    </div>
  );
}
