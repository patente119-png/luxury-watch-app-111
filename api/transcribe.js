export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      route: '/api/transcribe',
      keyConfigured: !!process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini-transcribe',
      version: '2.8.3'
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'GET/POST only' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'OPENAI_API_KEY is not configured',
      code: 'missing_api_key'
    });
  }

  try {
    let body = req.body || {};

    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON body', code: 'invalid_json' });
      }
    }

    const audioBase64 = body?.audioBase64;
    const mimeType = body?.mimeType || 'audio/webm';

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ error: 'audioBase64 is required', code: 'missing_audio' });
    }

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    if (!audioBuffer.length) {
      return res.status(400).json({ error: 'Empty audio', code: 'empty_audio' });
    }

    if (audioBuffer.length > 4 * 1024 * 1024) {
      return res.status(413).json({
        error: 'Audio is too large. Keep speech under about 45 seconds.',
        code: 'audio_too_large'
      });
    }

    const mime = String(mimeType).toLowerCase();
    let ext = 'webm';
    if (mime.includes('wav')) ext = 'wav';
    else if (mime.includes('ogg')) ext = 'ogg';
    else if (mime.includes('mp4') || mime.includes('m4a')) ext = 'm4a';
    else if (mime.includes('mpeg') || mime.includes('mp3')) ext = 'mp3';

    // Blob/FormData를 전혀 사용하지 않고 multipart/form-data를 직접 구성.
    // 일부 Vercel 런타임에서 Blob/FormData 생성 단계에서 함수가 죽는 문제를 회피한다.
    const boundary = '----TimeRelayBoundary' + Date.now().toString(16);

    const fields = [
      ['model', 'gpt-4o-mini-transcribe'],
      ['language', 'ko'],
      ['prompt', '한국어 음성입니다. 지역 사투리와 원래 말투, 고유한 표현은 표준어로 바꾸지 말고 유지하세요. 의미를 바꾸지 말고 띄어쓰기와 문장부호만 읽기 좋게 정리하세요.']
    ];

    const chunks = [];

    for (const [name, value] of fields) {
      chunks.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${name}"\r\n\r\n` +
        `${value}\r\n`
      ));
    }

    chunks.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="speech.${ext}"\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`
    ));
    chunks.push(audioBuffer);
    chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`));

    const multipartBody = Buffer.concat(chunks);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(multipartBody.length)
      },
      body: multipartBody
    });

    const raw = await response.text();
    let data = {};
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw };
    }

    if (!response.ok) {
      console.error('OpenAI transcription error:', response.status, data);
      return res.status(response.status).json({
        error: data?.error?.message || `OpenAI transcription failed (${response.status})`,
        code: data?.error?.code || data?.error?.type || 'openai_error'
      });
    }

    return res.status(200).json({
      text: String(data?.text || '').trim()
    });

  } catch (error) {
    console.error('transcribe handler error:', error);
    return res.status(500).json({
      error: error?.message || 'Server transcription error',
      code: 'server_error'
    });
  }
}
