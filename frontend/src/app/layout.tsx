import "./globals.css";

export const metadata = {
  title: "사주 에너지 운영 플랫폼",
  description: "사주 기반 개인 에너지 루틴 플랫폼 MVP"
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
