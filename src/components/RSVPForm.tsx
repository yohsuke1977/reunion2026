import { useState } from 'react';
import { submitForm, loadSavedRsvp, saveRsvp, type FormData, type SavedRsvp } from '../lib/submitForm';

type SegValue = '出席' | '欠席' | '未定';

// 保存値は文字列なので、想定外の値が入っていたら未選択として扱う
const asSeg = (v?: string): SegValue | '' =>
  v === '出席' || v === '欠席' || v === '未定' ? v : '';

// 「9月8日」の形にする
function sentOn(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function RSVPForm() {
  // 同じ端末から送信済みなら、その内容を復元して「送信済み」と示す
  const [saved, setSaved] = useState<SavedRsvp | null>(() => loadSavedRsvp());
  const [name, setName] = useState(saved?.name ?? '');
  const [classOf, setClassOf] = useState(saved?.classOf ?? '');
  // 出欠は既定値を置かない。あらかじめ選ばれていると、深く考えずに
  // 送信した人まで「出席」として記録されてしまうため、必ず選んでもらう。
  const [party1, setParty1] = useState<SegValue | ''>(asSeg(saved?.party1));
  const [party2, setParty2] = useState<SegValue | ''>(asSeg(saved?.party2));
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
    if (!party1) {
      setError('一次会の出欠をお選びください');
      return;
    }
    if (!party2) {
      setError('二次会の出欠をお選びください');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data: FormData = { name, classOf, party1, party2, commentName, now, memory };
      await submitForm(data);
      setSaved(saveRsvp({ name, classOf, party1, party2 }));
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
        <p className="thanks-resend">出欠の変更やコメントの追加は何度でも送れます。</p>
        <button className="submit" style={{ marginTop: '20px' }} onClick={() => setDone(false)}>
          もう一度送信する
        </button>
      </div>
    );
  }

  return (
    <section className="form-wrap">
      <div className="deadline-band">
        <span className="deadline-label">受付中</span>
        <span className="deadline-note">一次締切後も、出欠の登録・変更を受け付けています</span>
      </div>
      {saved && (
        <div className="sent-note">
          <b>{sentOn(saved.at)}に送信済みです</b>
          <span>
            {saved.name}
            {saved.party1 && ` ／ 一次会：${saved.party1}`}
            {saved.party2 && ` ／ 二次会：${saved.party2}`}
          </span>
          <small>内容を変える場合は、下のフォームから再送信してください</small>
        </div>
      )}
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

        <p className="note">※ いただいたコメントは、当日の会場やこのページでニックネーム / 匿名にて紹介させていただく場合があります。</p>
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
  value: SegValue | '';
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
