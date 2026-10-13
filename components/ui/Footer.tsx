import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="relative z-10 w-full bg-surface-container-low/70 py-10 mt-16 border-t border-white/5">
            <div className="w-full max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-on-surface-variant text-[13px]">
                <div className="flex items-center gap-3">
                    <span className="font-headline text-[15px] font-semibold text-on-surface">Café Compass</span>
                    <span className="text-outline">— Ambient hospitality intelligence powered by Gemini</span>
                </div>
                <div className="flex items-center gap-6 font-headline text-[12px]">
                    <Link href="#" className="hover:text-on-surface transition-colors">
                        Privacy & Acoustic Shield
                    </Link>
                    <Link href="#" className="hover:text-on-surface transition-colors">
                        Terms
                    </Link>
                    <Link href="#" className="hover:text-on-surface transition-colors">
                        Acoustic Standards
                    </Link>
                    <Link href="#" className="hover:text-on-surface transition-colors">
                        Gemini Diagnostics
                    </Link>
                </div>
            </div>
        </footer>
    );
}
