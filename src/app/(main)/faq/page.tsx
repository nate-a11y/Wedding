'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
  {
    category: 'General',
    questions: [
      {
        question: 'When is the wedding?',
        answer: 'Our wedding will be on October 31, 2027 - exactly four years after we first met!',
      },
      {
        question: 'Where is the wedding?',
        answer: 'Our wedding will be at The Callaway Jewel in Fulton, Missouri. The address is 4910 County Rd 105, Fulton, MO 65251.',
      },
      {
        question: 'What time should I arrive?',
        answer: 'Please arrive by 3:30 PM. The ceremony begins at 4:00 PM, and we ask that all guests be seated by 3:45 PM.',
      },
    ],
  },
  {
    category: 'RSVP',
    questions: [
      {
        question: 'When do I need to RSVP by?',
        answer: 'Please RSVP by September 1, 2027. RSVPs open on April 1, 2027.',
      },
      {
        question: 'Can I bring a date?',
        answer: 'Your invitation will indicate if you have a plus one. If you have questions about your invite, please reach out to us directly.',
      },
      {
        question: 'Are kids welcome?',
        answer: 'Children are welcome, but be advised: if your child becomes disruptive during the ceremony or reception, you will be asked to leave with them. This is our day and we expect it to go smoothly. Please include all children when you RSVP.',
      },
    ],
  },
  {
    category: 'Attire & Details',
    questions: [
      {
        question: 'What is the dress code?',
        answer: 'The dress code is formal/black tie optional. We want everyone to feel elegant! Given it\'s Halloween, feel free to incorporate subtle festive touches if you\'d like, but costumes are not required.',
      },
      {
        question: 'What colors should I avoid wearing?',
        answer: 'We kindly ask guests to avoid wearing white, ivory, or cream - those are reserved for the wedding party. Our wedding colors are olive green, black, and gold if you\'d like some inspiration!',
      },
      {
        question: 'Will the wedding be indoors or outdoors?',
        answer: 'The Callaway Jewel offers both indoor and outdoor spaces. We\'ll share more specific details closer to the date, so you can dress appropriately!',
      },
    ],
  },
  {
    category: 'Gifts & Registry',
    questions: [
      {
        question: 'Do you have a registry?',
        answer: 'Yes! We\'re registered at Amazon, Crate & Barrel, Williams Sonoma, and Target. We also have a honeymoon fund. Visit our Registry page for links. Your presence at our wedding is the greatest gift of all!',
      },
      {
        question: 'Can I send a gift if I can\'t attend?',
        answer: 'While we\'ll miss you if you can\'t make it, gifts are never expected. If you\'d like to send something, you can find our registry links on the Registry page of this site.',
      },
    ],
  },
  {
    category: 'Day-Of Details',
    questions: [
      {
        question: 'Is there parking at the venue?',
        answer: 'Yes! There is plenty of free parking available on-site at The Callaway Jewel.',
      },
      {
        question: 'Will there be an open bar?',
        answer: 'Yes! We\'ll have a full open bar for the reception. Please drink responsibly and plan for a safe ride home.',
      },
      {
        question: 'Can I take photos during the ceremony?',
        answer: 'We ask that you keep your phones put away during the ceremony so you can be fully present. We\'ll have a professional photographer capturing everything. Feel free to take photos during the reception!',
      },
    ],
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-olive-200 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 flex items-center justify-between text-left"
        aria-expanded={isOpen}
      >
        <span className="font-medium text-cream pr-4">{question}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-olive-400 flex-shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-olive-300">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="section-padding bg-charcoal">
      <div className="container-wedding">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="font-accent text-3xl text-gold-500 mb-4">FAQ</p>
          <h1 className="font-heading text-4xl md:text-5xl text-cream mb-6">
            Questions & Answers
          </h1>
          <div className="gold-line mx-auto mb-8" />
          <p className="text-olive-300 max-w-2xl mx-auto text-lg">
            Find answers to commonly asked questions about our wedding. If you don&apos;t see
            your question here, feel free to reach out!
          </p>
        </motion.div>

        {/* FAQ Categories */}
        <div className="max-w-3xl mx-auto space-y-8">
          {faqs.map((category, categoryIndex) => (
            <motion.div
              key={category.category}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: categoryIndex * 0.1 }}
              className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant overflow-hidden"
            >
              <div className="bg-olive-700 px-6 py-3">
                <h2 className="font-heading text-xl text-white">{category.category}</h2>
              </div>
              <div className="px-6">
                {category.questions.map((faq) => (
                  <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-16 text-center"
        >
          <div className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-8 max-w-2xl mx-auto">
            <h3 className="font-heading text-2xl text-cream mb-4">
              Still Have Questions?
            </h3>
            <p className="text-olive-300 mb-6">
              We&apos;re happy to help! Reach out to us directly and we&apos;ll get back to you as soon as possible.
            </p>
            <a
              href="mailto:hello@nateandblake.com"
              className="inline-flex items-center gap-2 text-olive-300 hover:text-olive-400 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              hello@nateandblake.com
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
