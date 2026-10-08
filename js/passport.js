/* ===== 여권(진도) 모듈 ===== */

const Passport = {
  // 오답노트 발음 연습용 상태
  activeRecognition: null,
  activeRecordingIdx: null,

  init() {
    this.updateStamps(Utils.getStamps());
    this.renderWrongNotes();

    document.getElementById('clearWrongBtn').addEventListener('click', () => {
      if (confirm('오답 노트를 모두 지울까요?')) {
        Utils.clearWrongNotes();
        this.renderWrongNotes();
      }
    });
  },

  updateStamps(stamps) {
    document.getElementById('stampArrival').textContent = stamps.arrival || 0;
    document.getElementById('stampExplore').textContent = stamps.explore || 0;
    document.getElementById('stampLocal').textContent = stamps.local || 0;
  },

  renderWrongNotes() {
    const notes = Utils.getWrongNotes();
    const list = document.getElementById('wrongList');
    const clearBtn = document.getElementById('clearWrongBtn');

    // 녹음 중이면 중지
    this.stopActiveRecording();

    if (notes.length === 0) {
      list.innerHTML = '<p class="empty-msg">아직 기록이 없어요. 학습을 시작해보세요!</p>';
      clearBtn.style.display = 'none';
      return;
    }

    clearBtn.style.display = 'inline-flex';
    list.innerHTML = notes.map((note, idx) => {
      const stageInfo = Utils.stageInfo[note.stage] || {};
      const wrongWordsHtml = (note.wrongWords && note.wrongWords.length > 0)
        ? '<p class="wrong-item-words">틀린 단어: <strong>' + note.wrongWords.map(w => this.escapeHtml(w)).join(', ') + '</strong></p>'
        : '';
      return '<div class="wrong-item" data-idx="' + idx + '">' +
        '<p class="wrong-item-es">' + (stageInfo.icon || '') + ' ' + this.escapeHtml(note.es) + '</p>' +
        '<p class="wrong-item-ko">' + this.escapeHtml(note.ko) + '</p>' +
        (note.my ? '<p class="wrong-item-my">내 발음: "' + this.escapeHtml(note.my) + '"</p>' : '') +
        wrongWordsHtml +
        '<div class="wrong-item-controls">' +
          '<button class="ctrl-btn wrong-listen-btn" data-idx="' + idx + '">🔊 듣기</button>' +
          '<button class="ctrl-btn wrong-mic-btn" data-idx="' + idx + '">🎤 말하기</button>' +
        '</div>' +
        '<div class="wrong-pron-result" id="wrongPron' + idx + '" style="display:none;"></div>' +
        '</div>';
    }).join('');

    // 이벤트 바인딩 — 듣기 버튼
    list.querySelectorAll('.wrong-listen-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.idx, 10);
        this.listenWrongNote(notes[i]);
      });
    });

    // 이벤트 바인딩 — 말하기 버튼
    list.querySelectorAll('.wrong-mic-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.idx, 10);
        this.toggleWrongRecording(i, notes[i], btn);
      });
    });
  },

  /* --- 오답노트 듣기 --- */
  listenWrongNote(note) {
    if (!note || !note.es) return;
    if (!Utils.speak(note.es, 'es-ES')) {
      alert('이 브라우저에서는 음성 재생을 지원하지 않아요.');
    }
  },

  /* --- 오답노트 말하기 연습 --- */
  toggleWrongRecording(idx, note, btn) {
    // 이미 이 항목을 녹음 중이면 중지
    if (this.activeRecordingIdx === idx) {
      this.stopActiveRecording();
      return;
    }
    // 다른 항목 녹음 중이면 먼저 중지
    this.stopActiveRecording();

    const recognition = Utils.createRecognition('es-ES');
    if (!recognition) {
      alert('이 브라우저에서는 음성 인식을 지원하지 않아요.\nChrome 브라우저를 사용해주세요.');
      return;
    }

    this.activeRecognition = recognition;
    this.activeRecordingIdx = idx;
    btn.classList.add('recording');
    btn.innerHTML = '⏹️ 녹음 중...';

    recognition.onresult = (e) => {
      const spoken = e.results[0][0].transcript;
      this.showWrongPronResult(idx, note, spoken);
    };

    recognition.onerror = (e) => {
      this.resetMicBtn(idx, btn);
      if (e.error === 'no-speech') {
        alert('음성이 감지되지 않았어요. 다시 시도해주세요.');
      } else if (e.error !== 'aborted') {
        alert('음성 인식 오류: ' + e.error);
      }
    };

    recognition.onend = () => {
      this.resetMicBtn(idx, btn);
    };

    recognition.start();
  },

  stopActiveRecording() {
    if (this.activeRecognition) {
      try { this.activeRecognition.stop(); } catch (_) {}
      this.activeRecognition = null;
    }
    if (this.activeRecordingIdx !== null) {
      const btn = document.querySelector('.wrong-mic-btn[data-idx="' + this.activeRecordingIdx + '"]');
      if (btn) this.resetMicBtn(this.activeRecordingIdx, btn);
      this.activeRecordingIdx = null;
    }
  },

  resetMicBtn(idx, btn) {
    btn.classList.remove('recording');
    btn.innerHTML = '🎤 말하기';
    if (this.activeRecordingIdx === idx) {
      this.activeRecognition = null;
      this.activeRecordingIdx = null;
    }
  },

  showWrongPronResult(idx, note, spoken) {
    const result = Utils.comparePronunciation(note.es, spoken);
    const el = document.getElementById('wrongPron' + idx);
    if (!el) return;

    let html = '<h4>내 발음</h4>';
    html += '<p class="pron-text">"' + this.escapeHtml(spoken) + '"</p>';
    html += '<div class="pron-score ' + result.cls + '">' + result.label + ' (' + result.score + '%)</div>';

    // 단어별 상세
    html += '<div class="pron-words">';
    result.wordResults.forEach(r => {
      if (r.correct) {
        html += '<span class="pron-word-ok">' + this.escapeHtml(r.word) + '</span> ';
      } else {
        html += '<span class="pron-word-wrong">' + this.escapeHtml(r.word) + '</span> ';
      }
    });
    html += '</div>';

    if (result.wrongWords.length > 0) {
      html += '<p class="pron-wrong-list">틀린 단어: <strong>' + result.wrongWords.map(w => this.escapeHtml(w)).join(', ') + '</strong> ← 다시 들어보세요!</p>';
    }

    el.innerHTML = html;
    el.style.display = 'block';
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
