// The three real seller testimonial videos — hosted on Mux, matched to
// documented purchases in the deal records (the core credibility asset).
//
// Attribution is verified against the actual audio (auto-transcripts below):
// the "closed in four days" quote is MIKE at the Amberidge closing. First
// names appear only where the seller says them on camera. Quotes are
// verbatim fragments from the transcripts — never paraphrased upward. ⚑
// (Former "foreclosure deadline" framing removed pending owner confirmation
// of which transaction that described.)

export interface Testimonial {
  slug: string;
  youtubeId: string;
  muxPlaybackId: string | null;
  posterTime: number;
  /** CSS object-position for portrait sources rendered in the 16:9 frame;
      undefined keeps the Mux smartcrop poster untouched */
  posterPosition?: string;
  uploadDate: string; // first published on this site via Mux
  title: string;
  sellerLabel: string;
  context: string;
  quote: string | null;
  transcript: string | null;
  match: {
    address: string;
    area: string;
    quarter: string;
    status: "Sold" | "Assigned";
  };
}

export const testimonials: Testimonial[] = [
  {
    slug: "amberidge",
    youtubeId: "58MALezZXpQ",
    muxPlaybackId: "c4BsJUNIzTfPD9BzaVAyFe5wd6bNF7BExBJz1FhQ3qA",
    posterTime: 20,
    uploadDate: "2026-08-12",
    title: "Monday phone call, Thursday closing — after another buyer backed out",
    sellerLabel: "Mike",
    context: "Cartersville · Closed in four days · 2022",
    quote:
      "I was talking to you on Monday and we've closed in four days… Everything that you said has been a hundred percent truthful. You tell me we're gonna close on this day — we're here that day.",
    transcript:
      "All right, so I'm here with Mike at the closing and I just want to ask Mike: how did it go, would you recommend us to other customers, and what are your thoughts? — I very much would recommend y'all and your company. Closed very quickly, very easily. It was a very easy transaction. — How quick was it? — Four days. It was Monday to Thursday. Today's Thursday and I was talking to you on Monday, and we've closed in four days. Very quick, very easy, not a whole lot of issues. — Were we ahead of anyone else? — I spoke with a few other people and they just kept backing out at the last minute. The first person I talked to, I had a contract with them and my house was off the market for almost a month, and then all of a sudden they back out and leave me on the edge. With y'all, from day one, everything that you said has been a hundred percent truthful. You tell me we're gonna close on this day — hey, we're here that day and we're closing. I really do appreciate it and I definitely would recommend you to anybody else — I've already recommended one person, and that was only yesterday. If I ever need to deal with this again I will definitely be contacting y'all.",
    match: {
      address: "110 Amberidge Dr, Cartersville, GA",
      area: "Cartersville",
      quarter: "2022 Q1",
      status: "Assigned",
    },
  },
  {
    slug: "memorial-drive",
    youtubeId: "gmGcCpwWiMU",
    muxPlaybackId: "0128JxbQQnLBdOYBxuitvawQSVRMSEQEU7boBSVul8Os",
    posterTime: 8,
    posterPosition: "50% 24%",
    uploadDate: "2026-08-12",
    title: "Ms. Henderson's East Atlanta closing",
    sellerLabel: "Ms. Henderson",
    context: "East Atlanta · Purchased 2020",
    quote:
      "You did a wonderful job, and yes, I would recommend any other customers that I can.",
    transcript:
      "I have the pleasure of working with Ms. Henderson on selling her home, and I just wanted to ask her how the process went and whether she'd recommend it. — Yes, definitely. I appreciate you — did a wonderful job, and yes, I would recommend any other customers that I can. I appreciate the process. Thank you. — (A second family member adds:) He did it, he did it — I was waiting for the shoe to fall.",
    match: {
      address: "2246 Memorial Dr SE, Atlanta, GA",
      area: "East Atlanta",
      quarter: "2020 Q3",
      status: "Sold",
    },
  },
  {
    slug: "wellington",
    youtubeId: "3qn9_7rSgAg",
    muxPlaybackId: "RqJvLPbL65lZylua502kJjEn5Dwp8XmMkqh1ga1ozJco",
    posterTime: 10,
    posterPosition: "50% 42%",
    uploadDate: "2026-08-12",
    title: "Tom's Gainesville sale — his primary residence",
    sellerLabel: "Tom",
    context: "Gainesville · Purchased 2022",
    quote:
      "Very pleasant, very straightforward, fair deal — there's just no negatives at all.",
    transcript:
      "I'm Hasani with Hendrix Ventures and to my right I have Tom. Tom, how was it working with us — did you enjoy the process, any thoughts for potential sellers? — It's all straightforward. Excellent, good communication, and where either one of us needed a little give-and-take to get the paperwork in order, it worked out well. — One last question: this was your primary residence. Any thoughts for anyone that might be unsure about working with us as a buyer if they need to move? — Oh no, it was very pleasant. Very straightforward, fair deal. There's just no negatives at all. — Thank you very much, Tom.",
    match: {
      address: "5984 Wellington Ave, Gainesville, GA",
      area: "Gainesville",
      quarter: "2022 Q1",
      status: "Assigned",
    },
  },
];

export const videoSchema = (t: Testimonial, site: string) => ({
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: t.title,
  description: `${t.sellerLabel} describes selling their house to Hendrix Ventures Group. ${t.context}.`,
  thumbnailUrl: t.muxPlaybackId
    ? `https://image.mux.com/${t.muxPlaybackId}/thumbnail.webp?width=1280&height=720&fit_mode=smartcrop&time=${t.posterTime}`
    : `https://i.ytimg.com/vi/${t.youtubeId}/hqdefault.jpg`,
  uploadDate: t.uploadDate,
  contentUrl: t.muxPlaybackId
    ? `https://stream.mux.com/${t.muxPlaybackId}.m3u8`
    : undefined,
  embedUrl: t.muxPlaybackId
    ? `https://stream.mux.com/${t.muxPlaybackId}.m3u8`
    : `https://www.youtube-nocookie.com/embed/${t.youtubeId}`,
  transcript: t.transcript ?? undefined,
  publisher: {
    "@type": "Organization",
    name: "Hendrix Ventures Group LLC",
    url: site,
  },
});
