import { useEffect, useState } from 'react';
import { fetchComments, type Comment } from '../lib/submitForm';

// コメントの一般公開スイッチ。true にすると「みんなの近況」に投稿を縦スクロール表示する。
// 十分に集まってから公開する運用のため、当面は false（Coming Soon 表示）のまま。
const COMMENTS_PUBLIC = false;

export default function Voices() {
  const [comments, setComments] = useState<Comment[] | null>(null);

  useEffect(() => {
    if (!COMMENTS_PUBLIC) return;
    let alive = true;
    fetchComments()
      .then((list) => { if (alive) setComments(list); })
      .catch(() => { if (alive) setComments([]); });
    return () => { alive = false; };
  }, []);

  // コメントが1件以上あれば縦スクロールで表示、無ければ「近日公開」表示
  if (COMMENTS_PUBLIC && comments && comments.length > 0) {
    // -50%スクロールでシームレスにループさせるため、同じ列を2周ぶん並べる
    const loop = [...comments, ...comments];
    return (
      <section className="voices">
        <div className="voices-viewport">
          <div className="voices-track">
            {loop.map((c, i) => (
              <article className="vcard" key={i} aria-hidden={i >= comments.length}>
                <div className="vname">{c.name}</div>
                {c.now && <p className="vnow">{c.now}</p>}
                {c.memory && <p className="vmemory">{c.memory}</p>}
              </article>
            ))}
          </div>
        </div>
        <p className="snote">※ 上の「② コメントを投稿」からお寄せいただけます。</p>
      </section>
    );
  }

  return (
    <section className="soon">
      <span className="badge">近 日 公 開 予 定</span>
      <p>みなさんからの近況・思い出が集まり次第、<br />ここで縦スクロールでご紹介していきます。<br />当日の会場でも、何らかの形で公開するかも？</p>
      <div className="skel" aria-hidden="true">
        <div className="sk"><div className="l1"></div><div className="l2"></div><div className="l3"></div></div>
        <div className="sk"><div className="l1"></div><div className="l2"></div><div className="l3"></div></div>
        <div className="sk"><div className="l1"></div><div className="l2"></div><div className="l3"></div></div>
      </div>
      <p className="snote">※ 上の「② コメントを投稿」からお寄せいただけます。</p>
    </section>
  );
}
