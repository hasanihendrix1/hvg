// Objection-driven FAQ (plan §4 inventory) — every answer honest, several
// deliberately admitting trade-offs. Rendered on /faq and marked up as
// FAQPage JSON-LD (a machine-readable signal; Google no longer shows FAQ
// rich results — that's expected).

export interface Faq {
  q: string;
  a: string;
}

export const faqs: Faq[] = [
  {
    q: "Will you lowball me?",
    a: "Our offer will be below full retail value — we say that out loud because it's true of every cash buyer, whether they admit it or not. The offer is built from what the repaired house would sell for, minus repair costs, our costs, and our profit. What you're buying with that discount is certainty: no repairs, no fees, no showings, no financing fall-through, and a closing date you choose. If your house is in good shape and you have a few months, listing with an agent will likely net you more — and if that's your situation, we'll tell you so on the phone.",
  },
  {
    q: "How do I know this isn't a scam?",
    a: "Check us, please — that's what this site is built for. Our purchases are documented with photos and dates on the Houses We've Bought page, and three sellers tell their own stories on camera. We're a registered Georgia LLC with a listed address, and the owner answers the phone. Two structural protections matter most: we never charge you anything at any point, and every closing is run by an independent Georgia closing attorney — your money flows through the attorney's escrow, never through us, and you never sign a deed outside a supervised closing.",
  },
  {
    q: "Am I obligated to anything if I submit the form or get an offer?",
    a: "No. The offer is free and puts you under no obligation of any kind. It doesn't expire on our schedule, you can take it to your own attorney or agent (we encourage it), and you can tell us no by text if you'd rather not have the conversation. We don't do pressure follow-up.",
  },
  {
    q: "How fast can you actually close?",
    a: "As fast as the title work and the closing attorney allow — one of our documented closings went from first phone call on a Monday to closing that Thursday, and the seller describes it on camera on our reviews page. Just as important: we can also close months out if that's what your move needs. You pick the date.",
  },
  {
    q: "The house is in rough shape. Is that a problem?",
    a: "No — rough is normal for us. Don't clean, don't repair, don't haul anything away; take what you want and leave the rest. One walkthrough (in person or by video) is all we need, and nobody is going to judge the house.",
  },
  {
    q: "What if there are tenants, or the house is inherited or in probate?",
    a: "Bring it to us as it is. We buy occupied rentals and honor existing leases, and we work with estates and heirs regularly — Georgia probate has its own timelines, and the closing attorney coordinates what the estate needs. What we can't do is act as your lawyer, so for probate questions you'll want counsel; we're happy to work alongside them.",
  },
  {
    q: "How do you make money?",
    a: "We buy below full market value, then either repair and resell the house, rent it, or — in some transactions — assign our purchase contract to another buyer who closes it, earning a fee on the assignment. Both paths are on our record page, labeled honestly: 'Sold' means we bought it ourselves, 'Assigned' means another buyer closed the purchase we put under contract. Either way, the price and terms you agreed to don't change.",
  },
  {
    q: "Do I pay anything — fees, commissions, closing costs?",
    a: "No. You pay us nothing at any point, and we cover typical seller closing costs. The offer you accept is the basis of what you walk away with, subject only to what you owe on the house (like a mortgage payoff or liens, which the closing attorney pays off from the proceeds at closing — that's true no matter how you sell).",
  },
  {
    q: "What happens after I submit the form?",
    a: "We call or text you to talk through the house — usually the same day. Then a walkthrough, in person or by video. Then a written offer, usually within 24 hours of the walkthrough. That's the whole machine; there's no drip campaign waiting for you.",
  },
  {
    q: "Are you real estate agents?",
    a: "No. We're a real estate investment company buying as a principal — we are not licensed brokers or agents, we don't list houses, and we don't represent you in the transaction. That's exactly why we tell you plainly when listing with an agent would serve you better, and why we encourage you to have your own attorney or agent look at our offer.",
  },
  {
    q: "Will the offer change at the closing table?",
    a: "No. The number we put in writing is the number at closing. Re-trading — dropping the price at the last minute when the seller has no options left — is the ugliest habit in this industry, and refusing to do it is the core of how we operate. One of our sellers had exactly that happen with a different buyer before finding us; his story is on the reviews page.",
  },
  {
    q: "Which areas do you buy in?",
    a: "Metro Atlanta and surrounding Georgia — our documented purchases include Lithonia, Smyrna, Sandy Springs, Mableton, Douglasville, Cartersville, Gainesville, and Atlanta itself. If you're near but not in those areas, ask; the honest answer might be yes, and if it's no we'll say so quickly.",
  },
];

export const faqSchema = (site: string) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});
