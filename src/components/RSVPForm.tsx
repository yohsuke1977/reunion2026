import { useState } from 'react';
import { submitForm, loadSavedRsvp, saveRsvp, checkName, type FormData, type SavedRsvp } from '../lib/submitForm';

type SegValue = '出席' | '欠席' | '未定';

// 保存値は文字列なので、想定外の値が入っていたら未選択として扱う
const asSeg = (v?: string): SegValue | '' =>
  v === '出席' || v === '欠席' || v === '未定' ? v : '';

// 「9月8日」の形にする
function sentOn(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : `${d.getMonth() + 1}月${d.getDate()}日`;
}

// 最終締切（10/3）を過ぎたら帯の表示を切り替える（フォーム自体は開けておく）
function isClosed(): boolean {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return today.getTime() > new Date(2026, 9, 3).getTime();
}

export default function RSVPForm() {
  const closed = isClosed();
  // 同じ端末から送信済みなら、その内容を復元して「送信済み」と示す
  const [saved, setSaved] = useState<SavedRsvp | null>(() => loadSavedRsvp());
  const [name, setName] = useState(saved?.name ?? '');
  const [classOf, setClassOf] = useState(saved?.classOf ?? '');
  // 出欠は既定値を置かない。あらかじめ選ばれていると、深く考えずに
  // 送信した人まで「出席」として記録されてしまうため、必ず選んでもらう。
  const [party1, setParty1] = useState<SegValue | ''>(asSeg(saved?.party1));
  const [party2, setParty2] = useState<SegValue | ''>(asSeg(saved?.party2));
  // 出席者一覧への掲載は同意制。前回チェックしていれば引き継ぐ
  const [listOk, setListOk] = useState(saved?.listOk === '1');
  const [commentName, setCommentName] = useState('');
  const [now, setNow] = useState('');
  const [memory, setMemory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  // 名簿との照合。名字だけ・字違いの回答を、送る前に本人に気づいてもらう
  // idle=未確認 / checking=確認中 / ok=一致 / ng=不一致 / unknown=通信できず確認できなかった
  const [nameCheck, setNameCheck] = useState<'idle' | 'checking' | 'ok' | 'ng' | 'unknown'>('idle');
  // 不一致のまま送る場合は1回だけ確認する（名簿に載っていない人も送れるように）
  const [confirmNg, setConfirmNg] = useState(false);

  async function runCheck(v: string): Promise<'ok' | 'ng' | 'unknown'> {
    if (!v.trim()) return 'unknown';
    setNameCheck('checking');
    const r = await checkName(v);
    const st = r === null ? 'unknown' : r ? 'ok' : 'ng';
    setNameCheck(st);
    return st;
  }

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
    // まだ照合していなければ、ここで確かめる
    setLoading(true);
    const st = nameCheck === 'ok' || nameCheck === 'ng' ? nameCheck : await runCheck(name);
    if (st === 'ng' && !confirmNg) {
      setLoading(false);
      setConfirmNg(true);
      setError('名簿と一致しないお名前のまま送信しますか？ 名簿に載っていない方は、このまま送信してください。');
      return;
    }
    setError('');
    try {
      const ok = listOk ? '1' : '';
      const data: FormData = { name, classOf, party1, party2, commentName, now, memory, listOk: ok };
      await submitForm(data);
      setSaved(saveRsvp({ name, classOf, party1, party2, listOk: ok }));
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
      {closed ? (
        <div className="deadline-band">
          <span className="deadline-label">受付終了</span>
          <span className="deadline-note">10/3で締め切りました。変更は幹事（LINE）へご連絡ください</span>
        </div>
      ) : (
        <div className="deadline-band">
          <span className="deadline-label">受付中</span>
          <span className="deadline-note">最終締切 10/3（土）まで、出欠の登録・変更を受け付けています</span>
        </div>
      )}
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
          <label>お名前（フルネーム / 旧姓）</label>
          <input
            type="text"
            placeholder="例）山田 太郎（旧姓 ◯◯）"
            value={name}
            onChange={e => { setName(e.target.value); setNameCheck('idle'); setConfirmNg(false); }}
            onBlur={e => { if (e.target.value.trim()) runCheck(e.target.value); }}
          />
          {nameCheck === 'ok' && <p className="namecheck ok">✓ 名簿のお名前と照合できました</p>}
          {nameCheck === 'ng' && (
            <p className="namecheck ng">
              ⚠ 名簿のお名前と一致しませんでした。名字だけでなくフルネームで入力してください。
              旧姓で名簿に載っている方は「豊島 明美（戸井）」のように両方を。
            </p>
          )}
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

        <label className="listok">
          <input type="checkbox" checked={listOk} onChange={e => setListOk(e.target.checked)} />
          <span>
            出席者一覧に名前を載せてよい
            <small>一覧は、同じく掲載OKの出席者だけが見られます（組・お名前・旧姓のみ）</small>
          </span>
        </label>

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
        {loading ? '送信中…' : confirmNg && nameCheck === 'ng' ? 'このまま送信する' : '送 信 す る'}
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
