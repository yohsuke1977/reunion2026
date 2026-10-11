// 会計報告。2026年10月11日の開催後に、予告から実際の収支に置き換えた。
// 二次会は当日のお会計を参加者で精算したため、明細は載せない（幹事の判断）。
const yen = (v: number) => `${v.toLocaleString('ja-JP')}円`;

const ATTEND = 29;
const FEE = 8000;
const VENUE = 7700;
const INCOME = FEE * ATTEND;
const VENUE_TOTAL = VENUE * ATTEND;
const TO_PARTY2 = INCOME - VENUE_TOTAL;

export default function AccountingNote() {
  return (
    <section className="report">
      <div className="report-box">
        <p className="report-main">一次会の収支をご報告します</p>
        <p className="report-sub">2026年10月11日（日）開催・出席 {ATTEND}名</p>

        <table className="report-table">
          <tbody>
            <tr className="report-head"><th colSpan={2}>収入</th></tr>
            <tr>
              <td>会費<small>{yen(FEE)} × {ATTEND}名</small></td>
              <td className="num">{yen(INCOME)}</td>
            </tr>
            <tr className="report-head"><th colSpan={2}>支出</th></tr>
            <tr>
              <td>
                会場費（ジョルオーネ）
                <small>{yen(VENUE)} × {ATTEND}名・お料理、飲み放題、設備込み</small>
              </td>
              <td className="num">{yen(VENUE_TOTAL)}</td>
            </tr>
            <tr>
              <td>二次会の費用にあてる<small>会費と会場費の差額</small></td>
              <td className="num">{yen(TO_PARTY2)}</td>
            </tr>
            <tr className="report-total">
              <td>残金</td>
              <td className="num">0円</td>
            </tr>
          </tbody>
        </table>

        <p className="report-note">
          差額の{yen(TO_PARTY2)}は、全額を二次会のお支払いにあてました。<br />
          ご参加いただいた皆さま、ありがとうございました。
        </p>
      </div>
    </section>
  );
}
