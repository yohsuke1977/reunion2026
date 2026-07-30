// 会計報告の予告セクション。開催後、ここが実際の収支報告に置き換わる。
export default function AccountingNote() {
  return (
    <section className="report">
      <div className="report-box">
        <p className="report-main">
          会費の収支は、開催後にこのページで公開します。
        </p>
        <p className="report-sub">
          領収書にもとづき、収入・支出をすべてご報告します。<br />
          余剰金は、次回の同窓会の準備金として繰り越す予定です。
        </p>
      </div>
    </section>
  );
}
