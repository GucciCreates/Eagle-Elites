import Link from 'next/link';
import Logo from '@/components/brand/logo';
import Icon from '@/components/ui/icons';
import { BRAND, WHATSAPP_GENERAL } from '@/lib/brand';

/** Footer plus the always-reachable WhatsApp actions, shared by public pages. */
export default function SiteFooter({ whatsapp = WHATSAPP_GENERAL }: { whatsapp?: string }) {
  return (
    <>
      <footer className="border-t border-white/10 px-5 pb-28 pt-10 sm:px-8 md:pb-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <Logo />
            <p className="mt-4 text-sm font-semibold text-zinc-300">{BRAND.legalName}</p>
            <p className="mt-1 text-xs text-zinc-500">{BRAND.registration}</p>
            <p className="mt-1 text-xs text-zinc-500">© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-1 text-sm text-zinc-400">
            <Link prefetch={false} href="/auth/signup" className="py-2 hover:text-white">Reserve a seat</Link>
            <Link prefetch={false} href="/admin/login" className="py-2 hover:text-white">Admin portal</Link>
            <Link prefetch={false} href="/auth/login" className="py-2 hover:text-white">Rider login</Link>
            <Link prefetch={false} href="/driver/login" className="py-2 hover:text-white">Driver portal</Link>
            <Link href="/#faq" className="py-2 hover:text-white">FAQ</Link>
            <a href="#top" className="py-2 hover:text-white">Back to top</a>
          </nav>
        </div>
      </footer>

      {/* WhatsApp is always one tap away: sticky bar on phones, button on desktop. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#070b10]/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-2 gap-2">
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="ee-btn ee-btn-whatsapp">
            <Icon name="whatsapp" size={20} /> WhatsApp
          </a>
          <Link prefetch={false} href="/auth/signup" className="ee-btn ee-btn-primary">
            Reserve my seat
          </Link>
        </div>
      </div>
      <a
        href={whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Eagle Elites on WhatsApp"
        className="ee-btn ee-btn-whatsapp fixed bottom-6 right-6 z-40 hidden h-14 w-14 rounded-full px-0 shadow-xl shadow-black/40 md:inline-flex"
      >
        <Icon name="whatsapp" size={26} />
      </a>
    </>
  );
}
