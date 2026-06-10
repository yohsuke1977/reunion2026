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

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error(`送信エラー: ${res.status}`);
}
