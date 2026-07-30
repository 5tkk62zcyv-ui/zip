# 카카오 지도·경로·예상 요금 구현

- 장소 검색: Kakao Local 키워드 검색
- 자동차 경로: Kakao Mobility Directions
- 지도 표시: Kakao Maps JavaScript SDK(브라우저 전용)

`KAKAO_REST_API_KEY`는 서버에서만 사용한다. 지도 표시에는 같은 앱의
JavaScript 키를 `NEXT_PUBLIC_KAKAO_MAP_JS_KEY`로 설정하고 Kakao Developers에
서비스 도메인을 등록한다. REST 키를 JavaScript 키 자리에 사용하면 지도 SDK
인증이 실패한다.

Directions의 거리(m), 시간(초), 예상 택시요금을 공급자 중립 계약으로
정규화한다. 택시요금이 없으면 `estimatedFareWon`은 `null`이며 앱은 임의로
요금을 계산하지 않는다. 방 생성에는 공급자 예상 요금이 반드시 필요하다.
