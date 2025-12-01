'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { siteConfig } from '@/config/site';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-charcoal text-white py-16">
      <div className="container-wedding">
        <div className="text-center">
          {/* Names */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="font-accent text-4xl text-gold-500 mb-2">
              Nate & Blake
            </p>
            <p className="font-heading text-xl text-olive-300 tracking-wider">
              October 31, 2027
            </p>
          </motion.div>

          {/* Divider */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="gold-line mx-auto my-8"
          />

          {/* Quick Links */}
          <motion.nav
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-6 mb-8"
          >
            {siteConfig.navigation.slice(0, 5).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-olive-300 hover:text-gold-500 transition-colors text-sm uppercase tracking-wider"
              >
                {item.name}
              </Link>
            ))}
          </motion.nav>

          {/* Hashtag */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <p className="text-gold-500 font-medium text-xl mb-2">
              #NateAndBlakeSayIDo2027
            </p>
            <p className="text-olive-400 text-sm">
              Share your photos with our wedding hashtag!
            </p>
          </motion.div>

          {/* Copyright */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="text-olive-400 text-sm"
          >
            Made with love · {currentYear}
          </motion.p>
        </div>
      </div>
    </footer>
  );
}
