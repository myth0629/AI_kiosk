"""
ChatGPT API 서비스
AI 기반 도서 추천 및 큐레이션 기능 제공
"""

import os
from openai import OpenAI
from typing import Optional


class ChatGPTService:
    """ChatGPT(OpenAI)를 통한 도서 추천 서비스"""
    
    def __init__(self, api_key: Optional[str] = None):
        self._api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self._api_key:
            raise ValueError("OpenAI API 키가 설정되지 않았습니다.")
        
        self.client = OpenAI(api_key=self._api_key)
        self.model_name = "gpt-4o-mini"
    
    def get_book_recommendation(self, user_interests: str, 
                                 available_books: list,
                                 mood: str = "",
                                 purpose: str = "",
                                 department: str = "") -> dict:
        """
        사용자 관심사와 분위기에 맞는 도서 추천
        
        Args:
            user_interests: 사용자 관심사/키워드
            available_books: 추천 대상 도서 목록
            mood: 현재 기분/분위기 (선택)
            purpose: 독서 목적 (선택)
            department: 사용자 학과/전공 (선택)
        
        Returns:
            추천 결과 딕셔너리
        """
        books_info = self._format_books_for_prompt(available_books)
        
        prompt = f"""당신은 동양미래대학교 도서관의 친절한 AI 사서입니다.
아래 도서 목록에서 사용자에게 적합한 책 3-5권을 추천해주세요.

## 사용자 정보
- 관심사/키워드: {user_interests}
{f"- 학과/전공: {department}" if department else ""}
{f"- 현재 기분: {mood}" if mood else ""}
{f"- 독서 목적: {purpose}" if purpose else ""}

## 추천 대상 도서 목록
{books_info}

## 응답 형식 (반드시 이 JSON 형식으로만 응답)
```json
{{
    "recommendations": [
        {{
            "title": "도서 제목",
            "author": "저자",
            "reason": "이 책을 추천하는 이유 (2-3문장)",
            "highlight": "핵심 포인트 한 줄"
        }}
    ],
    "curator_comment": "전체적인 추천 코멘트 (친근하고 따뜻한 톤으로)"
}}
```

중요: 반드시 위의 도서 목록에 있는 책만 추천하세요. JSON 형식으로만 응답하세요.
"""
        
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            result_text = response.choices[0].message.content
            
            # JSON 추출 시도
            import json
            import re
            
            # 코드 블록에서 JSON 추출
            json_match = re.search(r'```json\s*(.*?)\s*```', result_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                # 코드 블록 없이 JSON만 있는 경우
                json_str = result_text
            
            return json.loads(json_str)
        except Exception as e:
            return {
                "recommendations": [],
                "curator_comment": f"추천을 생성하는 중 오류가 발생했습니다: {str(e)}",
                "error": str(e)
            }
    
    def get_custom_recommendation(self, user_query: str,
                                   available_books: list) -> dict:
        """
        자유로운 질문에 대한 도서 추천
        
        Args:
            user_query: 사용자 자유 질문
            available_books: 추천 대상 도서 목록
        
        Returns:
            추천 결과
        """
        books_info = self._format_books_for_prompt(available_books)
        
        prompt = f"""당신은 동양미래대학교 도서관의 AI 사서 '책누리'입니다.
학생의 질문에 친절하고 도움되게 답변하며, 관련 도서를 추천해주세요.

## 학생 질문
{user_query}

## 도서관 보유 도서 목록
{books_info}

## 응답 형식 (반드시 이 JSON 형식으로만 응답)
```json
{{
    "answer": "질문에 대한 답변 (친근하고 도움되는 톤으로)",
    "recommendations": [
        {{
            "title": "도서 제목",
            "author": "저자",
            "reason": "이 책을 추천하는 이유"
        }}
    ],
    "followup_questions": ["추가로 물어볼만한 질문 1", "질문 2"]
}}
```

중요: 도서 목록에 있는 책만 추천하세요. JSON 형식으로만 응답하세요.
"""
        
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            result_text = response.choices[0].message.content
            
            import json
            import re
            
            json_match = re.search(r'```json\s*(.*?)\s*```', result_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                json_str = result_text
            
            return json.loads(json_str)
        except Exception as e:
            return {
                "answer": f"답변을 생성하는 중 오류가 발생했습니다: {str(e)}",
                "recommendations": [],
                "followup_questions": [],
                "error": str(e)
            }
    
    def get_mood_based_recommendation(self, mood: str, 
                                       available_books: list) -> dict:
        """
        기분/감정 기반 도서 추천
        
        Args:
            mood: 사용자 현재 기분
            available_books: 추천 대상 도서 목록
        
        Returns:
            추천 결과
        """
        books_info = self._format_books_for_prompt(available_books)
        
        mood_prompts = {
            "힐링": "마음의 안정과 위로가 필요한",
            "설렘": "새로운 도전과 영감이 필요한",
            "우울": "기분 전환과 희망이 필요한",
            "호기심": "지적 탐구욕을 자극하는",
            "지침": "가벼운 휴식이 필요한",
            "성장": "자기 발전과 성장을 원하는"
        }
        
        mood_desc = mood_prompts.get(mood, f"{mood} 기분의")
        
        prompt = f"""당신은 동양미래대학교 도서관의 감성 AI 사서입니다.
{mood_desc} 학생에게 어울리는 책을 추천해주세요.

## 학생의 현재 기분
{mood}

## 도서관 도서 목록
{books_info}

## 응답 형식 (반드시 이 JSON 형식으로만 응답)
```json
{{
    "mood_analysis": "학생의 기분에 대한 공감과 이해 (따뜻한 톤으로)",
    "recommendations": [
        {{
            "title": "도서 제목",
            "author": "저자",
            "reason": "이 기분일 때 이 책이 좋은 이유",
            "quote": "책에서 위로가 될 만한 구절이나 메시지 (있다면)"
        }}
    ],
    "encouragement": "학생에게 전하는 따뜻한 응원 메시지"
}}
```

JSON 형식으로만 응답하세요.
"""
        
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            result_text = response.choices[0].message.content
            
            import json
            import re
            
            json_match = re.search(r'```json\s*(.*?)\s*```', result_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                json_str = result_text
            
            return json.loads(json_str)
        except Exception as e:
            return {
                "mood_analysis": "",
                "recommendations": [],
                "encouragement": f"추천을 생성하는 중 오류가 발생했습니다: {str(e)}",
                "error": str(e)
            }
    
    def _format_books_for_prompt(self, books: list) -> str:
        """도서 목록을 프롬프트용 문자열로 변환"""
        if not books:
            return "도서 목록이 없습니다."
        
        formatted = []
        for i, book in enumerate(books, 1):
            title = book.get("title", "제목 없음")
            author = book.get("author", "저자 미상")
            description = book.get("description", "")[:200]
            category = book.get("categoryName", "")
            
            formatted.append(f"{i}. 《{title}》 - {author}")
            if category:
                formatted.append(f"   분류: {category}")
            if description:
                formatted.append(f"   소개: {description}...")
            formatted.append("")
        
        return "\n".join(formatted)
