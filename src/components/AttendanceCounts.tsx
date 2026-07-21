import { useEffect, useState } from 'react';
import { fetchCounts, type Counts } from '../lib/submitForm';

// 現在の出欠状況を集計表示。30秒ごとに再取得して「随時更新」する。
export default function AttendanceCounts() {
  const [c, setC] = useState<Counts | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetchCounts()
        .then((v) => { if (alive && v) setC(v); })
        .catch(() => {});
    load();
    const id = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!c || c.responded === 0) return null;

  return (
    <section className="counts">
      <div className="counts-lead">
        現在の出欠状況<span className="counts-live">LIVE</span>
      </div>
      <div className="counts-grid">
        <div className="cnt cnt-attend"><b>{c.attend}</b><span>出席</span></div>
        <div className="cnt cnt-undecided"><b>{c.undecided}</b><span>未定</span></div>
        <div className="cnt cnt-absent"><b>{c.absent}</b><span>欠席</span></div>
      </div>
      <p className="counts-note">
        これまでに <b>{c.responded}</b> 名が回答（自動集計・随時更新）
      </p>
    </section>
  );
}
