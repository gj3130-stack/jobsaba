# 잡사바 FOOD 쇼핑몰

소스, 장류, 장아찌, 반찬, 젓갈, 세트·선물을 파는 Phase 1 쇼핑몰입니다. Next.js(App Router) + TypeScript + Supabase(Auth, Postgres, Storage)로 구성되어 있고 Vercel에 올릴 수 있습니다.

가격, 쿠폰, 포인트, 재고는 서버와 데이터베이스 함수가 다시 계산합니다. 결제, 택배 조회, 세금계산서, 카카오 상담은 어댑터이며 지금은 모의 구현만 연결돼 있습니다.

## 사장님이 확인할 결정

PRD 섹션 17의 열린 항목과, 구현하면서 정한 운영 기본값입니다. 바꾸려면 알려 주세요.

| 항목 | 현재 기본값 |
| --- | --- |
| 결제 | `PaymentService` + `mock`. `shop_settings.allow_mock_checkout`이 참일 때만 모의 결제가 성공합니다. 운영에서는 끄고 실 PG 구현체를 붙입니다. |
| 카카오 문의 | `NEXT_PUBLIC_KAKAO_INQUIRY_URL` 외부 링크. SDK와 채팅 연동은 없습니다. |
| 택배 | `CourierService` mock. 송장 수기 입력과 모의 운송장. 택배사는 CJ대한통운, 한진, 롯데, 우체국, 로젠. |
| 세금 문서 | `TaxDocumentService` mock. 요청 / 발급 / 반려만. 국세청 전송 없음. |
| 비회원 주문 | 끄기. 장바구니는 브라우저(`jobsaba.guestCart`)에만 있고, 로그인하면 회원 장바구니로 합칩니다. |
| 포인트 | 쿠폰·포인트 적용 후 상품금액(배송비 제외)의 1%. 결제 완료 시 적립. 만료 1년. 최소 사용 1,000P. 배송비에는 포인트를 쓸 수 없습니다. |
| 쿠폰 | 주문당 1장. 정액/정률, 최소 주문, 최대 할인, 분류 제한, 기간. |
| 할인 순서 | 상품할인 → 쿠폰 → 포인트 → 배송비 → 최종 금액. |
| 배송비 | 기본 3,000원. 쿠폰 적용 후·포인트 적용 전 상품금액 40,000원 이상이면 무료. |
| 가입 혜택 | 2,000P와 3,000원 쿠폰(코드 `WELCOME3000`, 최소 주문 20,000원). |
| 예약 게시판 | 글과 답글만. 픽업 예약 엔진 없음. |
| 1+1 | 뱃지와 모음. 자동으로 상품을 더 주지 않습니다. |
| 주소 | 우편번호 직접 입력. 다음 우편번호 API 없음. |
| 리뷰 | 결제 이후(결제완료~구매확정) 작성. 시드 리뷰는 샘플 표시. |
| 취소 | 출고 전 취소는 즉시 완료되고 재고·쿠폰·포인트를 되돌립니다. 출고 후에는 반품 요청. 환불은 주문 전체만. |

## 필요한 것

- Node.js 20 이상, npm
- Supabase 프로젝트. URL은 `https://ijnflmttfxoajfycgegg.supabase.co` 입니다.
- 브라우저에 넣을 **anon 키**. 서비스 롤 키는 쇼핑 흐름에 쓰지 않으며, 넣더라도 서버 전용 변수로만 둡니다.

이 저장소에는 키가 들어 있지 않습니다. 키 없이는 화면은 빌드되고, 상품 조회와 로그인은 연결되지 않습니다.

## 환경 변수

`.env.example`을 복사합니다.

Windows 명령 프롬프트:

```bat
copy .env.example .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

macOS / Linux:

```bash
cp .env.example .env.local
```

| 변수 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 프로젝트 URL. 예시에 이미 적혀 있습니다. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public 키. 필수. |
| `NEXT_PUBLIC_SITE_URL` | 로컬은 `http://localhost:3000`. Vercel에서는 배포 주소. |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용. 비워 두어도 Phase 1 쇼핑은 동작합니다. `NEXT_PUBLIC_`로 바꾸지 마세요. |
| `PAYMENT_PROVIDER` | `mock` |
| `COURIER_PROVIDER` | `mock` |
| `TAX_DOCUMENT_PROVIDER` | `mock` |
| `NEXT_PUBLIC_KAKAO_INQUIRY_URL` | 카카오 채널 주소. 비우면 고객센터에 자리표시만 나갑니다. |

`.env`, `.env.local`은 git에 올리지 않습니다.

## 로컬 실행

Windows, macOS, Linux 모두 같습니다. Node 20이 잡혀 있는지 `node -v`로 확인한 뒤 프로젝트 폴더에서 실행합니다.

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 을 엽니다.

다른 명령:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

Windows에서 스크립트 실행 정책 때문에 npm이 막히면, Node.js 설치 시 추가된 명령 프롬프트 또는 PowerShell에서 `npm`이 PATH에 있는지 확인합니다. `npm`은 `.cmd`로 동작하므로 Git Bash에서도 `npm install`로 충분합니다.

## Supabase 마이그레이션과 시드

대시보드 → SQL Editor에서 아래 파일을 **위에서 아래 순서**로 실행합니다. 이미 적용한 파일은 다시 실행하지 않습니다.

1. `supabase/migrations/20261008100000_schema.sql`
2. `supabase/migrations/20261008100100_functions.sql`
3. `supabase/migrations/20261008100200_rls.sql`
4. `supabase/migrations/20261008100300_storage.sql`
5. `supabase/migrations/20261008100400_seed.sql`

스키마는 회원, 상품, 장바구니, 주문, 결제, 배송, 취소·반품·환불, 리뷰, 게시판, 문의, 쿠폰, 포인트 원장, 재고, 발주, 이벤트, 배너, 관리 로그, 증빙을 포함합니다.

RLS는 본인 주문·찜·장바구니·문의·포인트·쿠폰만 본인에게 열고, 카탈로그와 공개 리뷰는 누구나 읽게 하며, 상품 쓰기는 관리자만 허용합니다.

Storage 버킷은 `product-images`, `review-images`, `board-attachments`, `event-assets`입니다. 상품·리뷰·이벤트 이미지는 공개 읽기이고, 게시판 첨부는 본인 폴더 또는 관리자만 읽습니다.

시드는 여섯 분류와 샘플 상품, 쿠폰, 공지, FAQ, 샘플 리뷰를 넣습니다. 상품 그림은 저장소의 원본 SVG이며 외부 사진을 복사하지 않았습니다.

로컬 Docker Supabase CLI가 있다면 같은 SQL을 `supabase db query --file` 또는 `supabase migration up`으로 적용할 수 있습니다. 이 앱은 원격 프로젝트 URL을 환경 변수로만 읽습니다.

### Auth 설정

Supabase → Authentication → URL Configuration:

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/callback`

이메일 가입을 켭니다. 로컬에서 바로 로그인하려면 Confirm email을 끄거나, 가입 메일의 확인 링크를 누릅니다. 확인 메일이 안 오면 Authentication → Users에서 사용자를 수동으로 확인합니다.

### 관리자 만들기

1. 사이트에서 회원가입합니다.
2. SQL Editor에서 이메일을 본인 것으로 바꿔 실행합니다.

```sql
update public.profiles
set role = 'admin', status = 'active'
where email = 'you@example.com';
```

3. 다시 로그인하면 상단의 관리 링크와 `/admin`이 열립니다.

모의 결제가 거절되면 시드의 `allow_mock_checkout`이 참인지 확인합니다.

```sql
select key, value from public.shop_settings where key = 'allow_mock_checkout';
```

## Vercel

1. 이 저장소를 Vercel 프로젝트로 가져옵니다. Framework는 Next.js, 설치는 `npm install`, 빌드는 `npm run build`입니다.
2. Environment Variables에 위 표를 넣습니다. `NEXT_PUBLIC_SITE_URL`은 `https://프로젝트.vercel.app`처럼 실제 주소로 둡니다.
3. `SUPABASE_SERVICE_ROLE_KEY`를 넣는다면 Production의 서버 변수로만 넣고, 이름 앞에 `NEXT_PUBLIC_`를 붙이지 않습니다.
4. Supabase Redirect URLs에 `https://프로젝트.vercel.app/auth/callback`을 추가합니다.
5. 배포 후 가입 → 관리자 role 변경 → 상품 하나가 보이는지 확인합니다.

데이터베이스는 Vercel이 아니라 Supabase에 있습니다. 마이그레이션은 배포와 별도로 SQL Editor에서 적용합니다.

## 테스트 순서

1. 가입합니다. 약관 동의 후 로그인합니다.
2. 검색에서 상품을 찾고 장바구니에 담습니다. 로그아웃 상태의 장바구니는 로그인 후 회원 장바구니로 합쳐집니다.
3. 결제 화면에서 보유 쿠폰과 1,000P 이상을 적용합니다. 금액은 서버가 다시 계산합니다.
4. 모의 결제를 완료하고 주문번호 화면과 마이페이지 주문내역을 확인합니다.
5. 상품준비 전에 취소하면 취소 이력, 재고, 쿠폰, 포인트가 되돌아갑니다. 배송이 시작된 뒤에는 반품 요청만 됩니다.
6. 관리자로 상품을 등록하고, 상세에서 이미지를 올리고, 재고를 바꿉니다.
7. 관리자 주문 화면에서 상태를 바꿉니다. 배송 화면에서 모의 송장을 발급하면 마이페이지에 배송중이 보입니다.

자동 검증:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

`npm test`는 할인 → 쿠폰 → 포인트 → 배송비와 포인트 원장(FIFO, 만료, 취소 복원)을 검증합니다. 데이터베이스가 없어도 `npm run build`는 성공해야 합니다.

## 구현과 모의 기능

구현된 흐름: 가입, 로그인, 아이디 찾기(마스킹), 비밀번호 재설정, 검색·카테고리·상품 상세, 장바구니·찜, 쿠폰·포인트 결제, 모의 결제, 주문내역, 출고 전 취소와 취소 이력, 반품 요청, 마이페이지, 게시판, 공지, FAQ, 1:1 문의, FAQ 챗봇, 관리자 상품·재고·주문·회원·고객센터·프로모션·리뷰·증빙.

모의 기능: 결제 승인/실패/환불, 택배 운송장, 세금계산서·현금영수증 상태, 카카오 링크.

아직 없는 것: 실 PG, 실 택배 추적, 국세청 문서, 다음 우편번호, 게스트 결제, 부분 환불, 1+1 자동 증정, 예약 확정 엔진.
