import jsQR from 'jsqr';

export function decodeQrPixels(image) {
  return jsQR(image.data, image.width, image.height, { inversionAttempts: 'attemptBoth' })?.data ?? null;
}
function pixels(source, width, height) {
  const scale = Math.min(1, 1800 / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}
export async function readQrImage(file) {
  if (!file || file.size > 20 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('20 MB 以下の PNG・JPEG・WebP 画像を選んでください。');
  const bitmap = await createImageBitmap(file);
  try {
    const value = decodeQrPixels(pixels(bitmap, bitmap.width, bitmap.height));
    if (!value) throw new Error('QR を読み取れませんでした。QR 全体がはっきり写った画像を選んでください。');
    return value;
  } finally { bitmap.close(); }
}

export async function startQrCamera(video, { signal, onScan, onError, mediaDevices = navigator.mediaDevices, readFrame = video => decodeQrPixels(pixels(video, video.videoWidth, video.videoHeight)) }) {
  let stream, timer, stopped = false;
  const stop = () => {
    stopped = true; clearTimeout(timer);
    stream?.getTracks().forEach(track => track.stop());
    if (video.srcObject === stream) { video.pause(); video.srcObject = null; }
    signal?.removeEventListener('abort', stop);
  };
  signal?.addEventListener('abort', stop, { once: true });
  if (signal?.aborted) { stop(); return stop; }
  try {
    if (!mediaDevices?.getUserMedia) throw new Error('このブラウザーではカメラを利用できません。QR 画像か接続リンクを使ってください。');
    stream = await mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } });
    if (stopped || signal?.aborted) { stop(); return stop; }
    video.srcObject = stream; await video.play();
    if (stopped || signal?.aborted) { stop(); return stop; }
    const tick = () => {
      if (stopped) return;
      try {
        const value = video.videoWidth && video.videoHeight ? readFrame(video) : null;
        if (value) { stop(); onScan(value); return; }
        timer = setTimeout(tick, 300);
      } catch { stop(); onError(new Error('カメラから読み取れませんでした。QR 画像か接続リンクを使ってください。')); }
    };
    tick(); return stop;
  } catch (error) {
    stop();
    if (signal?.aborted) return stop;
    throw new Error(error.name === 'NotAllowedError' ? 'カメラが許可されていません。ブラウザーで許可するか、QR 画像を選んでください。' : 'カメラを開けません。QR 画像か接続リンクを使ってください。');
  }
}
