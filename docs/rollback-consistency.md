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
- 코드 품질 검증은 lint, TypeScript, 테스트 21건, production build가 통과했다.

## 남은 위험과 열린 결정

- 로컬 `.env.local`의 개발 설정이 운영 DB fingerprint를 가리켜 개발 환경 검증이
  안전하게 차단된다. 별도 Neon 개발 브랜치와 자격 증명을 구성해야 `TR-06`을
  완료할 수 있다.
- Preview/Production 완전 분리, 백업 보유 기간, RPO/RTO, 복구 훈련과 운영 경보는
  아직 결정되지 않아 `TR-07`은 미충족이다.
- `/core` 백엔드 구현과 주 사용자 화면의 실제 데이터 흐름 연결 및 전체 E2E는
  별도 후속 작업이다. 스키마 존재만으로 해당 FR을 완료로 간주하지 않는다.
