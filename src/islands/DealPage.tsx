import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import "../styles/deal-page.css";
import {
  BUYER_CONSENT_TEXT,
  BUYER_DEAL_ALERTS_CONSENT_TEXT,
  BUYER_DEAL_UPDATES_CONSENT_TEXT,
} from "../data/consent";
import {
  drivePhotoUrl,
  phoneDisplay,
  readDealPageState,
  usd,
  type DealPageContent,
  type DealPageState,
} from "../data/deal-page";

// Same rule as the buyer sign-up: area code and exchange never start with 0 or 1.
const PHONE_REGEX =
  /^(?:\+?1[-. ]?)?\(?([2-9][0-9]{2})\)?[-. ]?([2-9][0-9]{2})[-. ]?([0-9]{4})$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Screen =
  | "page"
  | "interested"
  | "interestedSent"
  | "offerAsk"
  | "offerDetails"
  | "offerReview"
  | "offerSent";

type Choice = "unseen" | "walkthrough" | null;

type Contact = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  consent: boolean;
  dealAlerts: boolean;
  dealUpdates: boolean;
};

const EMPTY_CONTACT: Contact = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  consent: false,
  dealAlerts: false,
  dealUpdates: false,
};

function readInitialState(): DealPageState {
  const el = typeof document !== "undefined" ? document.getElementById("deal-data") : null;
  if (!el?.textContent) return { state: "unavailable" };
  try {
    return readDealPageState(JSON.parse(el.textContent));
  } catch {
    return { state: "unavailable" };
  }
}

function newSubmissionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const digits = (s: string) => s.replace(/[^0-9]/g, "");

const dollars = (s: string): number | null => {
  const d = digits(s);
  return d ? Number(d) : null;
};

const dayLabel = (iso: string): string => {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

function contactProblem(c: Contact): string | null {
  if (!c.firstName.trim() || !c.lastName.trim()) return "Please fill in your first and last name.";
  if (!PHONE_REGEX.test(c.phone.trim())) return "Please enter a valid phone number.";
  if (!EMAIL_REGEX.test(c.email.trim())) return "Please enter a valid email address.";
  if (!c.consent) return "Please check the box to agree to calls and emails.";
  return null;
}

export default function DealPage() {
  const [page] = useState<DealPageState>(readInitialState);
  if (page.state === "live") return <LiveDeal slug={page.slug} deal={page.content} />;
  if (page.state === "error") return <LoadError />;
  return <NoLongerAvailable />;
}

function NoLongerAvailable() {
  return (
    <section className="deal-gone container-narrow">
      <h1>This deal is no longer available</h1>
      <p>Join the buyer list to get first look at the next one.</p>
      <a href="/investors#buyer-list" className="btn btn-primary deal-btn">
        Join the buyer list
      </a>
    </section>
  );
}

function LoadError() {
  return (
    <section className="deal-gone container-narrow">
      <h1>This page couldn't load</h1>
      <p>Try again in a minute.</p>
      <button type="button" className="btn btn-primary deal-btn" onClick={() => window.location.reload()}>
        Try again
      </button>
    </section>
  );
}

function LiveDeal({ slug, deal }: { slug: string; deal: DealPageContent }) {
  const [screen, setScreen] = useState<Screen>("page");
  const [contact, setContact] = useState<Contact>(EMPTY_CONTACT);
  const [choice, setChoice] = useState<Choice>(null);
  const [amount, setAmount] = useState("");
  const [emd, setEmd] = useState(deal.deposit ? deal.deposit.toLocaleString("en-US") : "");
  const [closeBy, setCloseBy] = useState(deal.closeBy ?? "");
  const [notes, setNotes] = useState("");
  const [ack, setAck] = useState(false);
  const [gone, setGone] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  // Each flow is a history entry, so the phone's back button steps back through
  // it instead of leaving the page and losing what was typed.
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const next = (e.state && (e.state as { dealScreen?: Screen }).dealScreen) || "page";
      setScreen(next);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo(0, 0);
    headingRef.current?.focus();
  }, [screen]);

  const go = (next: Screen) => {
    window.history.pushState({ dealScreen: next }, "");
    setScreen(next);
  };
  const back = () => window.history.back();

  if (gone) return <NoLongerAvailable />;

  const phone = deal.phone ? phoneDisplay(deal.phone) : null;
  const flow = { deal, slug, phone, headingRef, go, back, contact, setContact, onGone: () => setGone(true) };

  switch (screen) {
    case "interested":
      return <InterestForm {...flow} />;
    case "interestedSent":
      return (
        <Sent headingRef={headingRef} title="Got it">
          <p>
            We will call you about {deal.street}
            {phone ? (
              <>
                {" "}
                from <a href={`tel:${deal.phone}`}>{phone}</a>
              </>
            ) : null}
            .
          </p>
          <p className="deal-strong">Site-unseen offers are reviewed first.</p>
          <button type="button" className="btn btn-primary deal-btn" onClick={() => go("offerAsk")}>
            Submit an offer
          </button>
        </Sent>
      );
    case "offerAsk":
      return (
        <OfferAsk headingRef={headingRef} back={back} choice={choice} setChoice={(c) => { setChoice(c); setAck(false); }} next={() => go("offerDetails")} />
      );
    case "offerDetails":
      return (
        <OfferDetails
          {...flow}
          choice={choice}
          amount={amount}
          setAmount={setAmount}
          emd={emd}
          setEmd={setEmd}
          closeBy={closeBy}
          setCloseBy={setCloseBy}
          notes={notes}
          setNotes={setNotes}
        />
      );
    case "offerReview":
      return (
        <OfferReview
          {...flow}
          choice={choice}
          amount={dollars(amount)}
          emd={dollars(emd)}
          closeBy={closeBy}
          notes={notes}
          ack={ack}
          setAck={setAck}
        />
      );
    case "offerSent": {
      const n = dollars(amount);
      return (
        <Sent headingRef={headingRef} title="Offer sent">
          <p className="deal-sent-line">
            {choice === "unseen"
              ? `Your site-unseen offer of ${n ? usd(n) : ""} on ${deal.street} is in.`
              : `Your offer of ${n ? usd(n) : ""} on ${deal.street} is in. It becomes final after your walkthrough.`}
          </p>
          {phone && (
            <p>
              We will call you from <a href={`tel:${deal.phone}`}>{phone}</a>.
            </p>
          )}
          <button type="button" className="btn btn-secondary deal-btn deal-btn-outline" onClick={() => go("page")}>
            Back to the deal
          </button>
        </Sent>
      );
    }
    default:
      return <DealView deal={deal} phone={phone} onInterested={() => go("interested")} onOffer={() => go("offerAsk")} />;
  }
}

function DealView({
  deal,
  phone,
  onInterested,
  onOffer,
}: {
  deal: DealPageContent;
  phone: string | null;
  onInterested: () => void;
  onOffer: () => void;
}) {
  const [driveBroken, setDriveBroken] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);
  const photos = deal.photos;
  const hero = deal.heroUrl ?? (photos[0] && !driveBroken ? drivePhotoUrl(photos[0].id) : null);
  const gallery = driveBroken ? [] : photos;
  const shown = showAll ? gallery : gallery.slice(0, 8);

  return (
    <div className="deal">
      <div className="deal-hero">
        {hero ? (
          <img src={hero} alt={`Front of ${deal.street}`} width={1200} height={750} onError={deal.heroUrl ? undefined : () => setDriveBroken(true)} />
        ) : (
          <div className="deal-hero-empty" aria-hidden="true" />
        )}
        {gallery.length > 0 && (
          <button type="button" className="deal-count" onClick={() => setViewing(0)}>
            {gallery.length} {gallery.length === 1 ? "photo" : "photos"}
          </button>
        )}
      </div>

      <aside className="deal-summary">
        <p className="deal-eyebrow">Off-market · {deal.locality}</p>
        <h1>{deal.street}</h1>
        {deal.facts && <p className="deal-facts">{deal.facts}</p>}
        {deal.occupancy && <p className="deal-pill">{deal.occupancy}</p>}
        <div className="deal-price-card">
          <p className="deal-price-label">{deal.price.label}</p>
          <p className="deal-price">{usd(deal.price.amount)}</p>
          {deal.arv !== null && (
            <div className="deal-arv">
              <p className="deal-arv-row">
                <span>After-repair value (ARV)</span>
                <span className="deal-arv-amount">{usd(deal.arv)}</span>
              </p>
              <p className="deal-arv-note">Our estimate from recent renovated sales nearby. Run your own numbers.</p>
            </div>
          )}
          <div className="deal-actions">
            <button type="button" className="btn btn-primary deal-btn" onClick={onOffer}>
              Submit an offer
            </button>
            <button type="button" className="btn btn-secondary deal-btn deal-btn-outline" onClick={onInterested}>
              I'm interested
            </button>
          </div>
          <p className="deal-first">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="8" />
              <path d="M12 8v4l2.5 2.5" />
            </svg>
            Site-unseen offers are reviewed first.
          </p>
        </div>
      </aside>

      <div className="deal-main">
        {(gallery.length > 0 || deal.photosFolderUrl) && (
          <section className="deal-section" aria-labelledby="deal-photos-h">
            <h2 id="deal-photos-h">Photos and video</h2>
            {shown.length > 0 && (
              <ul className="deal-gallery" role="list">
                {shown.map((p, i) => (
                  <li key={p.id}>
                    <button type="button" className="deal-tile" onClick={() => setViewing(i)}>
                      <img
                        src={drivePhotoUrl(p.id, 640)}
                        alt={p.name ? `Photo: ${p.name}` : `Photo ${i + 1} of ${gallery.length}`}
                        loading="lazy"
                        width={640}
                        height={480}
                        onError={() => setDriveBroken(true)}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="deal-photo-links">
              {gallery.length > shown.length && (
                <button type="button" className="btn btn-secondary deal-btn deal-btn-quiet" onClick={() => setShowAll(true)}>
                  See all {gallery.length} photos
                </button>
              )}
              {deal.photosFolderUrl && (
                <a href={deal.photosFolderUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary deal-btn deal-btn-quiet">
                  {gallery.length > 0 ? "Photos and video folder" : "See the photos and video"}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
            </div>
          </section>
        )}

        {deal.about && (
          <section className="deal-section" aria-labelledby="deal-about-h">
            <h2 id="deal-about-h">About the house</h2>
            <p className="deal-prose">{deal.about}</p>
          </section>
        )}

        <section className="deal-section" aria-labelledby="deal-secure-h">
          <h2 id="deal-secure-h">How to secure it</h2>
          <p>
            Submit your offer on this page
            {phone ? (
              <>
                , or call or text <a href={`tel:${deal.phone}`} className="nowrap">{phone}</a>
              </>
            ) : null}
            .
          </p>
        </section>

        {deal.mustRead.length > 0 && (
          <section className="deal-section" aria-labelledby="deal-must-h">
            <h2 id="deal-must-h">Must-read before viewing</h2>
            <ul className="deal-list">
              {deal.mustRead.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        )}

        {deal.terms.length > 0 && (
          <section className="deal-section" aria-labelledby="deal-terms-h">
            <h2 id="deal-terms-h">Basic terms</h2>
            <ul className="deal-list">
              {deal.terms.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        )}

        {phone && (
          <div className="deal-questions">
            <p className="deal-strong">Questions about this house?</p>
            <p>
              Call or text <a href={`tel:${deal.phone}`} className="nowrap">{phone}</a>
            </p>
          </div>
        )}

        {deal.disclaimer && <p className="deal-disclaimer">{deal.disclaimer}</p>}
      </div>

      <div className="deal-actionbar" role="region" aria-label="Respond to this deal">
        <button type="button" className="btn btn-secondary deal-btn deal-btn-outline" onClick={onInterested}>
          I'm interested
        </button>
        <button type="button" className="btn btn-primary deal-btn" onClick={onOffer}>
          Submit offer
        </button>
      </div>

      {viewing !== null && gallery[viewing] && (
        <PhotoViewer photos={gallery} index={viewing} onIndex={setViewing} onClose={() => setViewing(null)} />
      )}
    </div>
  );
}

function PhotoViewer({
  photos,
  index,
  onIndex,
  onClose,
}: {
  photos: DealPageContent["photos"];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  const prev = () => onIndex((index - 1 + photos.length) % photos.length);
  const next = () => onIndex((index + 1) % photos.length);
  const photo = photos[index];
  return (
    <dialog
      ref={ref}
      className="deal-viewer"
      aria-label={`Photo ${index + 1} of ${photos.length}`}
      onClose={onClose}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") prev();
        if (e.key === "ArrowRight") next();
      }}
    >
      <div className="deal-viewer-bar">
        <span>
          {index + 1} / {photos.length}
        </span>
        <button type="button" className="deal-viewer-close" onClick={() => ref.current?.close()} aria-label="Close photos">
          ×
        </button>
      </div>
      <img src={drivePhotoUrl(photo.id)} alt={photo.name ? `Photo: ${photo.name}` : `Photo ${index + 1}`} />
      {photos.length > 1 && (
        <div className="deal-viewer-nav">
          <button type="button" className="btn btn-secondary deal-btn deal-btn-quiet" onClick={prev}>
            Previous
          </button>
          <button type="button" className="btn btn-secondary deal-btn deal-btn-quiet" onClick={next}>
            Next
          </button>
        </div>
      )}
    </dialog>
  );
}

type FlowProps = {
  deal: DealPageContent;
  slug: string;
  phone: string | null;
  headingRef: React.RefObject<HTMLHeadingElement>;
  go: (s: Screen) => void;
  back: () => void;
  contact: Contact;
  setContact: React.Dispatch<React.SetStateAction<Contact>>;
  onGone: () => void;
};

function FlowHeader({ back, step }: { back: () => void; step?: string }) {
  return (
    <div className="deal-flow-top">
      <button type="button" className="deal-back" onClick={back}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back
      </button>
      {step && <p className="deal-step">{step}</p>}
    </div>
  );
}

function Sent({ headingRef, title, children }: { headingRef: React.RefObject<HTMLHeadingElement>; title: string; children: React.ReactNode }) {
  return (
    <section className="deal-flow deal-sent container-narrow" role="status">
      <div className="deal-check" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </div>
      <h1 ref={headingRef} tabIndex={-1}>
        {title}
      </h1>
      {children}
    </section>
  );
}

function ContactFields({ contact, setContact }: { contact: Contact; setContact: FlowProps["setContact"] }) {
  const uid = useId();
  const set = (k: keyof Contact) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setContact((c) => ({ ...c, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  return (
    <>
      <div className="deal-row">
        <div className="deal-field">
          <label htmlFor={`${uid}-first`}>First name</label>
          <input id={`${uid}-first`} type="text" autoComplete="given-name" value={contact.firstName} onChange={set("firstName")} required />
        </div>
        <div className="deal-field">
          <label htmlFor={`${uid}-last`}>Last name</label>
          <input id={`${uid}-last`} type="text" autoComplete="family-name" value={contact.lastName} onChange={set("lastName")} required />
        </div>
      </div>
      <div className="deal-field">
        <label htmlFor={`${uid}-phone`}>Mobile phone</label>
        <input id={`${uid}-phone`} type="tel" autoComplete="tel" value={contact.phone} onChange={set("phone")} required />
      </div>
      <div className="deal-field">
        <label htmlFor={`${uid}-email`}>Email</label>
        <input id={`${uid}-email`} type="email" autoComplete="email" value={contact.email} onChange={set("email")} required />
      </div>
      <div className="deal-consents">
        <label className="deal-consent">
          <input type="checkbox" name="consentCallsEmail" checked={contact.consent} onChange={set("consent")} required />
          <span>
            {BUYER_CONSENT_TEXT} See our <a href="/investor-privacy">Investor Privacy Notice</a>.
          </span>
        </label>
        {/* ⚖ The investor deal-texts boxes: optional, unticked until the buyer ticks one. */}
        <label className="deal-consent">
          <input type="checkbox" name="consentDealAlerts" checked={contact.dealAlerts} onChange={set("dealAlerts")} />
          <span>
            {BUYER_DEAL_ALERTS_CONSENT_TEXT} See our <a href="/investor-sms-terms">Investor SMS Terms</a>.
          </span>
        </label>
        <label className="deal-consent">
          <input type="checkbox" name="consentDealUpdates" checked={contact.dealUpdates} onChange={set("dealUpdates")} />
          <span>
            {BUYER_DEAL_UPDATES_CONSENT_TEXT} See our <a href="/investor-sms-terms">Investor SMS Terms</a>.
          </span>
        </label>
      </div>
    </>
  );
}

function HoneypotField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const uid = useId();
  // Named "fax" so password managers ignore it; bots fill everything.
  return (
    <div style={{ display: "none" }} aria-hidden="true">
      <label htmlFor={`${uid}-fax`}>Fax</label>
      <input id={`${uid}-fax`} name="fax" type="text" tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

type SendState = { status: "idle" } | { status: "sending" } | { status: "error"; message: string };

/** One submission per kind: a retry after a timeout reuses its id, so dotato never records it twice. */
function useSend(p: FlowProps, kind: "interested" | "offer") {
  const started = useRef(Date.now());
  const submissionId = useRef<string | null>(null);
  const [state, setState] = useState<SendState>({ status: "idle" });
  const [fax, setFax] = useState("");
  const send = async (offer: Record<string, unknown> | null): Promise<boolean> => {
    if (state.status === "sending") return false;
    submissionId.current ??= newSubmissionId();
    setState({ status: "sending" });
    const c = p.contact;
    try {
      const res = await fetch("/.netlify/functions/dealResponse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: p.slug,
          kind,
          submissionId: submissionId.current,
          firstName: c.firstName.trim(),
          lastName: c.lastName.trim(),
          phone: c.phone.trim(),
          email: c.email.trim(),
          consentCallsEmail: c.consent,
          consentDealAlerts: c.dealAlerts,
          consentDealUpdates: c.dealUpdates,
          offer,
          fax,
          fillTimeMs: Date.now() - started.current,
        }),
      });
      if (res.status === 410) {
        p.onGone();
        return false;
      }
      if (!res.ok) throw new Error(`dealResponse ${res.status}`);
      setState({ status: "idle" });
      return true;
    } catch (err) {
      console.error("Deal response failed:", err);
      const what = kind === "offer" ? "Your offer didn't go through." : "That didn't go through.";
      setState({
        status: "error",
        message: p.phone ? `${what} Try again, or call or text ${p.phone}.` : `${what} Try again in a minute.`,
      });
      return false;
    }
  };
  return { state, send, fax, setFax };
}

function InterestForm(p: FlowProps) {
  const { state, send, fax, setFax } = useSend(p, "interested");
  const [problem, setProblem] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const bad = contactProblem(p.contact);
    setProblem(bad);
    if (bad) return;
    if (await send(null)) p.go("interestedSent");
  };
  const error = problem ?? (state.status === "error" ? state.message : null);
  return (
    <section className="deal-flow container-narrow">
      <FlowHeader back={p.back} />
      <h1 ref={p.headingRef} tabIndex={-1}>
        Interested in this house?
      </h1>
      <p className="deal-sub">
        {p.deal.street} · {p.deal.price.label} {usd(p.deal.price.amount)}. Leave your details and we will call you about it.
      </p>
      <form className="deal-form" onSubmit={submit} noValidate>
        <ContactFields contact={p.contact} setContact={p.setContact} />
        <HoneypotField value={fax} onChange={setFax} />
        {error && (
          <p className="deal-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary deal-btn" disabled={state.status === "sending"}>
          {state.status === "sending" ? "Sending…" : "Send"}
        </button>
      </form>
    </section>
  );
}

/** A step reached without the one before it (the back and forward buttons can do that). */
function Unfinished(p: FlowProps) {
  return (
    <section className="deal-flow container-narrow">
      <FlowHeader back={p.back} />
      <h1 ref={p.headingRef} tabIndex={-1}>
        Your offer isn't finished
      </h1>
      <button type="button" className="btn btn-primary deal-btn" onClick={() => p.go("offerAsk")}>
        Start again
      </button>
    </section>
  );
}

function OfferAsk({
  headingRef,
  back,
  choice,
  setChoice,
  next,
}: {
  headingRef: React.RefObject<HTMLHeadingElement>;
  back: () => void;
  choice: Choice;
  setChoice: (c: Choice) => void;
  next: () => void;
}) {
  const card = (value: Exclude<Choice, null>, title: string, line: string) => (
    <button type="button" className="deal-pick" aria-pressed={choice === value} onClick={() => setChoice(value)}>
      <span className="deal-pick-dot" aria-hidden="true" />
      <span className="deal-pick-text">
        <span className="deal-pick-title">{title}</span>
        <span className="deal-pick-line">{line}</span>
      </span>
    </button>
  );
  return (
    <section className="deal-flow container-narrow">
      <FlowHeader back={back} step="Step 1 of 3" />
      <h1 ref={headingRef} tabIndex={-1}>
        Is this offer site unseen?
      </h1>
      <p className="deal-sub">Pick one to continue. Site-unseen offers are reviewed first.</p>
      <div className="deal-picks">
        {card("unseen", "Site unseen", "I'm not walking the house first. This offer stands as is.")}
        {card("walkthrough", "After a walkthrough", "I want to see the house before this offer is final.")}
      </div>
      <button type="button" className="btn btn-primary deal-btn" disabled={!choice} onClick={next}>
        Continue
      </button>
    </section>
  );
}

function OfferDetails(
  p: FlowProps & {
    choice: Choice;
    amount: string;
    setAmount: (v: string) => void;
    emd: string;
    setEmd: (v: string) => void;
    closeBy: string;
    setCloseBy: (v: string) => void;
    notes: string;
    setNotes: (v: string) => void;
  }
) {
  const uid = useId();
  const [problem, setProblem] = useState<string | null>(null);
  if (!p.choice) return <Unfinished {...p} />;
  const review = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = dollars(p.amount);
    const emd = p.emd.trim() ? dollars(p.emd) : null;
    const bad =
      amount === null || amount < 1000
        ? "Please enter your offer in dollars."
        : p.emd.trim() && emd === null
          ? "Please enter the earnest money in dollars."
          : contactProblem(p.contact);
    setProblem(bad);
    if (!bad) p.go("offerReview");
  };
  return (
    <section className="deal-flow container-narrow">
      <FlowHeader back={p.back} step="Step 2 of 3" />
      <h1 ref={p.headingRef} tabIndex={-1}>
        Your offer
      </h1>
      <div className="deal-choice-row">
        <span>{p.choice === "unseen" ? "Site unseen" : "After a walkthrough"}</span>
        <button type="button" className="deal-link-btn" onClick={() => p.go("offerAsk")}>
          Change
        </button>
      </div>
      <form className="deal-form" onSubmit={review} noValidate>
        <div className="deal-field">
          <label htmlFor={`${uid}-amount`}>Offer price</label>
          <div className="deal-money">
            <span aria-hidden="true">$</span>
            <input
              id={`${uid}-amount`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={p.amount}
              onChange={(e) => p.setAmount(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="deal-row">
          <div className="deal-field">
            <label htmlFor={`${uid}-emd`}>Earnest money ($)</label>
            <input id={`${uid}-emd`} type="text" inputMode="numeric" autoComplete="off" value={p.emd} onChange={(e) => p.setEmd(e.target.value)} />
          </div>
          <div className="deal-field">
            <label htmlFor={`${uid}-close`}>Close by</label>
            <input id={`${uid}-close`} type="date" value={p.closeBy} onChange={(e) => p.setCloseBy(e.target.value)} />
          </div>
        </div>
        <ContactFields contact={p.contact} setContact={p.setContact} />
        <div className="deal-field">
          <label htmlFor={`${uid}-notes`}>
            Anything we should know? <span className="deal-optional">Optional</span>
          </label>
          <textarea id={`${uid}-notes`} rows={3} maxLength={1000} value={p.notes} onChange={(e) => p.setNotes(e.target.value)} />
        </div>
        {problem && (
          <p className="deal-error" role="alert">
            {problem}
          </p>
        )}
        <button type="submit" className="btn btn-primary deal-btn">
          Review offer
        </button>
      </form>
    </section>
  );
}

function OfferReview(
  p: FlowProps & {
    choice: Choice;
    amount: number | null;
    emd: number | null;
    closeBy: string;
    notes: string;
    ack: boolean;
    setAck: (v: boolean) => void;
  }
) {
  const { state, send, fax, setFax } = useSend(p, "offer");
  const unseen = p.choice === "unseen";
  const ready = p.choice !== null && p.amount !== null && (!unseen || p.ack);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || p.amount === null) return;
    const ok = await send({
      siteUnseen: unseen,
      acknowledgedUnseen: unseen ? p.ack : false,
      amount: p.amount,
      emd: p.emd,
      closeBy: p.closeBy || null,
      notes: p.notes.trim() || null,
    });
    if (ok) p.go("offerSent");
  };
  const rows = useMemo(
    () =>
      [
        ["House", p.deal.street],
        ["Earnest money", p.emd !== null ? usd(p.emd) : "Not given"],
        ["Close by", p.closeBy ? dayLabel(p.closeBy) : "Not given"],
        ["Name", `${p.contact.firstName.trim()} ${p.contact.lastName.trim()}`],
        ["Phone", p.contact.phone.trim()],
        ["Email", p.contact.email.trim()],
      ] as const,
    [p.deal.street, p.emd, p.closeBy, p.contact]
  );
  if (p.choice === null || p.amount === null) return <Unfinished {...p} />;
  return (
    <section className="deal-flow container-narrow">
      <FlowHeader back={p.back} step="Step 3 of 3: review" />
      <h1 ref={p.headingRef} tabIndex={-1} className="sr-only">
        Review your offer
      </h1>
      <div className="deal-review-card">
        <p className="deal-price-label">Your offer</p>
        <p className="deal-review-price">{usd(p.amount)}</p>
        <p className="deal-review-choice">{unseen ? "Site unseen" : "After a walkthrough"}</p>
        <p className="deal-review-line">
          {unseen
            ? "You are offering without walking the house first. This offer stands as is."
            : "This offer becomes final after you see the house."}
        </p>
      </div>
      <dl className="deal-review-rows">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <form className="deal-form" onSubmit={submit} noValidate>
        {unseen && (
          <label className="deal-ack">
            <input type="checkbox" checked={p.ack} onChange={(e) => p.setAck(e.target.checked)} />
            <span>I'm buying without seeing the inside.</span>
          </label>
        )}
        <HoneypotField value={fax} onChange={setFax} />
        {state.status === "error" && (
          <p className="deal-error" role="alert">
            {state.message}
          </p>
        )}
        <button type="submit" className="btn btn-primary deal-btn" disabled={!ready || state.status === "sending"}>
          {state.status === "sending" ? "Sending…" : "Send offer"}
        </button>
        <button type="button" className="deal-link-btn" onClick={p.back}>
          Edit offer
        </button>
      </form>
    </section>
  );
}
