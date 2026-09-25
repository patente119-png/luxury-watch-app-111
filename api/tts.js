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

  try {
    const { text, gender = 'female', style = 'smiling' } = req.body || {};
    const input = String(text || '').trim().slice(0, 1800);

    if (!input) {
      return res.status(400).json({ error: '읽을 편지 내용이 없습니다.' });
    }

    const isMale = gender === 'male';
    const voice = isMale ? 'cedar' : 'marin';

    const instructions = isMale
      ? [
          'Speak natural Korean as a warm adult male reading a personal letter to someone he cares about.',
          'Sound as if you are genuinely smiling while speaking: a soft audible smile, slightly brighter resonance, gentle upward warmth, relaxed cheeks, and friendly eyes in the voice.',
          'Keep the smile present throughout the sentence, especially at greetings and affectionate phrases.',
          'Use a calm medium-low register, intimate distance, clear diction, and natural breathing.',
          'Pace should be relaxed and conversational, around 0.92x normal speed.',
          'Add small natural pauses at commas and sentence endings.',
          'Do not laugh, giggle, act comedic, sound like an announcer, or exaggerate emotion.',
          'The result should feel sincere, affectionate, reassuring, and softly smiling.'
        ].join(' ')
      : [
          'Speak natural Korean as a warm adult female reading a heartfelt personal letter.',
          'Sound as if you are genuinely smiling while speaking: a clearly audible but gentle smile, bright warm resonance, relaxed cheeks, and friendly eyes in the voice.',
          'Keep the smile present throughout the sentence, especially at greetings and affectionate phrases.',
          'Use a soft, clear, intimate conversational tone with natural breathing.',
          'Pace should be relaxed and slightly lively, around 0.96x normal speed.',
          'Add small natural pauses at commas and sentence endings.',
          'Do not giggle, sound childish, theatrical, overly cute, or like an announcer.',
          'The result should feel sincere, affectionate, comforting, and naturally smiling.'
        ].join(' ');

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
        response_format: 'mp3',
        speed: isMale ? 0.92 : 0.96
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI TTS error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'AI 미소 음성 생성에 실패했습니다.'
      });
    }

    const audio = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(audio);

  } catch (error) {
    console.error('TTS server error:', error);
    return res.status(500).json({
      error: 'AI 미소 음성 생성 중 서버 오류가 발생했습니다.'
    });
  }
}
