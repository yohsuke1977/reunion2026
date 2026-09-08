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

export interface PartyCounts {
  attend: number;
  absent: number;
  undecided: number;
  responded: number;
}

export interface Counts extends PartyCounts {
  /** 二次会の集計。GAS側が未対応の場合は undefined になる */
  party2?: PartyCounts;
}

// 現在の出欠状況（一次会の出席/欠席/未定）を取得する。
// フォーム生回答ベースの集計なので、台帳の照合有無に関係なく全回答が数えられる。
export async function fetchCounts(): Promise<Counts | null> {
  const endpoint = import.meta.env.VITE_GAS_ENDPOINT;
  if (!endpoint) return null;

  const res = await fetch(`${endpoint}?action=counts`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.status !== 'ok') return null;
  const p2 = data.party2;
  return {
    attend:    data.attend    || 0,
    absent:    data.absent    || 0,
    undecided: data.undecided || 0,
    responded: data.responded || 0,
    party2: p2 ? {
      attend:    p2.attend    || 0,
      absent:    p2.absent    || 0,
      undecided: p2.undecided || 0,
      responded: p2.responded || 0,
    } : undefined,
  };
}

// --- 前回の送信内容を端末に覚えておく ---------------------------------
// 「送ったかどうか分からない」を防ぐのが目的。あわせて名前の表記が
// 毎回変わるのを防げるので、台帳との照合漏れ（未照合）も起きにくくなる。
// コメント欄は保存しない（同じ内容を二度投稿してしまうため）。

const RSVP_KEY = 'uochu44.rsvp.v1';

export interface SavedRsvp {
  name: string;
  classOf: string;
  party1: string;
  party2: string;
  /** 送信日時（ISO文字列） */
  at: string;
}

export function loadSavedRsvp(): SavedRsvp | null {
  try {
    const raw = localStorage.getItem(RSVP_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v || typeof v.name !== 'string' || !v.name) return null;
    return v as SavedRsvp;
  } catch {
    // プライベートモードやサイトデータ拒否の設定では読めない。従来どおりの動作に戻すだけ。
    return null;
  }
}

export function saveRsvp(v: Omit<SavedRsvp, 'at'>): SavedRsvp | null {
  const rec: SavedRsvp = { ...v, at: new Date().toISOString() };
  try {
    localStorage.setItem(RSVP_KEY, JSON.stringify(rec));
  } catch {
    // 保存できなくても送信自体は成功しているので、そのまま返す
  }
  return rec;
}
