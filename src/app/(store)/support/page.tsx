import Link from "next/link";

export const metadata = { title: "고객센터" };

const kakao = process.env.NEXT_PUBLIC_KAKAO_INQUIRY_URL || "https://pf.kakao.com/";

export default function SupportPage() {
  return (
    <div>
      <h1 className="serif text-4xl">고객센터</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted">공지, 자주 묻는 질문, 1:1 문의, 카카오 채널로 연결됩니다.</p>
      <ul className="mt-6 grid gap-3 md:grid-cols-2">
        {[
          ["/support/notice", "공지", "배송과 운영 안내"],
          ["/support/faq", "FAQ", "배송, 교환, 포인트"],
          ["/support/inquiry", "1:1 문의", "주문 건별 질문"],
          ["/community/qna", "Q&A", "공개 게시판"],
        ].map(([href, title, body]) => (
          <li key={href}>
            <Link href={href} className="panel block p-5">
              <p className="font-semibold">{title}</p>
              <p className="mt-1 text-sm text-muted">{body}</p>
            </Link>
          </li>
        ))}
      </ul>
      <a href={kakao} className="btn btn-primary mt-6" target="_blank" rel="noreferrer">
        카카오 문의
      </a>
      <p className="mt-2 text-xs text-muted">채널 주소는 NEXT_PUBLIC_KAKAO_INQUIRY_URL 로 바꿉니다. 비어 있으면 카카오 채널 홈으로 이동합니다.</p>
    </div>
  );
}
