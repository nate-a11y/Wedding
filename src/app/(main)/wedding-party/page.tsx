'use client';

import { motion } from 'framer-motion';
import { siteConfig } from '@/config/site';

interface PartyMember {
  name: string;
  role: string;
  relation: string;
  bio: string;
  photo: string;
  isHuman?: boolean;
}

function PartyMemberCard({ member, index }: { member: PartyMember; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="group"
    >
      <div className="bg-black/50 border border-olive-700 rounded-lg overflow-hidden hover:border-gold-500/50 transition-colors">
        {/* Photo */}
        <div className="aspect-[3/4] bg-olive-900/50 relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Placeholder - replace with actual image when available */}
            <div className="w-24 h-24 rounded-full bg-olive-800 flex items-center justify-center">
              <svg className="w-12 h-12 text-olive-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          {/* Uncomment when photos are added:
          <img
            src={member.photo}
            alt={member.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          */}
        </div>

        {/* Info */}
        <div className="p-4 text-center">
          <h3 className="font-heading text-xl text-cream mb-1">{member.name}</h3>
          <p className="text-gold-400 font-medium mb-1">{member.role}</p>
          <p className="text-olive-400 text-sm mb-3">{member.relation}</p>
          {member.bio && member.bio !== 'Add bio here...' && (
            <p className="text-olive-300 text-sm leading-relaxed">{member.bio}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function WeddingPartyPage() {
  const { weddingParty, couple } = siteConfig;

  return (
    <div className="section-padding bg-charcoal min-h-screen">
      <div className="container-wedding">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="font-accent text-3xl text-gold-500 mb-2">Meet Our</p>
          <h1 className="font-heading text-4xl md:text-5xl text-cream mb-4">
            Wedding Party
          </h1>
          <div className="gold-line mx-auto mb-6" />
          <p className="text-olive-300 max-w-2xl mx-auto">
            These are the wonderful people who will stand beside us on our special day.
            We are so grateful for their love and support.
          </p>
        </motion.div>

        {/* Groom's Side */}
        {weddingParty.groomsmen.length > 0 && (
          <section className="mb-16">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center mb-8"
            >
              <h2 className="font-heading text-2xl text-cream mb-2">
                {couple.person1.firstName}&apos;s Side
              </h2>
              <div className="w-16 h-px bg-gold-500/50 mx-auto" />
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {weddingParty.groomsmen.map((member, index) => (
                <PartyMemberCard key={member.name} member={member} index={index} />
              ))}
            </div>
          </section>
        )}

        {/* Bride's Side */}
        {weddingParty.bridesmaids.length > 0 && (
          <section className="mb-16">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center mb-8"
            >
              <h2 className="font-heading text-2xl text-cream mb-2">
                {couple.person2.firstName}&apos;s Side
              </h2>
              <div className="w-16 h-px bg-gold-500/50 mx-auto" />
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {weddingParty.bridesmaids.map((member, index) => (
                <PartyMemberCard key={member.name} member={member} index={index} />
              ))}
            </div>
          </section>
        )}

        {/* Special Roles */}
        {weddingParty.special.length > 0 && (
          <section className="mb-16">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center mb-8"
            >
              <h2 className="font-heading text-2xl text-cream mb-2">
                Special Members
              </h2>
              <div className="w-16 h-px bg-gold-500/50 mx-auto" />
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {weddingParty.special.map((member, index) => (
                <PartyMemberCard key={member.name} member={member} index={index} />
              ))}
            </div>
          </section>
        )}

        {/* Parents */}
        <section>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="font-heading text-2xl text-cream mb-2">
              Our Parents
            </h2>
            <div className="w-16 h-px bg-gold-500/50 mx-auto" />
          </motion.div>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Groom's Parents */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-black/50 border border-olive-700 rounded-lg p-6 text-center"
            >
              <h3 className="font-heading text-xl text-gold-400 mb-4">
                Parents of {couple.person1.firstName}
              </h3>
              {weddingParty.parents.groomParents.map((parent, idx) => (
                <p key={idx} className="text-cream">{parent.name}</p>
              ))}
            </motion.div>

            {/* Bride's Parents */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-black/50 border border-olive-700 rounded-lg p-6 text-center"
            >
              <h3 className="font-heading text-xl text-gold-400 mb-4">
                Parents of {couple.person2.firstName}
              </h3>
              {weddingParty.parents.brideParents.map((parent, idx) => (
                <p key={idx} className="text-cream">{parent.name}</p>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Thank You Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-16 py-8 border-t border-olive-700"
        >
          <p className="font-accent text-2xl text-gold-500 mb-2">Thank You</p>
          <p className="text-olive-300 max-w-xl mx-auto">
            We are so blessed to have each of you in our lives.
            Thank you for being part of our journey.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
