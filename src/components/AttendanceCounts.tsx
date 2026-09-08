import { useEffect, useState } from 'react';
import { fetchCounts, type Counts, type PartyCounts } from '../lib/submitForm';

// 現在の出欠状況を集計表示。
// GASの応答に2秒前後かかる間、カウンターはセクションごと描画されず
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

  // 一次会・二次会それぞれの3枠。ラベルは二次会が出せるときだけ添える
  const row = (label: string | null, p?: PartyCounts) => (
    <div className="counts-party">
      {label && <div className="counts-label">{label}</div>}
      <div className="counts-grid">
        <div className="cnt cnt-attend"><b>{n(p?.attend)}</b><span>出席</span></div>
        <div className="cnt cnt-undecided"><b>{n(p?.undecided)}</b><span>未定</span></div>
        <div className="cnt cnt-absent"><b>{n(p?.absent)}</b><span>欠席</span></div>
      </div>
    </div>
  );

  const two = !!c?.party2;

  return (
    <section className={c ? 'counts' : 'counts counts-loading'}>
      <div className="counts-lead">
        現在の出欠状況{c && <span className="counts-live">LIVE</span>}
      </div>
      {two
        ? <>{row('一次会', c!)}{row('二次会', c!.party2)}</>
        : row(null, c ?? undefined)}
      <p className="counts-note">
        {c
          ? <>これまでに <b>{c.responded}</b> 名が回答（自動集計・随時更新）</>
          : '集計を読み込んでいます…'}
      </p>
    </section>
  );
}
