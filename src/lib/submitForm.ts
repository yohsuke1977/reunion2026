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

  // GAS Web App は302リダイレクト後にopaque responseを返すため no-cors が必要。
  // opaque responseはステータスが読めないので、fetch自体が例外を投げなければ成功扱い。
  await fetch(endpoint, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(data),
  });
}
