'use client';

import { motion } from 'framer-motion';
import { WeatherWidget } from '@/components/sections';

interface DressCodeItem {
  title: string;
  description: string;
  suggestions: string[];
  avoid: string[];
  icon: string;
}

const dressCodeGuide: DressCodeItem[] = [
  {
    title: 'Gentlemen',
    description: 'Semi-formal to formal attire. Think elegant but comfortable for a fall evening celebration.',
    suggestions: [
      'Dark suit (navy, charcoal, black)',
      'Dress shirt with tie or bow tie',
      'Dress shoes (oxfords, loafers)',
      'Optional: Vest or pocket square in gold/olive tones',
    ],
    avoid: [
      'Jeans or casual pants',
      'Sneakers or sandals',
      'T-shirts or casual polo shirts',
      'Overly bright colors',
    ],
    icon: '🤵',
  },
  {
    title: 'Ladies',
    description: 'Cocktail or formal attire. Embrace the autumn palette with rich, elegant colors.',
    suggestions: [
      'Cocktail dress or formal gown',
      'Midi or floor-length dress',
      'Elegant jumpsuit',
      'Fall colors: burgundy, emerald, navy, gold',
    ],
    avoid: [
      'White or ivory (reserved for the couple!)',
      'Overly casual sundresses',
      'Denim or athleisure',
      'Very short or revealing outfits',
    ],
    icon: '👗',
  },
];

const colorPalette = [
  { name: 'Olive Green', hex: '#536537', class: 'bg-olive-500' },
  { name: 'Deep Forest', hex: '#374225', class: 'bg-olive-700' },
  { name: 'Gold', hex: '#D4AF37', class: 'bg-gold-500' },
  { name: 'Burgundy', hex: '#722F37', class: 'bg-[#722F37]' },
  { name: 'Navy', hex: '#1a3a5c', class: 'bg-[#1a3a5c]' },
  { name: 'Champagne', hex: '#F7E7CE', class: 'bg-[#F7E7CE]' },
];

export default function DressCodePage() {
  return (
    <div className="section-padding bg-charcoal">
      <div className="container-wedding">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <p className="font-accent text-3xl text-gold-500 mb-4">What to Wear</p>
          <h1 className="font-heading text-4xl md:text-5xl text-cream mb-6">
            Dress Code
          </h1>
          <div className="gold-line mx-auto mb-8" />
          <p className="text-olive-300 text-lg">
            Semi-Formal / Cocktail Attire
          </p>
          <p className="text-olive-400 mt-2">
            Our Halloween wedding celebrates elegance with a touch of autumn magic.
            Dress to impress while staying comfortable for an evening of celebration!
          </p>
        </motion.div>

        {/* Weather Widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-xl mx-auto mb-12"
        >
          <WeatherWidget />
        </motion.div>

        {/* Color Palette */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-2xl mx-auto mb-12"
        >
          <h2 className="font-heading text-2xl text-cream text-center mb-6">
            Our Color Palette
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {colorPalette.map((color) => (
              <div key={color.name} className="text-center">
                <div
                  className={`w-16 h-16 mx-auto rounded-full ${color.class} border-2 border-olive-600 shadow-lg`}
                  style={{ backgroundColor: color.hex }}
                />
                <p className="text-olive-300 text-xs mt-2">{color.name}</p>
              </div>
            ))}
          </div>
          <p className="text-olive-500 text-sm text-center mt-4">
            Feel free to incorporate these colors into your outfit!
          </p>
        </motion.div>

        {/* Dress Code Guide */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
          {dressCodeGuide.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
              className="bg-black/50 border border-olive-700 rounded-lg p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">{item.icon}</span>
                <h3 className="font-heading text-2xl text-cream">{item.title}</h3>
              </div>
              <p className="text-olive-300 mb-6">{item.description}</p>

              <div className="mb-4">
                <h4 className="text-gold-500 font-medium mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Suggested
                </h4>
                <ul className="space-y-1">
                  {item.suggestions.map((suggestion, i) => (
                    <li key={i} className="text-olive-400 text-sm flex items-start gap-2">
                      <span className="text-olive-600">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-red-400 font-medium mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Please Avoid
                </h4>
                <ul className="space-y-1">
                  {item.avoid.map((avoidItem, i) => (
                    <li key={i} className="text-olive-500 text-sm flex items-start gap-2">
                      <span className="text-olive-600">•</span>
                      {avoidItem}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Halloween Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="max-w-2xl mx-auto"
        >
          <div className="bg-gradient-to-br from-orange-900/20 to-purple-900/20 border border-gold-500/30 rounded-lg p-6 text-center">
            <span className="text-4xl mb-4 block">🎃</span>
            <h3 className="font-heading text-xl text-cream mb-3">
              It&apos;s a Halloween Wedding!
            </h3>
            <p className="text-olive-300">
              While we&apos;re not having a costume party, feel free to add subtle Halloween flair
              to your outfit if you&apos;d like! Think elegant masquerade masks, spooky-chic jewelry,
              or dark romantic vibes. Just keep it classy!
            </p>
          </div>
        </motion.div>

        {/* Additional Tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-12"
        >
          <div className="bg-black/30 border border-olive-700 rounded-lg p-6 max-w-xl mx-auto">
            <h4 className="font-heading text-lg text-cream mb-3">Practical Tips</h4>
            <ul className="text-olive-400 text-sm space-y-2 text-left">
              <li className="flex items-start gap-2">
                <span>👠</span>
                <span>The Callaway Jewel has both indoor and outdoor areas - comfortable shoes recommended</span>
              </li>
              <li className="flex items-start gap-2">
                <span>🧥</span>
                <span>Bring a jacket or wrap - October evenings can be cool</span>
              </li>
              <li className="flex items-start gap-2">
                <span>📸</span>
                <span>Dress photo-ready - there will be lots of pictures!</span>
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
