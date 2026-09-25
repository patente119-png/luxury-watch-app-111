export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST only' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY가 설정되지 않았습니다.' });
  }

  try {
    const {
      text,
      gender = 'female',
      mood = 'warm'
    } = req.body || {};

    const input = String(text || '').trim().slice(0, 1800);
    if (!input) return res.status(400).json({ error: '읽을 편지 내용이 없습니다.' });

    const isMale = gender === 'male';
    const voice = isMale ? 'cedar' : 'marin';

    const moodGuide = {
      warm: [
        'Warm, affectionate, sincere, reassuring.',
        'A gentle audible smile, but no laughter or exaggerated cheerfulness.',
        'Natural emotional lift on affectionate phrases.'
      ].join(' '),
      calm: [
        'Calm, low-key, composed, intimate, and reflective.',
        'Very natural breathing and comfortable pauses.',
        'Avoid dramatic emphasis; keep emotion subtle and deep.'
      ].join(' '),
      bright: [
        'Bright, optimistic, friendly, and gently energetic.',
        'A clear smile in the voice without sounding childish or overly cute.',
        'Slightly livelier pacing while staying elegant.'
      ].join(' ')
    }[mood] || '';

    const base = isMale
      ? [
          'Speak natural Korean like an experienced professional male voice actor narrating a premium personal letter.',
          'Use a mature, warm medium-low register, clean diction, relaxed breath support, and intimate microphone distance.',
          'Sound human and conversational rather than synthetic, announcer-like, theatrical, or overly polished.',
          'Use realistic phrasing: short pauses at commas, a fuller pause at sentence endings, and subtle changes in emphasis.',
          'Never over-act, never shout, never sing, never imitate a specific real person.',
          'Maintain consistent character and vocal tone from start to finish.'
        ].join(' ')
      : [
          'Speak natural Korean like an experienced professional female voice actor narrating a premium personal letter.',
          'Use a warm, clear, mature tone with soft resonance, clean diction, relaxed breathing, and intimate microphone distance.',
          'Sound human and conversational rather than synthetic, announcer-like, theatrical, childish, or overly cute.',
          'Use realistic phrasing: short pauses at commas, a fuller pause at sentence endings, and subtle changes in emphasis.',
          'Never over-act, never shout, never sing, never imitate a specific real person.',
          'Maintain consistent character and vocal tone from start to finish.'
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
        instructions: `${base} ${moodGuide}`,
        response_format: 'mp3',
        speed: mood === 'calm' ? 0.90 : (mood === 'bright' ? 0.98 : 0.94)
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('OpenAI TTS error:', response.status, detail);
      return res.status(response.status).json({ error: '전문 성우 AI 음성 생성에 실패했습니다.' });
    }

    const audio = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(audio);

  } catch (err) {
    console.error('TTS server error:', err);
    return res.status(500).json({ error: 'AI 성우 음성 생성 중 서버 오류가 발생했습니다.' });
  }
}
