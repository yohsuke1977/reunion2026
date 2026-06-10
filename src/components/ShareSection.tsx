import { useState } from 'react';

const SITE_URL = 'https://uochu44.vercel.app';

export default function ShareSection() {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(SITE_URL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <section className="share-band">
      <div className="share-lead">同級生に教えてください</div>
      <p>このページのURLを、連絡の取れる同級生にできるだけ多く広めてください。<br />LINEやSNSでのシェアも大歓迎です。</p>
      <div className="share-url-wrap">
        <span className="share-url">{SITE_URL}</span>
        <button className="copy-btn" onClick={handleCopy}>
          {copied ? '✓ コピー完了' : 'URLをコピー'}
        </button>
      </div>
    </section>
  );
}
