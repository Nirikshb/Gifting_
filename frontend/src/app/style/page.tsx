import { ViewTransition } from "react";
import Link from "next/link";
import { publicPageMetadata } from "@/lib/site-url";
import styles from "./page.module.css";

const leftLinks = ["Typography", "Photo", "Style", "Design"];
const rightLinks = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/about" },
  { label: "More", href: "/process" },
];

const notes = [
  {
    title: "Kolase Photo Design",
    copy: "A quiet set of frames, paper, and light. Made to sit together.",
  },
  {
    title: "Elegant Minimalist Design",
    copy: "Few lines. Soft colour. Space left open on purpose.",
  },
  {
    title: "Green Nature Ambiance",
    copy: "Olive, sand, and cream. A calm room for the work.",
  },
];

const description = "Typography, photo, and a quiet design style.";

export const metadata = {
  title: "Style",
  ...publicPageMetadata("Style | Aapulki", description, "/style"),
};

export default function StylePage() {
  return (
    <ViewTransition name="page-curtain" share="curtain" default="none">
      <div className={styles.page}>
        <header className={styles.header}>
          <nav className={styles.links} aria-label="Topics">
            {leftLinks.map((label) => (
              <a key={label} href="#notes">
                {label}
              </a>
            ))}
          </nav>
          <p className={styles.logo}>Photostyle</p>
          <div className={styles.headerEnd}>
            <nav className={styles.links} aria-label="Pages">
              {rightLinks.map((link) => (
                <Link key={link.label} href={link.href} transitionTypes={["curtain"]}>
                  {link.label}
                </Link>
              ))}
            </nav>
            <a className={styles.pill} href="#process">
              Get Started
            </a>
          </div>
        </header>

        <section className={styles.hero}>
          <h1>
            Typography Photo,
            <br />
            Elegant For Design Style
          </h1>
          <p>
            A quiet style for type, photo, and form. Each piece stays simple, and each piece belongs together.
          </p>
          <a className={styles.cta} href="#process">
            Get Started For Free
          </a>
        </section>

        <section className={styles.notes} id="notes" aria-label="Styles">
          {notes.map((note) => (
            <article key={note.title}>
              <h2>{note.title}</h2>
              <p>{note.copy}</p>
            </article>
          ))}
        </section>

        <section className={styles.process} id="process">
          <h2>
            Everything Has a Process, And
            <br />
            Enjoy The Process
          </h2>
          <p>The work follows a short path. Form, colour, and finish. Then it is ready to keep.</p>
          <div className={styles.board}>
            <div className={styles.paper} />
            <div className={styles.sand} />
            <div className={styles.tile} />
            <div className={styles.archive}>
              <p>*Archive by Creativestyle.</p>
              <button className={styles.expand} type="button" aria-label="Expand archive">
                <ExpandIcon />
              </button>
            </div>
          </div>
        </section>
      </div>
    </ViewTransition>
  );
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 5h5v5" />
      <path d="M19 5l-7 7" />
      <path d="M10 19H5v-5" />
      <path d="M5 19l7-7" />
    </svg>
  );
}
