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
          余剰金が出た場合の使いみちも、あわせてご報告します。
        </p>
      </div>
    </section>
  );
}
