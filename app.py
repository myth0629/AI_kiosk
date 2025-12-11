"""
동양미래대학교 도서관 책 추천 큐레이터 서비스
Flask 기반 API 서버
"""

import os
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

from services.aladin_service import AladinService, CATEGORY_MAP
from services.gemini_service import ChatGPTService

# 환경변수 로드
load_dotenv()

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False

# 서비스 인스턴스 (지연 초기화)
_aladin_service = None
_chatgpt_service = None


def get_aladin_service():
    """알라딘 서비스 인스턴스 반환"""
    global _aladin_service
    if _aladin_service is None:
        try:
            _aladin_service = AladinService()
        except ValueError as e:
            return None
    return _aladin_service


def get_chatgpt_service():
    """ChatGPT 서비스 인스턴스 반환"""
    global _chatgpt_service
    if _chatgpt_service is None:
        try:
            _chatgpt_service = ChatGPTService()
        except ValueError as e:
            return None
    return _chatgpt_service


@app.route('/')
def index():
    """메인 페이지"""
    return render_template('index.html')


@app.route('/api/search', methods=['GET'])
def search_books():
    """도서 검색 API"""
    aladin = get_aladin_service()
    if not aladin:
        return jsonify({"error": "알라딘 API 키가 설정되지 않았습니다."}), 500
    
    query = request.args.get('query', '')
    query_type = request.args.get('type', 'Keyword')
    max_results = int(request.args.get('limit', 10))
    
    if not query:
        return jsonify({"error": "검색어를 입력해주세요."}), 400
    
    result = aladin.search_books(query, query_type, max_results)
    return jsonify(result)


@app.route('/api/bestsellers', methods=['GET'])
def get_bestsellers():
    """베스트셀러 목록 API"""
    aladin = get_aladin_service()
    if not aladin:
        return jsonify({"error": "알라딘 API 키가 설정되지 않았습니다."}), 500
    
    category = request.args.get('category', '전체')
    category_id = CATEGORY_MAP.get(category, 0)
    max_results = int(request.args.get('limit', 10))
    
    result = aladin.get_bestsellers(category_id, max_results)
    return jsonify(result)


@app.route('/api/new-releases', methods=['GET'])
def get_new_releases():
    """신간 도서 목록 API"""
    aladin = get_aladin_service()
    if not aladin:
        return jsonify({"error": "알라딘 API 키가 설정되지 않았습니다."}), 500
    
    category = request.args.get('category', '전체')
    category_id = CATEGORY_MAP.get(category, 0)
    max_results = int(request.args.get('limit', 10))
    
    result = aladin.get_new_releases(category_id, max_results)
    return jsonify(result)


@app.route('/api/recommend', methods=['POST'])
def get_recommendations():
    """AI 도서 추천 API"""
    aladin = get_aladin_service()
    chatgpt = get_chatgpt_service()
    
    if not aladin:
        return jsonify({"error": "알라딘 API 키가 설정되지 않았습니다."}), 500
    if not chatgpt:
        return jsonify({"error": "OpenAI API 키가 설정되지 않았습니다."}), 500
    
    data = request.get_json()
    
    interests = data.get('interests', '')
    mood = data.get('mood', '')
    purpose = data.get('purpose', '')
    department = data.get('department', '')
    category = data.get('category', '전체')
    
    if not interests and not department:
        return jsonify({"error": "관심사 또는 학과를 입력해주세요."}), 400
    
    # 검색 키워드 설정 (관심사가 없으면 학과로 검색)
    search_query = interests if interests else f"{department} 전공"
    
    # 관심사 기반으로 도서 검색
    category_id = CATEGORY_MAP.get(category, 0)
    search_result = aladin.search_books(search_query, "Keyword", 20, category_id=category_id)
    
    books = search_result.get('item', [])
    
    if not books:
        return jsonify({
            "error": "관련 도서를 찾을 수 없습니다.",
            "recommendations": [],
            "curator_comment": "죄송해요, 해당 키워드로 검색된 도서가 없습니다. 다른 키워드로 시도해보세요!"
        })
    
    # Gemini로 추천 생성
    recommendation = chatgpt.get_book_recommendation(interests, books, mood, purpose, department)
    
    # 추천된 책 정보에 상세 정보 추가
    if 'recommendations' in recommendation:
        for rec in recommendation['recommendations']:
            for book in books:
                if rec.get('title') in book.get('title', ''):
                    rec['cover'] = book.get('cover', '')
                    rec['isbn'] = book.get('isbn13', book.get('isbn', ''))
                    rec['publisher'] = book.get('publisher', '')
                    rec['pubDate'] = book.get('pubDate', '')
                    rec['link'] = book.get('link', '')
                    break
    
    return jsonify(recommendation)


@app.route('/api/recommend/mood', methods=['POST'])
def get_mood_recommendations():
    """기분 기반 도서 추천 API"""
    aladin = get_aladin_service()
    chatgpt = get_chatgpt_service()
    
    if not aladin:
        return jsonify({"error": "알라딘 API 키가 설정되지 않았습니다."}), 500
    if not chatgpt:
        return jsonify({"error": "OpenAI API 키가 설정되지 않았습니다."}), 500
    
    data = request.get_json()
    mood = data.get('mood', '')
    
    if not mood:
        return jsonify({"error": "기분을 선택해주세요."}), 400
    
    # 기분에 맞는 키워드로 도서 검색
    mood_keywords = {
        "힐링": "에세이 위로",
        "설렘": "도전 성공",
        "우울": "희망 치유",
        "호기심": "과학 철학",
        "지침": "여행 휴식",
        "성장": "자기계발 성장"
    }
    
    search_keyword = mood_keywords.get(mood, mood)
    search_result = aladin.search_books(search_keyword, "Keyword", 15)
    books = search_result.get('item', [])
    
    if not books:
        # 베스트셀러로 대체
        bestseller_result = aladin.get_bestsellers(max_results=15)
        books = bestseller_result.get('item', [])
    
    recommendation = chatgpt.get_mood_based_recommendation(mood, books)
    
    # 추천된 책 정보에 상세 정보 추가
    if 'recommendations' in recommendation:
        for rec in recommendation['recommendations']:
            for book in books:
                if rec.get('title') in book.get('title', ''):
                    rec['cover'] = book.get('cover', '')
                    rec['isbn'] = book.get('isbn13', book.get('isbn', ''))
                    rec['publisher'] = book.get('publisher', '')
                    break
    
    return jsonify(recommendation)


@app.route('/api/recommend/chat', methods=['POST'])
def chat_recommendation():
    """챗봇 형태의 자유 질문 추천 API"""
    aladin = get_aladin_service()
    chatgpt = get_chatgpt_service()
    
    if not aladin:
        return jsonify({"error": "알라딘 API 키가 설정되지 않았습니다."}), 500
    if not chatgpt:
        return jsonify({"error": "OpenAI API 키가 설정되지 않았습니다."}), 500
    
    data = request.get_json()
    query = data.get('query', '')
    
    if not query:
        return jsonify({"error": "질문을 입력해주세요."}), 400
    
    # 질문에서 키워드 추출하여 도서 검색
    search_result = aladin.search_books(query, "Keyword", 15)
    books = search_result.get('item', [])
    
    if not books:
        # 베스트셀러로 대체
        bestseller_result = aladin.get_bestsellers(max_results=15)
        books = bestseller_result.get('item', [])
    
    recommendation = chatgpt.get_custom_recommendation(query, books)
    
    # 추천된 책 정보에 상세 정보 추가
    if 'recommendations' in recommendation:
        for rec in recommendation['recommendations']:
            for book in books:
                if rec.get('title') in book.get('title', ''):
                    rec['cover'] = book.get('cover', '')
                    rec['isbn'] = book.get('isbn13', book.get('isbn', ''))
                    rec['publisher'] = book.get('publisher', '')
                    break
    
    return jsonify(recommendation)


@app.route('/api/categories', methods=['GET'])
def get_categories():
    """카테고리 목록 API"""
    return jsonify({"categories": list(CATEGORY_MAP.keys())})


if __name__ == '__main__':
    print("=" * 50)
    print("📚 동양미래대학교 도서관 책 추천 큐레이터 서비스")
    print("=" * 50)
    print("\n서버 시작: http://localhost:5001")
    print("\n⚠️  .env 파일에 API 키를 설정해주세요:")
    print("   - ALADIN_API_KEY: 알라딘 TTB 키")
    print("   - OPENAI_API_KEY: OpenAI API 키\n")
    
    app.run(debug=True, host='0.0.0.0', port=5001)
