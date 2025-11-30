import { Header, Footer } from '@/components/layout';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-20">{children}</main>
      <Footer />
    </>
  );
}
