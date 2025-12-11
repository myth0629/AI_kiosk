/**
 * 동양미래대학교 도서관 책 추천 큐레이터
 * Main JavaScript
 */

// ===== 전역 변수 =====
let selectedMood = null;

// ===== 초기화 =====
document.addEventListener('DOMContentLoaded', function () {
    initParticles();
    initModeSelector();
    loadQuickList('bestseller');
});

// ===== 파티클 배경 애니메이션 =====
function initParticles() {
    const container = document.getElementById('particles');
    const particleCount = 30;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (15 + Math.random() * 10) + 's';
        container.appendChild(particle);
    }
}

// ===== 모드 선택기 =====
function initModeSelector() {
    const buttons = document.querySelectorAll('.mode-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', function () {
            const mode = this.dataset.mode;
            switchMode(mode);
        });
    });
}

function switchMode(mode) {
    // 버튼 활성화 상태 변경
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // 패널 표시 전환
    document.querySelectorAll('.panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(`panel-${mode}`).classList.add('active');
}

// ===== 맞춤 추천 =====
async function getRecommendation() {
    const interests = document.getElementById('interests').value.trim();
    const purpose = document.getElementById('purpose').value;
    const category = document.getElementById('category').value;

    if (!interests) {
        alert('관심 분야 또는 키워드를 입력해주세요!');
        return;
    }

    showLoading('recommend');

    try {
        const response = await fetch('/api/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ interests, purpose, category })
        });

        const data = await response.json();
        hideLoading('recommend');

        if (data.error && !data.recommendations) {
            showError('recommend', data.error);
            return;
        }

        displayRecommendations('recommend', data);
    } catch (error) {
        hideLoading('recommend');
        showError('recommend', '추천을 가져오는 중 오류가 발생했습니다.');
    }
}

// ===== 기분 선택 =====
function selectMood(element) {
    document.querySelectorAll('.mood-card').forEach(card => {
        card.classList.remove('selected');
    });
    element.classList.add('selected');
    selectedMood = element.dataset.mood;

    document.getElementById('btn-mood-recommend').disabled = false;
}

async function getMoodRecommendation() {
    if (!selectedMood) {
        alert('기분을 선택해주세요!');
        return;
    }

    showLoading('mood');

    try {
        const response = await fetch('/api/recommend/mood', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mood: selectedMood })
        });

        const data = await response.json();
        hideLoading('mood');

        if (data.error && !data.recommendations) {
            showError('mood', data.error);
            return;
        }

        displayMoodRecommendations(data);
    } catch (error) {
        hideLoading('mood');
        showError('mood', '추천을 가져오는 중 오류가 발생했습니다.');
    }
}

// ===== 채팅 =====
function handleChatEnter(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();

    if (!message) return;

    // 사용자 메시지 추가
    addChatMessage('user', message);
    input.value = '';

    // 로딩 표시
    const sendBtn = document.getElementById('chat-send-btn');
    sendBtn.disabled = true;

    try {
        const response = await fetch('/api/recommend/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: message })
        });

        const data = await response.json();
        sendBtn.disabled = false;

        displayChatResponse(data);
    } catch (error) {
        sendBtn.disabled = false;
        addChatMessage('bot', '죄송해요, 응답을 가져오는 중 문제가 발생했어요. 다시 시도해주세요! 😅');
    }
}

function addChatMessage(type, content) {
    const container = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}`;

    const avatar = type === 'bot' ? '📚' : '👤';

    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">${content}</div>
    `;

    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

function displayChatResponse(data) {
    let content = data.answer || '책 추천을 준비했어요!';

    // 추천 도서가 있으면 표시
    if (data.recommendations && data.recommendations.length > 0) {
        content += '<br><br><strong>📚 추천 도서:</strong><br>';
        data.recommendations.forEach((book, idx) => {
            content += `<br>${idx + 1}. <strong>${book.title}</strong>`;
            if (book.author) content += ` - ${book.author}`;
            if (book.reason) content += `<br><em style="color: rgba(255,255,255,0.7);">${book.reason}</em>`;
        });
    }

    addChatMessage('bot', content);

    // 팔로업 질문 버튼 추가
    if (data.followup_questions && data.followup_questions.length > 0) {
        const container = document.getElementById('chat-messages');
        const followupDiv = document.createElement('div');
        followupDiv.className = 'followup-questions';
        followupDiv.style.marginLeft = '56px';

        data.followup_questions.forEach(q => {
            const btn = document.createElement('button');
            btn.className = 'followup-btn';
            btn.textContent = q;
            btn.onclick = function () {
                document.getElementById('chat-input').value = q;
                sendChatMessage();
            };
            followupDiv.appendChild(btn);
        });

        container.appendChild(followupDiv);
        container.scrollTop = container.scrollHeight;
    }
}

// ===== 도서 검색 =====
function handleSearchEnter(event) {
    if (event.key === 'Enter') {
        searchBooks();
    }
}

async function searchBooks() {
    const query = document.getElementById('search-query').value.trim();

    if (!query) {
        alert('검색어를 입력해주세요!');
        return;
    }

    // 카테고리 선택 해제
    document.querySelectorAll('.category-pill').forEach(pill => {
        pill.classList.remove('active');
    });

    showLoading('search');

    try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}&limit=12`);
        const data = await response.json();
        hideLoading('search');

        displaySearchResults(data);
    } catch (error) {
        hideLoading('search');
        showError('search', '검색 중 오류가 발생했습니다.');
    }
}

async function loadQuickList(type) {
    // 카테고리 선택 상태 업데이트
    document.querySelectorAll('.category-pill').forEach(pill => {
        pill.classList.toggle('active', pill.dataset.category === type);
    });

    showLoading('search');

    let url = '';
    switch (type) {
        case 'bestseller':
            url = '/api/bestsellers?limit=12';
            break;
        case 'new':
            url = '/api/new-releases?limit=12';
            break;
        case 'it':
            url = '/api/search?query=프로그래밍&type=Keyword&limit=12';
            break;
        case 'selfhelp':
            url = '/api/bestsellers?category=자기계발&limit=12';
            break;
        case 'novel':
            url = '/api/bestsellers?category=소설/시/희곡&limit=12';
            break;
    }

    try {
        const response = await fetch(url);
        const data = await response.json();
        hideLoading('search');
        displaySearchResults(data);
    } catch (error) {
        hideLoading('search');
        showError('search', '목록을 가져오는 중 오류가 발생했습니다.');
    }
}

// ===== UI 헬퍼 함수 =====
function showLoading(panel) {
    document.getElementById(`loading-${panel}`).classList.add('active');
    document.getElementById(`results-${panel}`).innerHTML = '';
}

function hideLoading(panel) {
    document.getElementById(`loading-${panel}`).classList.remove('active');
}

function showError(panel, message) {
    const container = document.getElementById(`results-${panel}`);
    container.innerHTML = `
        <div class="glass-card text-center">
            <p style="font-size: 48px; margin-bottom: 16px;">😢</p>
            <p style="color: var(--text-secondary);">${message}</p>
        </div>
    `;
}

function displayRecommendations(panel, data) {
    const container = document.getElementById(`results-${panel}`);

    let html = '';

    // 큐레이터 코멘트
    if (data.curator_comment) {
        html += `
            <div class="curator-comment">
                <div class="curator-header">
                    <div class="curator-avatar">📚</div>
                    <div>
                        <div class="curator-name">책누리</div>
                        <div class="curator-role">AI 큐레이터</div>
                    </div>
                </div>
                <div class="curator-message">${data.curator_comment}</div>
            </div>
        `;
    }

    // 추천 도서 카드
    if (data.recommendations && data.recommendations.length > 0) {
        html += '<div class="books-grid">';
        data.recommendations.forEach(book => {
            html += createBookCard(book);
        });
        html += '</div>';
    }

    container.innerHTML = html;
}

function displayMoodRecommendations(data) {
    const container = document.getElementById('results-mood');

    let html = '';

    // 기분 분석 + 응원 메시지
    if (data.mood_analysis || data.encouragement) {
        html += `
            <div class="curator-comment">
                <div class="curator-header">
                    <div class="curator-avatar">💝</div>
                    <div>
                        <div class="curator-name">책누리</div>
                        <div class="curator-role">마음 읽는 AI 사서</div>
                    </div>
                </div>
                <div class="curator-message">
                    ${data.mood_analysis ? `<p>${data.mood_analysis}</p><br>` : ''}
                    ${data.encouragement ? `<p><em>${data.encouragement}</em></p>` : ''}
                </div>
            </div>
        `;
    }

    // 추천 도서
    if (data.recommendations && data.recommendations.length > 0) {
        html += '<div class="books-grid">';
        data.recommendations.forEach(book => {
            html += createBookCard(book, true);
        });
        html += '</div>';
    }

    container.innerHTML = html;
}

function displaySearchResults(data) {
    const container = document.getElementById('results-search');

    const items = data.item || [];

    if (items.length === 0) {
        container.innerHTML = `
            <div class="glass-card text-center">
                <p style="font-size: 48px; margin-bottom: 16px;">📭</p>
                <p style="color: var(--text-secondary);">검색 결과가 없습니다.</p>
            </div>
        `;
        return;
    }

    let html = `
        <div class="search-results-header">
            <span class="results-count">총 ${data.totalResults || items.length}권의 도서를 찾았습니다</span>
        </div>
        <div class="books-grid">
    `;

    items.forEach(book => {
        html += createSearchBookCard(book);
    });

    html += '</div>';
    container.innerHTML = html;
}

function createBookCard(book, showQuote = false) {
    const coverHtml = book.cover
        ? `<img src="${book.cover}" alt="${book.title}" loading="lazy">`
        : `<div class="book-cover-placeholder">📖</div>`;

    return `
        <div class="book-card">
            <div class="book-card-inner">
                <div class="book-cover">${coverHtml}</div>
                <div class="book-info">
                    <h3 class="book-title">${book.title}</h3>
                    <p class="book-author">${book.author || '저자 미상'}</p>
                    <p class="book-reason">${book.reason || ''}</p>
                    ${book.highlight ? `<span class="book-highlight">${book.highlight}</span>` : ''}
                    ${showQuote && book.quote ? `<p class="book-reason" style="font-style: italic; margin-top: 8px;">"${book.quote}"</p>` : ''}
                </div>
            </div>
            ${book.publisher || book.link ? `
            <div class="book-meta">
                <span class="book-publisher">${book.publisher || ''}</span>
                ${book.link ? `<a href="${book.link}" target="_blank" class="book-link">자세히 보기 →</a>` : ''}
            </div>
            ` : ''}
        </div>
    `;
}

function createSearchBookCard(book) {
    const coverHtml = book.cover
        ? `<img src="${book.cover}" alt="${book.title}" loading="lazy">`
        : `<div class="book-cover-placeholder">📖</div>`;

    const description = book.description
        ? (book.description.length > 100 ? book.description.substring(0, 100) + '...' : book.description)
        : '';

    return `
        <div class="book-card">
            <div class="book-card-inner">
                <div class="book-cover">${coverHtml}</div>
                <div class="book-info">
                    <h3 class="book-title">${book.title}</h3>
                    <p class="book-author">${book.author || '저자 미상'}</p>
                    <p class="book-reason">${description}</p>
                    ${book.categoryName ? `<span class="book-highlight">${book.categoryName.split('>').pop()}</span>` : ''}
                </div>
            </div>
            <div class="book-meta">
                <span class="book-publisher">${book.publisher || ''} ${book.pubDate ? `(${book.pubDate})` : ''}</span>
                ${book.link ? `<a href="${book.link}" target="_blank" class="book-link">자세히 보기 →</a>` : ''}
            </div>
        </div>
    `;
}
