/* ===== 유틸리티 모듈 ===== */

const Utils = {
  /* --- localStorage 래퍼 --- */
  getJSON(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  },

  setJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // 저장 실패 무시 (private browsing 등)
    }
  },

  /* --- 스탬프 관리 --- */
  getStamps() {
    return this.getJSON('hola_stamps', { arrival: 0, explore: 0, local: 0 });
  },

  addStamp(stage) {
    const stamps = this.getStamps();
    stamps[stage] = (stamps[stage] || 0) + 1;
    this.setJSON('hola_stamps', stamps);
    return stamps;
  },

  /* --- 오답 노트 관리 --- */
  getWrongNotes() {
    return this.getJSON('hola_wrong', []);
  },

  addWrongNote(note) {
    const notes = this.getWrongNotes();
    // 중복 방지 (같은 스페인어 문장)
    if (!notes.find(n => n.es === note.es)) {
      notes.unshift(note); // 최신 항목을 앞에
      if (notes.length > 30) notes.pop(); // 최대 30개
      this.setJSON('hola_wrong', notes);
    }
    return notes;
  },

  clearWrongNotes() {
    this.setJSON('hola_wrong', []);
  },

  /* --- TTS (Text-to-Speech) --- */
  speak(text, lang) {
    if (!('speechSynthesis' in window)) return false;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang || 'es-ES';
    utter.rate = 0.85;
    utter.pitch = 1;
    window.speechSynthesis.speak(utter);
    return true;
  },

  /* --- STT (Speech-to-Text) --- */
  createRecognition(lang) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    const recognition = new SpeechRecognition();
    recognition.lang = lang || 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    return recognition;
  },

  /* --- 발음 비교 (단어별 상세 비교) --- */
  comparePronunciation(original, spoken) {
    const normalize = (s) => s.toLowerCase()
      .replace(/[¿?¡!.,;:'"]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const a = normalize(original);
    const b = normalize(spoken);

    const wordsA = a.split(' ');
    const wordsB = b.split(' ');

    // 단어별 매칭 결과
    const wordResults = wordsA.map(w => ({
      word: w,
      correct: wordsB.includes(w)
    }));

    const matches = wordResults.filter(r => r.correct).length;
    const score = Math.round((matches / Math.max(wordsA.length, 1)) * 100);

    let label, cls;
    if (score === 100) { label = '완벽해요! 🎉'; cls = 'good'; }
    else if (score >= 70) { label = '잘했어요! 👏'; cls = 'good'; }
    else if (score >= 40) { label = '조금 더 연습해봐요 💪'; cls = 'fair'; }
    else { label = '다시 도전해봐요! 🔄'; cls = 'poor'; }

    // 틀린 단어 목록
    const wrongWords = wordResults.filter(r => !r.correct).map(r => r.word);

    return { score, label, cls, wordResults, wrongWords };
  },

  /* --- 단계 정보 --- */
  stageInfo: {
    arrival: { icon: '✈️', label: '도착', level: 'A1' },
    explore: { icon: '🚶', label: '현지 탐험', level: 'A2-B1' },
    local:   { icon: '🏠', label: '현지인', level: 'B2+' }
  },

  /* --- API 호출 --- */
  async fetchSentence(stage, word) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const body = { stage };
      if (word) body.word = word;

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '서버 오류가 발생했어요 (' + res.status + ')');
      }

      return await res.json();
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('응답이 너무 오래 걸려요. 잠시 후 다시 시도해주세요.');
      }
      throw err;
    }
  },

  /* --- 번역 API 호출 --- */
  async translateKorean(text) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'translate', text }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '번역 오류가 발생했어요 (' + res.status + ')');
      }

      return await res.json();
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('응답이 너무 오래 걸려요. 잠시 후 다시 시도해주세요.');
      }
      throw err;
    }
  }
};
