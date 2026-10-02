export const config = {
  api: {
    bodyParser: {
      sizeLimit: '12mb'
    }
  }
};

function extensionFromMime(mime = '') {
  const m = String(mime).toLowerCase();
  if (m.includes('wav')) return 'wav';
  if (m.includes('ogg')) return 'ogg';
  if (m.includes('mp4') || m.includes('m4a')) return 'm4a';
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3';
  return 'webm';
}

export default async function handler(req, res) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      route: '/api/transcribe',
      keyConfigured: !!apiKey,
      model: 'gpt-4o-mini-transcribe'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  try {
    if (!apiKey) {
      return res.status(500).json({
        error: 'OPENAI_API_KEY is not configured',
        code: 'missing_api_key'
      });
    }

    const { audioBase64, mimeType = 'audio/webm' } = req.body || {};
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ error: 'audioBase64 is required' });
    }

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    if (!audioBuffer.length) {
      return res.status(400).json({ error: 'Empty audio' });
    }

    // Keep requests comfortably below typical serverless payload limits.
    if (audioBuffer.length > 8 * 1024 * 1024) {
      return res.status(413).json({ error: 'Audio is too large' });
    }

    const ext = extensionFromMime(mimeType);
    const form = new FormData();

    form.append(
      'file',
      new Blob([audioBuffer], { type: mimeType || 'audio/webm' }),
      `speech.${ext}`
    );
    form.append('model', 'gpt-4o-mini-transcribe');
    form.append('language', 'ko');
    form.append(
      'prompt',
      '한국어 음성입니다. 지역 사투리와 원래 말투, 고유한 표현을 표준어로 바꾸지 말고 그대로 보존하세요. 의미를 바꾸지 말고 읽기 좋게 띄어쓰기와 문장부호만 자연스럽게 정리하세요.'
    );

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: form
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('OpenAI transcription error:', data);
      return res.status(response.status).json({
        error: data?.error?.message || 'Transcription failed',
        code: data?.error?.code || data?.error?.type || 'openai_error'
      });
    }

    return res.status(200).json({
      text: String(data?.text || '').trim()
    });

  } catch (error) {
    console.error('transcribe handler error:', error);
    return res.status(500).json({ error: 'Server transcription error' });
  }
}
