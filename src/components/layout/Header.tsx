'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';

type NavItem = (typeof siteConfig.navigation)[number];

function hasChildren(item: NavItem): item is NavItem & { children: { name: string; href: string }[] } {
  return 'children' in item && Array.isArray(item.children);
}

function isHighlighted(item: NavItem): item is NavItem & { highlight: boolean } {
  return 'highlight' in item && item.highlight === true;
}

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [expandedMobileItem, setExpandedMobileItem] = useState<string | null>(null);
  const pathname = usePathname();
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setOpenDropdown(null);
  }, [pathname]);

  // Check if any child is active
  const isChildActive = (item: NavItem) => {
    if (!hasChildren(item)) return false;
    return item.children.some(child => pathname === child.href);
  };

  const handleMouseEnter = (name: string) => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    setOpenDropdown(name);
  };

  const handleMouseLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 150);
  };

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-charcoal shadow-elegant py-3'
          : 'bg-charcoal/95 backdrop-blur-md py-5'
      )}
    >
      <nav className="container-wedding">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="relative z-10">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex flex-col items-center"
            >
              <span className="font-accent-logo text-2xl md:text-3xl text-gold-500">
                N & B
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-olive-300 font-medium">
                10.31.27
              </span>
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {siteConfig.navigation.map((item) => {
              const isActive = pathname === item.href || isChildActive(item);
              const hasDropdown = hasChildren(item);
              const highlighted = isHighlighted(item);

              if (hasDropdown) {
                return (
                  <div
                    key={item.name}
                    className="relative"
                    onMouseEnter={() => handleMouseEnter(item.name)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <button
                      className={cn(
                        'flex items-center gap-1 px-4 py-2 text-sm uppercase tracking-wider font-medium transition-colors rounded-lg',
                        isActive
                          ? 'text-gold-400'
                          : 'text-cream hover:text-gold-400 hover:bg-olive-800/30'
                      )}
                    >
                      {item.name}
                      <svg
                        className={cn(
                          'w-3 h-3 transition-transform',
                          openDropdown === item.name && 'rotate-180'
                        )}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    <AnimatePresence>
                      {openDropdown === item.name && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full left-0 mt-1 py-2 bg-charcoal border border-olive-700 rounded-lg shadow-elegant min-w-[180px]"
                        >
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={cn(
                                'block px-4 py-2 text-sm transition-colors',
                                pathname === child.href
                                  ? 'text-gold-400 bg-olive-800/30'
                                  : 'text-cream hover:text-gold-400 hover:bg-olive-800/30'
                              )}
                            >
                              {child.name}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-4 py-2 text-sm uppercase tracking-wider font-medium transition-all rounded-lg',
                    highlighted
                      ? 'bg-gold-500 text-charcoal hover:bg-gold-400 font-semibold'
                      : isActive
                        ? 'text-gold-400'
                        : 'text-cream hover:text-gold-400 hover:bg-olive-800/30'
                  )}
                  style={highlighted ? { color: '#000000' } : undefined}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden relative z-10 p-2"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
          >
            <div className="w-6 h-5 flex flex-col justify-between">
              <motion.span
                animate={isMobileMenuOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }}
                className="w-full h-0.5 bg-cream block origin-left"
              />
              <motion.span
                animate={isMobileMenuOpen ? { opacity: 0 } : { opacity: 1 }}
                className="w-full h-0.5 bg-cream block"
              />
              <motion.span
                animate={isMobileMenuOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }}
                className="w-full h-0.5 bg-cream block origin-left"
              />
            </div>
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden overflow-hidden"
            >
              <div className="py-6 flex flex-col gap-2 bg-charcoal">
                {siteConfig.navigation.map((item, index) => {
                  const hasDropdown = hasChildren(item);
                  const highlighted = isHighlighted(item);
                  const isExpanded = expandedMobileItem === item.name;

                  if (hasDropdown) {
                    return (
                      <motion.div
                        key={item.name}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <button
                          onClick={() => setExpandedMobileItem(isExpanded ? null : item.name)}
                          className={cn(
                            'w-full flex items-center justify-between px-4 py-3 text-lg font-heading transition-colors rounded-lg',
                            isChildActive(item)
                              ? 'text-gold-400'
                              : 'text-cream hover:text-gold-400'
                          )}
                        >
                          {item.name}
                          <svg
                            className={cn(
                              'w-4 h-4 transition-transform',
                              isExpanded && 'rotate-180'
                            )}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="pl-6 py-2 space-y-1">
                                {item.children.map((child) => (
                                  <Link
                                    key={child.href}
                                    href={child.href}
                                    className={cn(
                                      'block px-4 py-2 text-base transition-colors rounded-lg',
                                      pathname === child.href
                                        ? 'text-gold-400 bg-olive-800/30'
                                        : 'text-olive-300 hover:text-gold-400'
                                    )}
                                  >
                                    {child.name}
                                  </Link>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  }

                  return (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        href={item.href}
                        className={cn(
                          'block px-4 py-3 text-lg font-heading transition-colors rounded-lg',
                          highlighted
                            ? 'bg-gold-500 text-charcoal font-semibold text-center mx-4'
                            : pathname === item.href
                              ? 'text-gold-400'
                              : 'text-cream hover:text-gold-400'
                        )}
                        style={highlighted ? { color: '#000000' } : undefined}
                      >
                        {item.name}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
