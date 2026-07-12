export interface FormData {
  name: string;
  classOf: string;
  party1: string;
  party2: string;
  commentName: string;
  now: string;
  memory: string;
}

export async function submitForm(data: FormData): Promise<void> {
  const endpoint = import.meta.env.VITE_GAS_ENDPOINT;
  if (!endpoint) throw new Error('送信先が設定されていません');

  // GASは302リダイレクトでPOST→GETに変換されるため、最初からGETで送る。
  // no-corsのopaque responseはステータス不明なのでfetch完了をもって成功とする。
  const params = new URLSearchParams({
    name:        data.name,
    classOf:     data.classOf,
    party1:      data.party1,
    party2:      data.party2,
    commentName: data.commentName,
    now:         data.now,
    memory:      data.memory,
  });
  await fetch(`${endpoint}?${params}`, { mode: 'no-cors' });
}

export interface Comment {
  name: string;
  now: string;
  memory: string;
}

// みんなの近況セクション用にコメント一覧を取得する。
// GASは302で script.googleusercontent.com へリダイレクトし、そちらがCORS許可の
// JSONを返すため、通常のcorsモードのfetchで読み取れる。
export async function fetchComments(): Promise<Comment[]> {
  const endpoint = import.meta.env.VITE_GAS_ENDPOINT;
  if (!endpoint) return [];

  const res = await fetch(`${endpoint}?action=comments`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.status !== 'ok' || !Array.isArray(data.comments)) return [];
  return data.comments as Comment[];
}
