import { useEffect, useState } from 'react';
import { fetchCounts, type Counts } from '../lib/submitForm';

// 現在の出欠状況を集計表示。
// GASの応答に2秒前後かかるため、取得できるまでセクションごと消えると
// 「表示されていない」ように見える。枠と見出しは常に出し、中身だけを
// プレースホルダにしておく。取得に失敗しても間隔を伸ばしながら再試行する。
export default function AttendanceCounts() {
  const [c, setC] = useState<Counts | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: number | undefined;

    const RETRIES = [3_000, 8_000, 20_000]; // 失敗時の再試行間隔
    const REFRESH = 60_000;                 // 取得できたあとの更新間隔
    let fails = 0;

    const schedule = (ms: number) => { timer = window.setTimeout(load, ms); };
    const retry = () => schedule(RETRIES[Math.min(fails++, RETRIES.length - 1)]);

    const load = () => {
      fetchCounts()
        .then((v) => {
          if (!alive) return;
          if (v && v.responded > 0) {
            setC(v);
            fails = 0;
            schedule(REFRESH);
          } else {
            retry();
          }
        })
        .catch(() => { if (alive) retry(); });
    };

    load();
    return () => { alive = false; if (timer) window.clearTimeout(timer); };
  }, []);

  const n = (v: number | undefined) => (c ? String(v) : '—');

  return (
    <section className={c ? 'counts' : 'counts counts-loading'}>
      <div className="counts-lead">
        現在の出欠状況{c && <span className="counts-live">LIVE</span>}
      </div>
      <div className="counts-grid">
        <div className="cnt cnt-attend"><b>{n(c?.attend)}</b><span>出席</span></div>
        <div className="cnt cnt-undecided"><b>{n(c?.undecided)}</b><span>未定</span></div>
        <div className="cnt cnt-absent"><b>{n(c?.absent)}</b><span>欠席</span></div>
      </div>
      <p className="counts-note">
        {c
          ? <>これまでに <b>{c.responded}</b> 名が回答（自動集計・随時更新）</>
          : '集計を読み込んでいます…'}
      </p>
    </section>
  );
}
