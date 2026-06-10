export default function LineBand() {
  return (
    <section className="line-band">
      <div className="lh">最新情報は LINE でも</div>
      <p>会場・会費の確定や当日のご案内は、<br />LINE公式アカウントでも順次お知らせします。</p>
      <div style={{ marginTop: '16px' }}>
        <a className="lbtn" href="https://lin.ee/s4AsFK2" target="_blank" rel="noopener noreferrer">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
            <path d="M12 2C6.5 2 2 5.7 2 10.2c0 4 3.6 7.4 8.5 8 .33.07.78.22.9.5.1.26.07.66.03.92l-.14.9c-.04.26-.2 1.03.9.56s5.95-3.5 8.12-6c1.5-1.65 2.2-3.32 2.2-5.18C22.5 5.7 18 2 12 2z" />
          </svg>
          友だち追加する
        </a>
      </div>
    </section>
  );
}
