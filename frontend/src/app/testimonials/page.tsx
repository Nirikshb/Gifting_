import type { Metadata } from "next";
import styles from "./page.module.css";
import { RevealWords } from "./RevealWords";

export const metadata: Metadata = {
  title: "Client Stories | Aapulki",
  description:
    "Hear from the people and businesses who trust Aapulki for thoughtful gifting, careful craft, and dependable delivery.",
};

const testimonials = [
  {
    quote:
      "Aapulki turned our festive gifting into something truly memorable. Every hamper arrived beautifully finished, on time, and with a personal touch our clients noticed.",
    name: "Ananya Rao",
    role: "People & Culture Lead",
  },
  {
    quote:
      "From curation to delivery, the process felt effortless. The team understood our brief quickly and delivered hampers that looked and felt premium.",
    name: "Vikram Shah",
    role: "Founder, Northstar Studio",
  },
  {
    quote:
      "The attention to detail was exceptional — the packaging, the handwritten notes, the consistency across every box. It reflected our brand exactly the way we hoped.",
    name: "Meera Kulkarni",
    role: "Brand Manager",
  },
  {
    quote:
      "We needed dependable gifting at scale and Aapulki handled it with care. Communication was clear throughout, and the final result exceeded expectations.",
    name: "Rohan Desai",
    role: "Operations Head",
  },
  {
    quote:
      "Our recipients kept mentioning how thoughtful the hampers felt. It never came across as generic — every element felt chosen with intent.",
    name: "Ishita Menon",
    role: "Events Consultant",
  },
  {
    quote:
      "Reliable, creative, and genuinely easy to work with. Aapulki has become our go-to partner whenever we want gifting to make the right impression.",
    name: "Arjun Nair",
    role: "Client Partnerships",
  },
];

function Initials({ name }: { name: string }) {
  const letters = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return <span aria-hidden="true">{letters}</span>;
}

function Card({ quote, name, role }: { quote: string; name: string; role: string }) {
  return (
    <article className={styles.card}>
      <p className={styles.quote}>“{quote}”</p>
      <div className={styles.user}>
        <div className={styles.avatar}>
          <Initials name={name} />
        </div>
        <div className={styles.userMeta}>
          <p className={styles.name}>{name}</p>
          <p className={styles.role}>{role}</p>
        </div>
      </div>
    </article>
  );
}

export default function TestimonialsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.section} aria-labelledby="testimonials-title">
        <div className={styles.header}>
          <div className={styles.pill}>
            <RevealWords
              as="span"
              text="Client Stories"
              wordClassName={styles.word}
              visibleClassName={styles.wordVisible}
              staggerMs={40}
            />
          </div>
          <RevealWords
            as="h1"
            text="Trusted by Clients. Built on Results."
            className={styles.title}
            wordClassName={styles.word}
            visibleClassName={styles.wordVisible}
            staggerMs={32}
            startDelayMs={60}
          />
          <div id="testimonials-title" className={styles.srOnly}>
            Trusted by Clients. Built on Results.
          </div>
          <RevealWords
            as="p"
            text="Hear from the people and businesses who trust Aapulki to bring thoughtful gifting to life with care, craft, and dependable service."
            className={styles.intro}
            wordClassName={styles.word}
            visibleClassName={styles.wordVisible}
            staggerMs={18}
            startDelayMs={180}
          />
        </div>

        <div className={styles.wrapper}>
          <div className={`${styles.group} ${styles.groupA}`}>
            <div className={styles.slot}>
              <Card {...testimonials[0]} />
            </div>
            <div className={`${styles.slot} ${styles.slotOffset}`}>
              <Card {...testimonials[1]} />
            </div>
          </div>

          <div className={`${styles.group} ${styles.groupB}`}>
            <div className={`${styles.slot} ${styles.slotInset}`}>
              <Card {...testimonials[2]} />
            </div>
          </div>

          <div className={`${styles.group} ${styles.groupC}`}>
            <div className={styles.slot}>
              <Card {...testimonials[3]} />
            </div>
            <div className={`${styles.slot} ${styles.slotOffsetSm}`}>
              <Card {...testimonials[4]} />
            </div>
          </div>

          <div className={`${styles.group} ${styles.groupD}`}>
            <div className={`${styles.slot} ${styles.slotInsetLg}`}>
              <Card {...testimonials[5]} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
