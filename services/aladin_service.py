"""
알라딘 API 서비스
도서 검색 및 상세 정보 조회 기능 제공
"""

import os
import requests
from typing import Optional


class AladinService:
    """알라딘 API를 통한 도서 검색 서비스"""
    
    BASE_URL = "http://www.aladin.co.kr/ttb/api"
    
    def __init__(self, api_key: Optional[str] = None):
        self._api_key = api_key or os.getenv("ALADIN_API_KEY")
        if not self._api_key:
            raise ValueError("알라딘 API 키가 설정되지 않았습니다.")
    
    def search_books(self, query: str, query_type: str = "Keyword", 
                     max_results: int = 10, start: int = 1, 
                     category_id: Optional[int] = None) -> dict:
        """
        도서 검색
        
        Args:
            query: 검색어
            query_type: 검색 유형 (Keyword, Title, Author, Publisher)
            max_results: 최대 결과 수 (1-50)
            start: 시작 페이지
            category_id: 카테고리 ID (선택)
        
        Returns:
            검색 결과 딕셔너리
        """
        params = {
            "ttbkey": self._api_key,
            "Query": query,
            "QueryType": query_type,
            "MaxResults": min(max_results, 50),
            "start": start,
            "SearchTarget": "Book",
            "output": "js",  # JSON 형식
            "Version": "20131101",
            "Cover": "Big"  # 큰 표지 이미지
        }
        
        if category_id:
            params["CategoryId"] = category_id
        
        try:
            response = requests.get(
                f"{self.BASE_URL}/ItemSearch.aspx",
                params=params,
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            return {"error": str(e), "item": []}
    
    def get_bestsellers(self, category_id: int = 0, 
                        max_results: int = 10) -> dict:
        """
        베스트셀러 목록 조회
        
        Args:
            category_id: 카테고리 ID (0: 전체)
            max_results: 최대 결과 수
        
        Returns:
            베스트셀러 목록
        """
        params = {
            "ttbkey": self._api_key,
            "QueryType": "Bestseller",
            "MaxResults": min(max_results, 50),
            "start": 1,
            "SearchTarget": "Book",
            "output": "js",
            "Version": "20131101",
            "Cover": "Big"
        }
        
        if category_id > 0:
            params["CategoryId"] = category_id
        
        try:
            response = requests.get(
                f"{self.BASE_URL}/ItemList.aspx",
                params=params,
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            return {"error": str(e), "item": []}
    
    def get_new_releases(self, category_id: int = 0,
                         max_results: int = 10) -> dict:
        """
        신간 도서 목록 조회
        
        Args:
            category_id: 카테고리 ID
            max_results: 최대 결과 수
        
        Returns:
            신간 도서 목록
        """
        params = {
            "ttbkey": self._api_key,
            "QueryType": "ItemNewAll",
            "MaxResults": min(max_results, 50),
            "start": 1,
            "SearchTarget": "Book",
            "output": "js",
            "Version": "20131101",
            "Cover": "Big"
        }
        
        if category_id > 0:
            params["CategoryId"] = category_id
        
        try:
            response = requests.get(
                f"{self.BASE_URL}/ItemList.aspx",
                params=params,
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            return {"error": str(e), "item": []}
    
    def get_book_detail(self, item_id: str) -> dict:
        """
        도서 상세 정보 조회
        
        Args:
            item_id: 상품 ID (ISBN13 또는 ItemId)
        
        Returns:
            도서 상세 정보
        """
        params = {
            "ttbkey": self._api_key,
            "itemIdType": "ISBN13" if len(item_id) == 13 else "ItemId",
            "ItemId": item_id,
            "output": "js",
            "Version": "20131101",
            "Cover": "Big",
            "OptResult": "ebookList,usedList,reviewList"
        }
        
        try:
            response = requests.get(
                f"{self.BASE_URL}/ItemLookUp.aspx",
                params=params,
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            return {"error": str(e), "item": []}


# 카테고리 ID 매핑 (자주 사용되는 카테고리)
CATEGORY_MAP = {
    "전체": 0,
    "소설/시/희곡": 1,
    "경제경영": 170,
    "자기계발": 336,
    "인문학": 656,
    "역사": 74,
    "사회과학": 798,
    "과학": 987,
    "컴퓨터/IT": 351,
    "예술/대중문화": 517,
    "외국어": 1322,
    "대학교재": 8257,
    "수험서/자격증": 2156,
    "취미/건강": 55890,
    "여행": 1196,
    "요리": 53471
}
