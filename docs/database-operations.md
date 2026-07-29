# Neon 데이터베이스 운영 기준

관련 요구사항: `FR-03`, `TR-06`, `TR-07`

## 환경과 자격 증명

- 개발, Vercel Preview, Production은 서로 다른 Neon 브랜치 또는 프로젝트와 자격 증명을 사용한다.
- `DATABASE_URL`은 애플리케이션용 pooled endpoint이며 DML 최소 권한만 부여한다.
- `DATABASE_MIGRATION_URL`은 승인된 마이그레이션 작업에만 쓰는 direct endpoint다.
- `DATABASE_FINGERPRINT`는 Neon 프로젝트/브랜치마다 고유한 비민감 식별자이며
  DB의 `application_environment` 단일 행과 일치해야 한다.
- 런타임과 migration 연결 역할은 각각
  `DATABASE_EXPECTED_RUNTIME_ROLE`, `DATABASE_EXPECTED_MIGRATION_ROLE`과 일치해야 한다.
- 두 값은 서버 전용이며 `NEXT_PUBLIC_` 접두사를 사용하지 않는다.
- 실제 값은 `.env.local` 또는 Vercel 환경별 비밀값에만 저장한다.
- Preview에서 Production 데이터베이스 URL을 사용하지 않는다.

## 마이그레이션

1. 대상 환경과 연결 대상 식별자를 확인한다.
   `APP_ENVIRONMENT`와 `DATABASE_EXPECTED_NAME`이 실제 대상과 일치해야 한다.
2. 적용 전 Neon 복구 가능 시점 또는 브랜치를 확인한다.
3. `pnpm db:migrate`로 승인된 단일 작업자가 적용한다.
4. `pnpm db:verify`로 테이블, 인덱스, 중복, 고아 레코드를 확인한다.
5. 애플리케이션의 lint, 타입 검사, 테스트, 빌드를 수행한다.

서버 시작 시 자동 마이그레이션하지 않는다. 이번 마이그레이션은 신규 테이블만
추가한다. 롤백은 앱의 이전 버전 복귀를 우선하며, 사용자 데이터가 생성된 후
테이블을 삭제하지 않는다. 문제가 있으면 별도의 전진 보상 마이그레이션을 만든다.

Runner는 DB advisory lock으로 동시 실행을 직렬화하고
`schema_migrations`에 버전·checksum·환경을 기록한다. 동일 checksum 재실행은
무해하게 종료하며, 파일 변경이나 환경 불일치는 DDL 전에 실패한다. 적용 직후
테이블과 데이터 불변식을 검사하고 실패하면 전체 트랜잭션을 롤백한다.

## 백업·복구와 모니터링

다음 항목은 PRD의 열린 결정이므로 운영 담당자가 확정하기 전 `TR-07`을 완료로
표시하지 않는다.

- Neon 리전과 Vercel 함수 리전
- PITR/백업 보유 기간
- 목표 RPO/RTO
- 격리 환경 복구 훈련 주기와 담당자
- 연결 포화, 오류율, 지연, 마이그레이션 실패 경보 임계치
- 복구 후 자격 증명 회전과 기존 세션 전체 폐기 절차

복구 훈련은 canary 데이터 기록, 격리 DB 복구, 행 수·FK·checksum 검증,
실제 RPO/RTO 측정, 자격 증명 회전과 세션 폐기 결과를 증거로 남긴다.
