/**
 * 동양미래대학교 도서관 책 추천 큐레이터
 * Main JavaScript
 */

// ===== 전역 변수 =====
let selectedMood = null;

// ===== 초기화 =====
document.addEventListener('DOMContentLoaded', function () {
    // initParticles(); // Removing particles for now as they might conflict with new design or add back if needed
    // initModeSelector(); // Removed mode selector
    loadQuickList('bestseller');
});

// ===== 맞춤 추천 =====
async function getRecommendation() {
    const interests = document.getElementById('interests').value.trim();
    const purpose = document.getElementById('purpose').value;
    const category = ''; // Removed category select for simplicity as per UI

    if (!interests) {
        alert('관심 분야 또는 키워드를 입력해주세요!');
        return;
    }

    showLoading('recommend');

    try {
        const response = await fetch('/api/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ interests, purpose })
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

    // const avatar = type === 'bot' ? '📚' : '👤'; // Removed avatar for cleaner look

    messageDiv.innerHTML = `
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
            // if (book.reason) content += `<br><em style="color: rgba(255,255,255,0.7);">${book.reason}</em>`;
        });
    }

    addChatMessage('bot', content);

    // 팔로업 질문 버튼 추가
    if (data.followup_questions && data.followup_questions.length > 0) {
        const container = document.getElementById('chat-messages');
        const followupDiv = document.createElement('div');
        followupDiv.className = 'followup-questions';
        followupDiv.style.marginLeft = '10px';
        followupDiv.style.marginTop = '10px';

        data.followup_questions.forEach(q => {
            const btn = document.createElement('button');
            btn.className = 'category-pill'; // Reuse pill style
            btn.style.fontSize = '12px';
            btn.style.padding = '8px 12px';
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
        <div class="text-center" style="padding: 40px;">
            <p style="font-size: 48px; margin-bottom: 16px;">😢</p>
            <p style="color: var(--text-gray);">${message}</p>
        </div>
    `;
}

function displayRecommendations(panel, data) {
    const container = document.getElementById(`results-${panel}`);
    let html = '';

    // 큐레이터 코멘트 (Optional)
    if (data.curator_comment) {
        // Simplified
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
            <div class="text-center" style="padding: 40px;">
                <p style="font-size: 48px; margin-bottom: 16px;">📭</p>
                <p style="color: var(--text-gray);">검색 결과가 없습니다.</p>
            </div>
        `;
        return;
    }

    let html = `
        <div class="search-results-header" style="margin-bottom: 20px; color: #888;">
            <span class="results-count">총 ${data.totalResults || items.length}권</span>
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
        : `<div class="book-cover-placeholder" style="background:linear-gradient(45deg, #333, #555); height:100%; display:flex; align-items:center; justify-content:center;">📖</div>`;

    return `
        <div class="book-card">
            <div class="book-cover">${coverHtml}</div>
            <div class="book-info">
                <h3 class="book-title">${book.title}</h3>
                <p class="book-author">${book.author || '저자 미상'}</p>
            </div>
            ${book.link ? `<a href="${book.link}" target="_blank" style="display:block; margin-top:10px; color:#0066ff; text-decoration:none; font-size:14px;">자세히 보기 →</a>` : ''}
        </div>
    `;
}

function createSearchBookCard(book) {
    return createBookCard(book);
}

// ===== Navigation Controls =====
function navigateTo(screenId) {
    // Hide Home
    document.getElementById('screen-home').style.display = 'none';

    // Hide all panels
    document.querySelectorAll('.panel').forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
    });

    // Show target panel
    const panel = document.getElementById('panel-' + screenId);
    if (panel) {
        panel.style.display = 'flex';
        // Add active class after a small delay for animation if needed, or just immediately
        setTimeout(() => panel.classList.add('active'), 10);
    }
}

function goHome() {
    // Hide all panels
    document.querySelectorAll('.panel').forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
    });

    // Show Home
    document.getElementById('screen-home').style.display = 'flex';
}

function goBack() {
    goHome();
}
