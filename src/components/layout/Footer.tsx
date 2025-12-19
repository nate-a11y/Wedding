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

          {/* Animated Divider */}
          <div className="relative my-8 flex justify-center">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
              className="h-[2px] w-48 md:w-64 bg-gradient-to-r from-transparent via-gold-500 to-transparent"
            />
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gold-500"
              initial={{ scale: 0 }}
              whileInView={{ scale: [0, 1.5, 1] }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.7 }}
            />
          </div>

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
