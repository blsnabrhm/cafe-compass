import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
    title: 'Café Compass — Redefining Third-Place Spaces with Gemini',
    description:
        'A symbiotic café ecosystem connecting solitary remote work, serendipitous opt-in community discourse, and anticipatory staff orchestration with Gemini.',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
            <body className="bg-background font-body text-on-surface relative min-h-screen selection:bg-primary-container selection:text-on-primary-container">
                {/* Chromatic Google Aurora Background Spheres */}
                <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none">
                    <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-[#4285F4]/15 blur-[120px] animate-pulse-glow" />
                    <div className="absolute -top-32 right-1/4 h-[440px] w-[440px] rounded-full bg-[#EA4335]/12 blur-[130px]" />
                    <div className="absolute top-1/3 -right-32 h-[480px] w-[480px] rounded-full bg-[#FBBC05]/10 blur-[140px]" />
                    <div className="absolute -bottom-40 left-1/3 h-[500px] w-[500px] rounded-full bg-[#34A853]/12 blur-[120px]" />
                </div>

                <ToastProvider>
                    <Header />
                    <main className="relative z-10 w-full pt-16 bg-transparent min-h-[calc(100vh-64px)]">
                        {children}
                    </main>
                    <Footer />
                </ToastProvider>
            </body>
        </html>
    );
}
