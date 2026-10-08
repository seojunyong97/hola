/* ===== 여권(진도) 모듈 ===== */

const Passport = {
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

    if (notes.length === 0) {
      list.innerHTML = '<p class="empty-msg">아직 기록이 없어요. 학습을 시작해보세요!</p>';
      clearBtn.style.display = 'none';
      return;
    }

    clearBtn.style.display = 'inline-flex';
    list.innerHTML = notes.map(note => {
      const stageInfo = Utils.stageInfo[note.stage] || {};
      const wrongWordsHtml = (note.wrongWords && note.wrongWords.length > 0)
        ? '<p class="wrong-item-words">틀린 단어: <strong>' + note.wrongWords.map(w => this.escapeHtml(w)).join(', ') + '</strong></p>'
        : '';
      return '<div class="wrong-item">' +
        '<p class="wrong-item-es">' + (stageInfo.icon || '') + ' ' + this.escapeHtml(note.es) + '</p>' +
        '<p class="wrong-item-ko">' + this.escapeHtml(note.ko) + '</p>' +
        (note.my ? '<p class="wrong-item-my">내 발음: "' + this.escapeHtml(note.my) + '"</p>' : '') +
        wrongWordsHtml +
        '</div>';
    }).join('');
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
