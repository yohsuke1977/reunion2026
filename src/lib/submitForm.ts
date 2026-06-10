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
