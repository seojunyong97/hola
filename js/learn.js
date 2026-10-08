/* ===== 학습 모듈 ===== */

const Learn = {
  currentStage: null,
  currentSentence: null,
  recognition: null,
  isRecording: false,
  recentSentences: [],  // 최근 문장 기록 (중복 방지)

  init() {
    // 단계 버튼
    document.querySelectorAll('.stage-btn').forEach(btn => {
      btn.addEventListener('click', () => this.selectStage(btn.dataset.stage));
    });

    // 컨트롤 버튼
    document.getElementById('backToStage').addEventListener('click', () => this.showStageSelector());
    document.getElementById('listenBtn').addEventListener('click', () => this.listenSentence());
    document.getElementById('micBtn').addEventListener('click', () => this.toggleRecording());
    document.getElementById('nextBtn').addEventListener('click', () => this.loadSentence());
    document.getElementById('retryBtn').addEventListener('click', () => this.loadSentence());
    document.getElementById('wordDetailClose').addEventListener('click', () => this.closeWordDetail());
    document.getElementById('wordListenBtn').addEventListener('click', () => this.listenWord());

    // 번역 기능
    document.getElementById('translateBtn').addEventListener('click', () => this.doTranslate());
    document.getElementById('translateInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.doTranslate();
    });
    document.getElementById('translateListenBtn').addEventListener('click', () => this.listenTranslation());
    document.getElementById('translateMicBtn').addEventListener('click', () => this.toggleTranslateRecording());
  },

  /* --- 단계 선택 --- */
  selectStage(stage) {
    this.currentStage = stage;
    const info = Utils.stageInfo[stage];

    document.getElementById('stageSelector').style.display = 'none';
    document.getElementById('learnArea').style.display = 'block';
    document.getElementById('currentStageBadge').textContent = info.icon + ' ' + info.label + ' (' + info.level + ')';

    this.loadSentence();
  },

  showStageSelector() {
    document.getElementById('stageSelector').style.display = 'block';
    document.getElementById('learnArea').style.display = 'none';
    this.closeWordDetail();
    this.hidePronResult();
  },

  /* --- 문장 로드 (중복 시 최대 3회 재시도) --- */
  async loadSentence(word) {
    this.showLoading();
    this.closeWordDetail();
    this.hidePronResult();

    const MAX_RETRY = 3;
    let attempt = 0;
    let data = null;

    try {
      while (attempt < MAX_RETRY) {
        data = await Utils.fetchSentence(this.currentStage, word);
        // 최근 문장과 겹치지 않으면 OK
        if (!this.recentSentences.includes(data.sentence)) break;
        attempt++;
      }

      // 최근 목록에 추가 (최대 20개 유지)
      this.recentSentences.push(data.sentence);
      if (this.recentSentences.length > 20) this.recentSentences.shift();

      this.currentSentence = data;
      this.showSentence(data);

      // 스탬프 추가
      const stamps = Utils.addStamp(this.currentStage);
      Passport.updateStamps(stamps);
    } catch (err) {
      this.showError(err.message);
    }
  },

  /* --- UI 상태 --- */
  showLoading() {
    document.getElementById('sentenceLoading').style.display = 'block';
    document.getElementById('sentenceContent').style.display = 'none';
    document.getElementById('sentenceError').style.display = 'none';
    document.getElementById('learnControls').style.display = 'none';
  },

  showSentence(data) {
    document.getElementById('sentenceLoading').style.display = 'none';
    document.getElementById('sentenceContent').style.display = 'block';
    document.getElementById('sentenceError').style.display = 'none';
    document.getElementById('learnControls').style.display = 'flex';

    // 스페인어 문장 — 단어별 클릭 가능하게
    const esEl = document.getElementById('sentenceEs');
    esEl.innerHTML = '';
    const words = data.sentence.split(/\s+/);
    words.forEach((w, i) => {
      const span = document.createElement('span');
      span.className = 'word';
      span.textContent = w;
      span.addEventListener('click', () => this.onWordClick(w));
      esEl.appendChild(span);
      if (i < words.length - 1) esEl.appendChild(document.createTextNode(' '));
    });

    document.getElementById('sentenceKo').textContent = data.translation;
    document.getElementById('sentenceHint').textContent = data.hint || '';
  },

  showError(msg) {
    document.getElementById('sentenceLoading').style.display = 'none';
    document.getElementById('sentenceContent').style.display = 'none';
    document.getElementById('sentenceError').style.display = 'block';
    document.getElementById('learnControls').style.display = 'none';
    document.getElementById('errorMessage').textContent = msg;
  },

  /* --- 듣기 --- */
  listenSentence() {
    if (!this.currentSentence) return;
    if (!Utils.speak(this.currentSentence.sentence, 'es-ES')) {
      alert('이 브라우저에서는 음성 재생을 지원하지 않아요.');
    }
  },

  /* --- 발음 체크 --- */
  toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  },

  startRecording() {
    const recognition = Utils.createRecognition('es-ES');
    if (!recognition) {
      alert('이 브라우저에서는 음성 인식을 지원하지 않아요.\nChrome 브라우저를 사용해주세요.');
      return;
    }

    this.recognition = recognition;
    this.isRecording = true;

    const micBtn = document.getElementById('micBtn');
    micBtn.classList.add('recording');
    micBtn.innerHTML = '<span>⏹️</span> 녹음 중...';

    recognition.onresult = (e) => {
      const spoken = e.results[0][0].transcript;
      this.showPronResult(spoken);
    };

    recognition.onerror = (e) => {
      this.stopRecordingUI();
      if (e.error === 'no-speech') {
        alert('음성이 감지되지 않았어요. 다시 시도해주세요.');
      } else if (e.error !== 'aborted') {
        alert('음성 인식 오류: ' + e.error);
      }
    };

    recognition.onend = () => {
      this.stopRecordingUI();
    };

    recognition.start();
  },

  stopRecording() {
    if (this.recognition) {
      this.recognition.stop();
    }
    this.stopRecordingUI();
  },

  stopRecordingUI() {
    this.isRecording = false;
    const micBtn = document.getElementById('micBtn');
    micBtn.classList.remove('recording');
    micBtn.innerHTML = '<span>🎤</span> 말하기';
  },

  showPronResult(spoken) {
    if (!this.currentSentence) return;

    const result = Utils.comparePronunciation(this.currentSentence.sentence, spoken);

    document.getElementById('pronResult').style.display = 'block';
    document.getElementById('pronText').textContent = '"' + spoken + '"';
    const scoreEl = document.getElementById('pronScore');
    scoreEl.textContent = result.label + ' (일치율: ' + result.score + '%)';
    scoreEl.className = 'pron-score ' + result.cls;

    // 점수가 낮으면 오답 노트에 추가
    if (result.score < 70 && this.currentSentence) {
      Utils.addWrongNote({
        es: this.currentSentence.sentence,
        ko: this.currentSentence.translation,
        my: spoken,
        stage: this.currentStage,
        date: new Date().toLocaleDateString('ko-KR')
      });
      Passport.renderWrongNotes();
    }
  },

  hidePronResult() {
    document.getElementById('pronResult').style.display = 'none';
  },

  /* --- 단어 클릭 --- */
  onWordClick(word) {
    const clean = word.replace(/[¿?¡!.,;:'"]/g, '');
    if (!clean) return;

    // 단어 정보 표시 (API에서 받은 words 데이터 활용)
    const detail = document.getElementById('wordDetail');
    document.getElementById('wordDetailTitle').textContent = clean;

    // currentSentence.words에서 단어 정보 찾기
    let meaning = '';
    let example = '';
    if (this.currentSentence && this.currentSentence.words) {
      const wordInfo = this.currentSentence.words.find(
        w => w.word.toLowerCase() === clean.toLowerCase()
      );
      if (wordInfo) {
        meaning = wordInfo.meaning;
        example = wordInfo.example || '';
      }
    }

    document.getElementById('wordMeaning').textContent = meaning || '이 단어의 뜻을 확인하려면 아래 버튼으로 새 문장을 요청해보세요.';
    document.getElementById('wordExample').textContent = example;

    detail.style.display = 'block';

    // 이 단어 기반 새 문장 요청 버튼 추가
    this._currentWord = clean;
  },

  closeWordDetail() {
    document.getElementById('wordDetail').style.display = 'none';
  },

  listenWord() {
    if (this._currentWord) {
      Utils.speak(this._currentWord, 'es-ES');
    }
  },

  /* --- 한국어 → 스페인어 번역 --- */
  translateSentence: null,
  isTranslateRecording: false,
  translateRecognition: null,

  async doTranslate() {
    const input = document.getElementById('translateInput');
    const text = input.value.trim();
    if (!text) {
      input.focus();
      return;
    }

    const resultEl = document.getElementById('translateResult');
    const loadingEl = document.getElementById('translateLoading');
    const contentEl = document.getElementById('translateContent');
    const pronResultEl = document.getElementById('translatePronResult');

    resultEl.style.display = 'block';
    loadingEl.style.display = 'block';
    contentEl.style.display = 'none';
    pronResultEl.style.display = 'none';

    try {
      const data = await Utils.translateKorean(text);
      this.translateSentence = data;

      // 스페인어 문장 표시 (클릭 가능한 단어)
      const esEl = document.getElementById('translateEs');
      esEl.innerHTML = '';
      const words = data.sentence.split(/\s+/);
      words.forEach((w, i) => {
        const span = document.createElement('span');
        span.className = 'word';
        span.textContent = w;
        span.addEventListener('click', () => this.onTranslateWordClick(w, data));
        esEl.appendChild(span);
        if (i < words.length - 1) esEl.appendChild(document.createTextNode(' '));
      });

      document.getElementById('translateKo').textContent = data.translation;
      document.getElementById('translateHint').textContent = data.hint || '';

      loadingEl.style.display = 'none';
      contentEl.style.display = 'block';
    } catch (err) {
      loadingEl.style.display = 'none';
      resultEl.style.display = 'none';
      alert(err.message);
    }
  },

  onTranslateWordClick(word, data) {
    const clean = word.replace(/[¿?¡!.,;:'"]/g, '');
    if (!clean) return;

    const detail = document.getElementById('wordDetail');
    document.getElementById('wordDetailTitle').textContent = clean;

    let meaning = '';
    let example = '';
    if (data && data.words) {
      const wordInfo = data.words.find(
        w => w.word.toLowerCase() === clean.toLowerCase()
      );
      if (wordInfo) {
        meaning = wordInfo.meaning;
        example = wordInfo.example || '';
      }
    }

    document.getElementById('wordMeaning').textContent = meaning || '이 단어의 뜻을 확인하려면 사전을 참고해주세요.';
    document.getElementById('wordExample').textContent = example;
    detail.style.display = 'block';
    this._currentWord = clean;
  },

  listenTranslation() {
    if (!this.translateSentence) return;
    if (!Utils.speak(this.translateSentence.sentence, 'es-ES')) {
      alert('이 브라우저에서는 음성 재생을 지원하지 않아요.');
    }
  },

  toggleTranslateRecording() {
    if (this.isTranslateRecording) {
      this.stopTranslateRecording();
    } else {
      this.startTranslateRecording();
    }
  },

  startTranslateRecording() {
    const recognition = Utils.createRecognition('es-ES');
    if (!recognition) {
      alert('이 브라우저에서는 음성 인식을 지원하지 않아요.\nChrome 브라우저를 사용해주세요.');
      return;
    }

    this.translateRecognition = recognition;
    this.isTranslateRecording = true;

    const micBtn = document.getElementById('translateMicBtn');
    micBtn.classList.add('recording');
    micBtn.innerHTML = '<span>⏹️</span> 녹음 중...';

    recognition.onresult = (e) => {
      const spoken = e.results[0][0].transcript;
      this.showTranslatePronResult(spoken);
    };

    recognition.onerror = (e) => {
      this.stopTranslateRecordingUI();
      if (e.error === 'no-speech') {
        alert('음성이 감지되지 않았어요. 다시 시도해주세요.');
      } else if (e.error !== 'aborted') {
        alert('음성 인식 오류: ' + e.error);
      }
    };

    recognition.onend = () => {
      this.stopTranslateRecordingUI();
    };

    recognition.start();
  },

  stopTranslateRecording() {
    if (this.translateRecognition) {
      this.translateRecognition.stop();
    }
    this.stopTranslateRecordingUI();
  },

  stopTranslateRecordingUI() {
    this.isTranslateRecording = false;
    const micBtn = document.getElementById('translateMicBtn');
    micBtn.classList.remove('recording');
    micBtn.innerHTML = '<span>🎤</span> 말하기';
  },

  showTranslatePronResult(spoken) {
    if (!this.translateSentence) return;

    const result = Utils.comparePronunciation(this.translateSentence.sentence, spoken);

    document.getElementById('translatePronResult').style.display = 'block';
    document.getElementById('translatePronText').textContent = '"' + spoken + '"';
    const scoreEl = document.getElementById('translatePronScore');
    scoreEl.textContent = result.label + ' (일치율: ' + result.score + '%)';
    scoreEl.className = 'pron-score ' + result.cls;
  }
};
