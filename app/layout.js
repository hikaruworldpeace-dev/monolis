import "./globals.css";

export const metadata = {
  title: "monolis | みんなの旅を、もっとスムーズに。",
  description:
    "旅行の準備から思い出まで、これ一つ。持ち物・タスク・旅程・お金をまとめて管理できる旅行管理サービス「monolis」。",
  icons: {
    icon: "/logo-icon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#F8FAFC",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
