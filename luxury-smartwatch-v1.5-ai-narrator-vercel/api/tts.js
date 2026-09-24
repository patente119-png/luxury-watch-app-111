export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST only' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'OPENAI_API_KEY가 Vercel 환경변수에 설정되지 않았습니다.'
    });
  }

  const { text, gender } = req.body || {};
  const input = String(text || '').trim();

  if (!input) {
    return res.status(400).json({ error: '읽을 편지 내용이 없습니다.' });
  }

  // 편지 앱의 과도한 비용/긴 대기 방지
  if (input.length > 1800) {
    return res.status(400).json({ error: '편지는 1800자 이하로 작성해주세요.' });
  }

  // 두 목소리를 고정해 기기와 무관하게 일관성 유지.
  // OpenAI built-in voice availability may evolve; these are current recommended-quality voices.
  const isMale = gender === 'male';
  const voice = isMale ? 'cedar' : 'marin';

  const instructions = isMale
    ? [
        'Speak in natural Korean.',
        'Warm, gentle adult male narrator with a comfortable medium-low register.',
        'Sound as if smiling softly while reading a heartfelt personal letter.',
        'Calm, sincere, affectionate, never exaggerated or comedic.',
        'Use natural pauses at punctuation and line breaks.',
        'Slightly relaxed pace and clear diction.'
      ].join(' ')
    : [
        'Speak in natural Korean.',
        'Warm, bright adult female narrator with a soft friendly smile in the voice.',
        'Read like a heartfelt personal letter, affectionate and sincere.',
        'Never exaggerated or childish.',
        'Use natural pauses at punctuation and line breaks.',
        'Gentle relaxed pace and clear diction.'
      ].join(' ');

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        voice,
        input,
        instructions,
        response_format: 'mp3'
      })
    });

    if (!response.ok) {
      const details = await response.text();
      console.error('OpenAI TTS error:', response.status, details);
      return res.status(502).json({
        error: 'AI 내레이터 생성에 실패했습니다.'
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'private, max-age=0, no-store');
    res.setHeader('X-AI-Generated-Audio', 'true');
    return res.status(200).send(buffer);

  } catch (error) {
    console.error('TTS server error:', error);
    return res.status(500).json({
      error: 'AI 내레이터 서버 오류가 발생했습니다.'
    });
  }
}
