import { useEffect, useState } from 'react';
import { fetchMembers, loadSavedRsvp, RSVP_SAVED_EVENT, type Member, type SavedRsvp } from '../lib/submitForm';

// 出席者一覧。名簿掲載に同意した出席者どうしで見せ合う。
// 同じ端末から「一次会 出席・掲載OK」で送信した人にだけ開くボタンを出す。
// それ以外の人には一覧の存在自体を見せない（出席だが未同意の人には案内だけ出す）。
// 名前はページ本体に載せず、掲載OKの人の端末でだけ後から取りに行く（検索エンジンに拾われない）。
export default function MemberList() {
  const [saved, setSaved] = useState<SavedRsvp | null>(() => loadSavedRsvp());
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<'idle' | 'loading' | 'error' | 'denied' | 'ok'>('idle');
  const [members, setMembers] = useState<Member[]>([]);

  const eligible = !!saved && saved.party1 === '出席' && saved.listOk === '1';

  // 掲載OKの出席者だけ、開く前に一覧を取っておく（ボタンに人数を出すため）。
  // 未同意の人・部外者の端末ではそもそも取りに行かない。
  useEffect(() => {
    if (!eligible || !saved) return;
    let alive = true;
    setState('loading');
    fetchMembers(saved.name)
      .then(r => { if (alive) { setMembers(r.members); setState(r.allowed ? 'ok' : 'denied'); } })
      .catch(() => { if (alive) setState('error'); });
    return () => { alive = false; };
  }, [eligible, saved]);

  // フォームから送信されたら、保存内容を読み直す（閉じて取り直し）
  useEffect(() => {
    const onSaved = () => { setSaved(loadSavedRsvp()); setOpen(false); setState('idle'); };
    window.addEventListener(RSVP_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(RSVP_SAVED_EVENT, onSaved);
  }, []);

  if (!saved || saved.party1 !== '出席') return null;

  if (saved.listOk !== '1') {
    return (
      <div className="members-hint">
        <b>出席予定の方の一覧が見られます</b>
        <span>下のフォームで「出席者一覧に名前を載せてよい」にチェックして送信してください。</span>
      </div>
    );
  }

  const toggle = () => {
    const next = !open;
    setOpen(next);
    // 先読みに失敗していたら、開いたときに取り直す
    if (next && (state === 'error' || state === 'idle')) {
      setState('loading');
      fetchMembers(saved.name)
        .then(r => { setMembers(r.members); setState(r.allowed ? 'ok' : 'denied'); })
        .catch(() => setState('error'));
    }
  };

  return (
    <section className="members">
      <button className={`members-toggle${open ? ' on' : ''}`} onClick={toggle} aria-expanded={open}>
        <span className="members-title">出席予定の方を見る</span>
        <span className="members-meta">
          {state === 'ok' && <span className="members-count">{members.length}名</span>}
          <span className="members-chev" aria-hidden="true">{open ? '▲' : '▼'}</span>
        </span>
      </button>
      {open && (
        <div className="members-body">
          {state === 'loading' && <p className="members-note">読み込んでいます…</p>}
          {state === 'error' && <p className="members-note">読み込めませんでした。少し時間をおいて開き直してください。</p>}
          {state === 'denied' && (
            <p className="members-note">
              名簿との照合がまだ済んでいないため表示できません。幹事が確認しだい見られるようになります。
            </p>
          )}
          {state === 'ok' && <Groups members={members} />}
        </div>
      )}
    </section>
  );
}

// 組ごとにまとめて表示（1組〜7組、そのあと組不明）
function Groups({ members }: { members: Member[] }) {
  const order = (c: string) => {
    const m = c.match(/(\d+)/);
    return m ? Number(m[1]) : 99;
  };
  const byCls = new Map<string, Member[]>();
  for (const m of members) {
    const key = m.cls || '組不明';
    if (!byCls.has(key)) byCls.set(key, []);
    byCls.get(key)!.push(m);
  }
  const keys = [...byCls.keys()].sort((a, b) => order(a) - order(b));

  return (
    <dl className="members-list">
      {keys.map(k => (
        <div className="members-row" key={k}>
          <dt>{k}</dt>
          <dd>
            {byCls.get(k)!.map((m, i) => (
              <span className="member" key={i}>
                {/* 名前の中の全角スペースは詰める（名前どうしの間と区別がつかなくなるため） */}
                {m.name.replace(/[\s\u3000]+/g, ' ')}
                {m.old && <span className="member-old">（{m.old}）</span>}
                {m.party2 && <span className="member-p2">二次会も</span>}
              </span>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}
