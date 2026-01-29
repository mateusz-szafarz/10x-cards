import { useState } from 'react';
import { Menu, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface NavbarProps {
  user: {
    email: string;
  };
  currentPath: string;
}

export default function Navbar({ user, currentPath }: NavbarProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      // Always redirect, even if API fails
      window.location.href = '/login';
    }
  };

  const navLinks = [
    { href: '/generate', label: 'Generate' },
    { href: '/flashcards', label: 'My Flashcards' },
  ];

  const isActive = (href: string) => currentPath === href;

  return (
    <header className="bg-background sticky top-0 z-50 h-16 w-full border-b">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <a href="/flashcards" className="text-xl font-bold transition-opacity hover:opacity-80">
          10x Cards
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-6 sm:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`hover:text-primary text-sm font-medium transition-colors ${
                isActive(link.href) ? 'text-foreground border-primary border-b-2' : 'text-muted-foreground'
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* User Actions */}
        <div className="flex items-center gap-2">
          {/* User Dropdown (Desktop) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hidden sm:flex">
                <User className="h-5 w-5" />
                <span className="sr-only">User menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm leading-none font-medium">Account</p>
                  <p className="text-muted-foreground text-xs leading-none">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu */}
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="sm:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-8 flex flex-col gap-4">
                {/* User info */}
                <div className="flex items-center gap-2 border-b pb-4">
                  <User className="text-muted-foreground h-5 w-5" />
                  <span className="text-muted-foreground truncate text-sm">{user.email}</span>
                </div>

                {/* Navigation links */}
                <nav className="flex flex-col gap-2">
                  {navLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsSheetOpen(false)}
                      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                        isActive(link.href) ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                      }`}
                    >
                      {link.label}
                    </a>
                  ))}
                </nav>

                {/* Logout button */}
                <Button variant="outline" onClick={handleLogout} className="mt-4 justify-start">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
