/* ===== 메인 앱 (라우팅 & 초기화) ===== */

const App = {
  currentPage: 'home',

  init() {
    // 모듈 초기화
    Learn.init();
    Passport.init();

    // 네비게이션 이벤트
    this.setupNav();

    // 해시 라우팅
    window.addEventListener('hashchange', () => this.route());
    this.route();
  },

  setupNav() {
    // 모바일 햄버거 메뉴
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');

    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
      toggle.setAttribute('aria-label', links.classList.contains('open') ? '메뉴 닫기' : '메뉴 열기');
    });

    // 메뉴 클릭 시 닫기
    links.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        links.classList.remove('open');
      });
    });

    // 바깥 클릭 시 닫기
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.nav-inner')) {
        links.classList.remove('open');
      }
    });
  },

  route() {
    const hash = location.hash.replace('#', '') || 'home';
    const validPages = ['home', 'learn', 'passport', 'about'];
    const page = validPages.includes(hash) ? hash : 'home';

    this.showPage(page);
  },

  showPage(page) {
    this.currentPage = page;

    // 페이지 전환
    document.querySelectorAll('.page').forEach(p => {
      p.style.display = 'none';
    });
    const target = document.getElementById('page-' + page);
    if (target) target.style.display = 'block';

    // 네비 활성화
    document.querySelectorAll('.nav-links a').forEach(a => {
      a.classList.toggle('active', a.dataset.page === page);
    });

    // 스크롤 맨 위로
    window.scrollTo(0, 0);

    // 여권 페이지 진입 시 데이터 새로고침
    if (page === 'passport') {
      Passport.updateStamps(Utils.getStamps());
      Passport.renderWrongNotes();
    }

    // 학습 페이지 진입 시 단계 선택 화면 표시
    if (page === 'learn') {
      Learn.showStageSelector();
    }
  }
};

// DOM 로드 후 시작
document.addEventListener('DOMContentLoaded', () => App.init());
