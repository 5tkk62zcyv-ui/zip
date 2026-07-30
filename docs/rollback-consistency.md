# 롤백 이후 코드·DB 정합성 기록

기준일: 2026-07-30
관련 요구사항: `FR-23~25`, `FR-30~40`, `FR-50~54`, `TR-01~03`, `TR-06~07`

## 소스 기준

- 롤백 기준 커밋은 `06abee189817215925e013348e096467ff38825f`이다.
- 운영 DB에는 롤백 전에 적용된 `0003_mvp_domain_completion` 마이그레이션이 유지되어 있다.
- 운영 DB의 `schema_migrations`에 기록된 0003 checksum과
  `db/migrations/0003_mvp_domain_completion.sql`의 SHA-256
  `3ef5ec8f9261835257ccdd7483adc06eda89f5c48f2105faa55efe076da96d29`이 일치한다.
- 롤백된 서비스가 0003의 `trip_settlements.confirmation_deadline NOT NULL`
  제약을 충족하도록 실제 요금 제출 시 24시간 확인 기한을 함께 저장한다.

## 검증 범위

- `scripts/verify-db.mjs`는 0003 checksum·환경, 분쟁/추천 근거 테이블,
  정산 확인 기한, 포인트 원장 append-only 트리거를 확인한다.
- 운영 DB 대상 강화 검증은 통과했다.
- Sprint 2의 `0004_sprint2_trip_lifecycle`을 운영 DB에 transaction으로 적용했고,
  checksum `b31bcf1edab8318f895d2c18e9383b8200969cd888d265a74776baecade91c5e`,
  lifecycle·정원·방장 참가자·원장 불변성 검증이 통과했다.
- Sprint 3의 `0005_provider_neutral_fare_evidence`를 운영 DB에 transaction으로
  적용했고, checksum
  `849ff840567bc32e0f1c17a71bf4777ebb484017da667c788d802b8a5a753069`,
  장소 좌표·활성 FareEstimate·기존 원장 검증이 통과했다.
- `0006_require_fare_evidence_for_confirmation`을 운영 DB에 transaction으로
  적용했고, checksum
  `b13770ab19a1a2b577bdd89942cfb898fe97d15b5651fc770e614397c7b62bfa`,
  보호 트리거와 기존 CONFIRMED 근거 검증이 통과했다.
- Sprint 4의 `0007_participation_state_guards`를 운영 DB에 transaction으로
  적용했고, checksum
  `c955f9e86f534b0a1f852855334c019099f51ab43fbe9f3a5718d6d3bf65c81f`,
  OPEN·출발 전·프로필·정원 guard와 참여 상태 부분 인덱스 검증이 통과했다.
- Sprint 5의 `0008_recommendation_evidence_v2`를 운영 DB에 transaction으로
  적용했고, checksum
  `c18e743743b110f21988b8679adb4b40069bf62f31c6316ee9e16d0004f52879`,
  추천 요청·후보 revision·FareEstimate·정책·순위·문구 근거 제약과 stale
  evidence 차단 trigger 검증이 통과했다.
- `0009_recommendation_capacity_snapshot_guard`를 운영 DB에 transaction으로
  적용했고, checksum
  `7f44bdf7703b3da7ff38514347fa5fcfc1ace3e6a84199e5eb7b8bce5d6352c6`,
  마지막 좌석 승인과 추천 근거 저장 경쟁의 fail-closed guard 검증이 통과했다.
- 코드 품질 검증은 lint, TypeScript, 테스트 74건, production build가 통과했다.

## 남은 위험과 열린 결정

- 로컬 `.env.local`의 개발 설정이 운영 DB fingerprint를 가리켜 개발 환경 검증이
  안전하게 차단된다. 별도 Neon 개발 브랜치와 자격 증명을 구성해야 `TR-06`을
  완료할 수 있다.
- Preview/Production 완전 분리, 백업 보유 기간, RPO/RTO, 복구 훈련과 운영 경보는
  아직 결정되지 않아 `TR-07`은 미충족이다.
- 홈·내 모집·모집 상세의 참여 흐름은 실제 DB에 연결됐다. 다만 운영 DB를
  파괴적 fixture에 사용할 수 없어 마지막 좌석 동시 승인과 전체 브라우저 E2E는
  별도 Development/Preview Neon에서 후속 검증해야 한다.
