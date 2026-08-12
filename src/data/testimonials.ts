// The three real seller testimonial videos — each matches a documented
// purchase in the Sanity deal records (the core credibility asset, plan §1).
//
// muxPlaybackId: null → the VideoCard renders the click-to-load
// youtube-nocookie facade. When the owner uploads a video to Mux, paste its
// Playback ID here and that card switches to the clean Mux player. ⚑
//
// Seller display labels are context-based (no full names) pending explicit
// permission (plan §16.4).

export interface Testimonial {
  slug: string;
  youtubeId: string;
  muxPlaybackId: string | null;
  uploadDate: string; // ISO — from the YouTube channel records
  title: string;
  sellerLabel: string;
  context: string;
  quote: string | null;
  /** Matching transaction in the deal records */
  match: {
    address: string;
    area: string;
    quarter: string;
    status: "Sold" | "Assigned";
  };
}

export const testimonials: Testimonial[] = [
  {
    slug: "memorial-drive",
    youtubeId: "gmGcCpwWiMU",
    muxPlaybackId: null,
    uploadDate: "2024-08-18",
    title: "Sold in four days, days before a foreclosure deadline",
    sellerLabel: "Memorial Drive seller",
    context: "East Atlanta · Facing a foreclosure deadline · Purchased 2020",
    quote:
      "Very quick, very easy... we closed in 4 days. I spoke with you on Monday and here we are on Thursday.",
    match: {
      address: "2246 Memorial Dr SE, Atlanta, GA",
      area: "East Atlanta",
      quarter: "2020 Q3",
      status: "Sold",
    },
  },
  {
    slug: "amberidge",
    youtubeId: "58MALezZXpQ",
    muxPlaybackId: null,
    uploadDate: "2024-08-18",
    title: "The Amberidge Drive story",
    sellerLabel: "Amberidge Drive seller",
    context: "Cartersville · Purchased 2022",
    quote: null,
    match: {
      address: "110 Amberidge Dr, Cartersville, GA",
      area: "Cartersville",
      quarter: "2022 Q1",
      status: "Assigned",
    },
  },
  {
    slug: "wellington",
    youtubeId: "3qn9_7rSgAg",
    muxPlaybackId: null,
    uploadDate: "2024-08-18",
    title: "The Wellington Avenue story",
    sellerLabel: "Wellington Avenue seller",
    context: "Gainesville · Purchased 2022",
    quote: null,
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
    ? `https://image.mux.com/${t.muxPlaybackId}/thumbnail.webp?width=1280`
    : `https://i.ytimg.com/vi/${t.youtubeId}/hqdefault.jpg`,
  uploadDate: t.uploadDate,
  embedUrl: t.muxPlaybackId
    ? `https://stream.mux.com/${t.muxPlaybackId}.m3u8`
    : `https://www.youtube-nocookie.com/embed/${t.youtubeId}`,
  publisher: { "@type": "Organization", name: "Hendrix Ventures Group LLC", url: site },
});
