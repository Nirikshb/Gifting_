import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { GiftCarousel } from "@/components/GiftCarousel";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Gifting Hampers & Keepsakes | Aapulki",
  description:
    "Hand-wrapped gift hampers, keepsake packaging and thoughtful corporate gifting. Curated, personal and delivered across India. 20% off your first order.",
  keywords: [
    "gift hampers",
    "hand-wrapped gifts",
    "corporate gifting",
    "festive gift boxes",
    "keepsake packaging",
    "personalised gifts India",
  ],
};

const stats = [
  { value: "12+", label: "Years of gifting" },
  { value: "250+", label: "Hampers curated" },
  { value: "4.8/5", label: "Loved by customers" },
  { value: "98%", label: "On-time delivery" },
];

const values = [
  { title: "Hand-tied ribbon & wax seal", body: "Every hamper is finished by hand — no machine-sealed boxes, ever." },
  { title: "Keepsake packaging", body: "Boxes designed to be reused, not discarded. FSC-mix materials throughout." },
  { title: "Personal note cards", body: "A handwritten message in every hamper, at no extra cost." },
  { title: "Bulk & corporate gifting", body: "From 5 to 5,000 hampers, with one dedicated gifting partner." },
];

const features = [
  { n: "01", title: "Curated with intent", body: "We select makers and products the way you would — for taste, story and craft, not margin." },
  { n: "02", title: "Wrapped to be remembered", body: "Ribbon, wax seal, tissue and a note — the unboxing is part of the gift." },
  { n: "03", title: "Delivered with care", body: "Packed to survive the journey, tracked end to end, on time or we make it right." },
  { n: "04", title: "Made for every occasion", body: "Festive, corporate, wedding, new-born and just-because — one thoughtful range." },
];

const testimonials = [
  { quote: "The hampers arrived looking like a magazine spread. Our clients still talk about them.", name: "Ananya R.", role: "Founder, Studio Loom" },
  { quote: "Handwritten notes in every box. That single detail made our Diwali gifting unforgettable.", name: "Vikram S.", role: "People Ops, Northwind" },
  { quote: "Reliable, beautiful and on time — even at 500 units. Aapulki is our default gifting partner now.", name: "Meera K.", role: "Events Lead, Casa Verde" },
];

const posts = [
  { title: "7 things to consider before choosing a corporate gift", tag: "Gifting guide", img: "/gifting/6102096.jpg" },
  { title: "How to choose the right hamper for every occasion", tag: "Inspiration", img: "/gifting/7957756.jpg" },
  { title: "The art of the handwritten note in modern gifting", tag: "Craft", img: "/gifting/9185565.jpg" },
];

export default function GiftingPage() {
  return (
    <main className={styles.page}>
      {/* Hero */}
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>Aapulki · Hand-wrapped gifting</p>
          <h1 id="hero-title" className={styles.heroTitle}>
            We wrap what moves you forward.
          </h1>
          <p className={styles.heroSub}>
            Curated gift hampers, keepsake packaging and thoughtful corporate gifting — hand-finished,
            personal, and delivered across India. 20% off your first order.
          </p>
          <div className={styles.heroCtas}>
            <Link href="/shop" className={styles.ctaPrimary}>Shop hampers from ₹1,199</Link>
            <Link href="/process" className={styles.ctaGhost}>How we gift</Link>
          </div>
        </div>
        <div className={styles.heroMedia}>
          <Image
            src="/gifting/6102479.jpg"
            alt="A flat-lay of beautifully wrapped gift boxes with red ribbons on a festive table"
            width={1260}
            height={750}
            priority
            className={styles.heroImg}
          />
          <ul className={styles.heroThumbs} aria-label="Featured hampers">
            <li><Image src="/gifting/6102096.jpg" alt="Elegant gift box with red ribbon" width={120} height={180} /></li>
            <li><Image src="/gifting/7957756.jpg" alt="Floral wrapped gift box" width={120} height={180} /></li>
            <li><Image src="/gifting/9185565.jpg" alt="Gift box with brown ribbon on white textile" width={120} height={180} /></li>
          </ul>
        </div>
      </section>

      {/* Stats */}
      <section className={styles.stats} aria-label="Aapulki at a glance">
        <div className={styles.statsInner}>
          {stats.map((s) => (
            <div key={s.label} className={styles.stat}>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 3D carousel */}
      <section className={styles.carouselSection} aria-labelledby="carousel-title">
        <div className={styles.carouselHead}>
          <p className={styles.eyebrow}>In motion</p>
          <h2 id="carousel-title" className={styles.sectionTitle}>Our hampers, turning heads.</h2>
        </div>
        <GiftCarousel />
      </section>

      {/* Curated around your story */}
      <section className={styles.split} aria-labelledby="split-title">
        <div className={styles.splitText}>
          <p className={styles.eyebrow}>Curated around your story</p>
          <h2 id="split-title" className={styles.sectionTitle}>A hamper that feels like you sent it yourself.</h2>
          <p className={styles.body}>
            We listen first — occasion, recipient, budget, the small details that matter — then build a hamper
            that reads as personal, not purchased. Every element earns its place.
          </p>
          <Link href="/shop" className={styles.linkArrow}>Explore the collection →</Link>
        </div>
        <div className={styles.splitMedia}>
          <Image
            src="/gifting/29873585.jpg"
            alt="Close-up of elegant gift boxes wrapped in luxurious paper with delicate ribbons"
            width={800}
            height={533}
            className={styles.splitImg}
          />
        </div>
      </section>

      {/* Values */}
      <section className={styles.values} aria-labelledby="values-title">
        <div className={styles.valuesHead}>
          <p className={styles.eyebrow}>Wrapped on values</p>
          <h2 id="values-title" className={styles.sectionTitle}>Driven by craft, not by margin.</h2>
        </div>
        <div className={styles.valuesGrid}>
          {values.map((v) => (
            <article key={v.title} className={styles.valueCard}>
              <h3 className={styles.valueTitle}>{v.title}</h3>
              <p className={styles.valueBody}>{v.body}</p>
            </article>
          ))}
        </div>
        <div className={styles.valuesMedia}>
          <Image
            src="/gifting/39042286.jpg"
            alt="Colorful festive gift baskets wrapped with green and gold ribbons"
            width={1296}
            height={864}
            className={styles.valuesImg}
          />
          <Image
            src="/gifting/6045704.jpg"
            alt="Pink gift box elegantly wrapped with a red ribbon and curled bow"
            width={400}
            height={710}
            className={styles.valuesImgSmall}
          />
        </div>
      </section>

      {/* Made to be remembered */}
      <section className={styles.features} aria-labelledby="features-title">
        <div className={styles.featuresHead}>
          <p className={styles.eyebrow}>Made to be remembered</p>
          <h2 id="features-title" className={styles.sectionTitle}>Gifting, considered end to end.</h2>
        </div>
        <div className={styles.featuresLayout}>
          <ul className={styles.featureList}>
            {features.map((f) => (
              <li key={f.n} className={styles.featureItem}>
                <span className={styles.featureNum}>{f.n}</span>
                <div>
                  <h3 className={styles.featureTitle}>{f.title}</h3>
                  <p className={styles.featureBody}>{f.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className={styles.featureMedia}>
            <Image
              src="/gifting/9185565.jpg"
              alt="Gift box with brown ribbon resting on white textile"
              width={700}
              height={940}
              className={styles.featureImg}
            />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className={styles.testimonials} aria-labelledby="testimonials-title">
        <p className={styles.eyebrow}>Trusted by clients</p>
        <h2 id="testimonials-title" className={styles.sectionTitle}>Built on results.</h2>
        <div className={styles.testimonialGrid}>
          {testimonials.map((t) => (
            <blockquote key={t.name} className={styles.testimonial}>
              <p className={styles.quote}>&ldquo;{t.quote}&rdquo;</p>
              <footer className={styles.quoteFooter}>
                <span className={styles.quoteName}>{t.name}</span>
                <span className={styles.quoteRole}>{t.role}</span>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      {/* Ideas / blog */}
      <section className={styles.ideas} aria-labelledby="ideas-title">
        <div className={styles.ideasHead}>
          <p className={styles.eyebrow}>Ideas & inspiration</p>
          <h2 id="ideas-title" className={styles.sectionTitle}>Gifting, made thoughtful.</h2>
        </div>
        <div className={styles.ideasGrid}>
          {posts.map((p) => (
            <article key={p.title} className={styles.ideaCard}>
              <Image src={p.img} alt={p.title} width={420} height={280} className={styles.ideaImg} />
              <div className={styles.ideaBody}>
                <span className={styles.ideaTag}>{p.tag}</span>
                <h3 className={styles.ideaTitle}>{p.title}</h3>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta} aria-labelledby="cta-title">
        <h2 id="cta-title" className={styles.ctaTitle}>Ready to gift something exceptional?</h2>
        <p className={styles.ctaSub}>From one hamper to five thousand — we handle it with the same care.</p>
        <div className={styles.ctaRow}>
          <Link href="/shop" className={styles.ctaPrimary}>Shop hampers from ₹1,199</Link>
          <Link href="/process" className={styles.ctaGhost}>Talk to our gifting team</Link>
        </div>
      </section>
    </main>
  );
}
