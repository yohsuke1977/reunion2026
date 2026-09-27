import { useEffect, useState } from 'react';
import { fetchMembers, loadSavedRsvp, RSVP_SAVED_EVENT, type Member, type SavedRsvp } from '../lib/submitForm';

// 出席者一覧。名簿掲載に同意した出席者どうしで見せ合う。
// 同じ端末から「一次会 出席・掲載OK」で送信した人にだけ開くボタンを出す。
// それ以外の人には一覧の存在自体を見せない（出席だが未同意の人には案内だけ出す）。
// 名前は開いたときに初めて取りに行く（ページ本体に名前を載せない）。
export default function MemberList() {
  const [saved, setSaved] = useState<SavedRsvp | null>(() => loadSavedRsvp());
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<'idle' | 'loading' | 'error' | 'denied' | 'ok'>('idle');
  const [members, setMembers] = useState<Member[]>([]);

  // フォームから送信されたら、保存内容を読み直す（閉じて取り直し）
  useEffect(() => {
    const onSaved = () => { setSaved(loadSavedRsvp()); setOpen(false); setState('idle'); };
    window.addEventListener(RSVP_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(RSVP_SAVED_EVENT, onSaved);
  }, []);

  if (!saved || saved.party1 !== '出席') return null;

  if (saved.listOk !== '1') {
    return (
      <p className="members-hint">
        フォームで「出席者一覧に名前を載せてよい」にチェックして送信すると、
        出席予定の方の一覧が見られます。
      </p>
    );
  }

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && state !== 'ok') {
      setState('loading');
      fetchMembers(saved.name)
        .then(r => { setMembers(r.members); setState(r.allowed ? 'ok' : 'denied'); })
        .catch(() => setState('error'));
    }
  };

  return (
    <section className="members">
      <button className="members-toggle" onClick={toggle} aria-expanded={open}>
        {open ? '▲' : '▼'} 出席予定の方を見る
        {state === 'ok' && <span className="members-count">（掲載OKの方 {members.length}名）</span>}
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
                {m.name}
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
