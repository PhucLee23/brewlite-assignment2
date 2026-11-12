import Link from 'next/link';
import { CartLink } from './CartLink';
import { NavLink } from './NavLink';

// Header mobile-first: dính trên cùng, nút đủ lớn cho ngón tay (NFR-08)
export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-latte bg-foam/95 backdrop-blur">
      <nav className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-2 px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-espresso">
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-espresso text-sm text-foam">
            B
          </span>
          <span>BrewLite</span>
        </Link>
        <div className="flex items-center gap-1 whitespace-nowrap text-sm sm:gap-3">
          <NavLink href="/">Menu</NavLink>
          <CartLink />
        </div>
      </nav>
    </header>
  );
}
