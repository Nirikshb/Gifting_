import Link from "next/link";
import styles from "./page.module.css";

const services = [
  "Brand strategy",
  "Visual identity",
  "Website design",
  "Packaging design",
  "Content direction",
];

export const metadata = {
  title: "Kindled · Kindred",
  description: "Designs with soul and brands with story.",
};

export default function DetailPage() {
  return (
    <article className={styles.page}>
      <header className={styles.hero}>
        <HeroScene />
        <div className={styles.heroCopy}>
          <h1>
            <span>
              Designs
              <br />
              with soul
            </span>
            <span className={styles.plus} aria-hidden="true">
              +
            </span>
            <span>
              Brands
              <br />
              with story
            </span>
          </h1>
          <p>
            Kindled · Kindred shapes quiet brands into work you can see, hold, and remember.
          </p>
          <Link href="#brand">Read the story</Link>
        </div>
      </header>

      <div className={styles.board}>
        <figure className={styles.pouches}>
          <PouchesScene />
        </figure>

        <div className={styles.topRight}>
          <figure className={styles.desk}>
            <DeskScene />
          </figure>
          <div className={styles.facts}>
            <section id="brand" className={styles.block}>
              <h2>The brand</h2>
              <p>
                Kindled · Kindred is a studio for brands that want a clear point of view. The work
                covers the name, the picture, and the feeling a business leaves behind.
              </p>
            </section>
            <section className={`${styles.block} ${styles.services}`}>
              <h2>Specialized in</h2>
              <ul>
                {services.map((service) => (
                  <li key={service}>{service}</li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <figure className={styles.portrait}>
          <PortraitScene />
          <figcaption>Exploring the gap</figcaption>
        </figure>

        <div className={styles.lowerRight}>
          <blockquote>
            <p>
              At the end of the day, I really believe that everyone has a story to tell. And those
              stories matter. Do you see my story? I see yours.
            </p>
          </blockquote>
          <section className={styles.designer}>
            <h2>The designer</h2>
            <p>
              The studio is led by one designer who stays close to the work. Each project starts
              with the person behind the brand, then turns that point of view into type, image, and
              form.
            </p>
          </section>
        </div>
      </div>

      <footer className={styles.footer}>
        <div className={styles.mark}>
          <p>Kindled · Kindred</p>
          <span>Studio for brands with a point of view</span>
        </div>
        <div className={styles.download}>
          <p>Download the free resource</p>
          <span>A short guide for naming, story, and the first brand marks.</span>
        </div>
      </footer>
    </article>
  );
}

function HeroScene() {
  return (
    <svg className={styles.scene} viewBox="0 0 1440 780" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="1440" height="780" fill="#242424" />
      <rect width="1440" height="430" fill="#1a1a1a" />
      <path d="M390 0c30 90 78 180 112 268 22 8 48 12 74 8C560 170 548 80 536 0H390z" fill="#111" />
      <path d="M900 0c8 100-6 190-34 274 36 4 78 2 118-8C1024 160 1060 70 1088 0H900z" fill="#121212" />
      <path d="M250 268c70 20 120 24 168 8" fill="none" stroke="#cfc8bc" strokeWidth="8" />
      <rect y="468" width="1440" height="312" fill="#d9d4cc" />
      <rect y="468" width="1440" height="14" fill="#c9c3ba" />
      <ellipse cx="280" cy="590" rx="132" ry="30" fill="#f3efe8" />
      <path d="M198 512h126c10 46 10 82 0 124H198c-10-42-10-78 0-124z" fill="#f7f4ee" />
      <ellipse cx="261" cy="512" rx="70" ry="16" fill="#1c1c1c" />
      <ellipse cx="261" cy="508" rx="52" ry="10" fill="#3d342e" />
      <g transform="rotate(-7 1080 620)">
        <rect x="860" y="500" width="460" height="270" fill="#eeeae3" />
        <rect x="892" y="534" width="220" height="140" fill="#b7b1a8" />
        <rect x="1130" y="534" width="150" height="12" fill="#c9c3ba" />
        <rect x="1130" y="560" width="150" height="8" fill="#d5d0c8" />
        <rect x="1130" y="580" width="120" height="8" fill="#d5d0c8" />
      </g>
    </svg>
  );
}

function PouchesScene() {
  return (
    <svg className={styles.scene} viewBox="0 0 800 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="800" height="700" fill="#d4cfc6" />
      <rect y="520" width="800" height="180" fill="#c9c3b8" />
      <path d="M150 250c20-80 90-120 150-110 40 8 70 40 78 90 30 8 70 40 74 110 4 80-20 170-70 210-40 30-90 36-130 10-70-46-130-40-160-110-20-50-8-130 8-200z" fill="#8a837a" />
      <path d="M390 230c30-70 100-100 160-80 50 16 80 60 86 120 24 16 50 70 40 140-12 80-50 160-110 190-50 24-110 10-150-30-60-60-90-150-70-240 8-36 18-70 44-100z" fill="#6f6962" />
      <path d="M230 300c40 10 70 8 100-8" fill="none" stroke="#b7b0a6" strokeWidth="6" />
      <path d="M470 300c36 16 60 18 92 4" fill="none" stroke="#b7b0a6" strokeWidth="6" />
    </svg>
  );
}

function DeskScene() {
  return (
    <svg className={styles.scene} viewBox="0 0 900 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="900" height="420" fill="#eceae6" />
      <rect x="250" y="40" width="250" height="250" fill="#1c1c1c" />
      <rect x="300" y="250" width="150" height="18" fill="#1c1c1c" />
      <rect y="300" width="900" height="120" fill="#d8d3cb" />
      <rect x="470" y="188" width="210" height="130" rx="4" fill="#f4f1eb" />
      <rect x="486" y="202" width="178" height="100" fill="#2a2a2a" />
    </svg>
  );
}

function PortraitScene() {
  return (
    <svg className={styles.scene} viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="800" height="900" fill="#8f897f" />
      <rect x="70" y="80" width="250" height="360" fill="#ddd8d0" />
      <rect x="120" y="620" width="160" height="18" fill="#1c1c1c" />
      <rect x="150" y="638" width="100" height="150" fill="#1c1c1c" />
      <circle cx="470" cy="250" r="54" fill="#d9d3cb" />
      <path d="M400 330c20 70 28 140 24 250h150c-2-90-8-170-30-250-30 28-80 36-144 0z" fill="#ece7e0" />
      <path d="M430 560h130l18 250H400z" fill="#ddd7cf" />
      <path d="M455 430h70l8 70H448z" fill="#1c1c1c" />
    </svg>
  );
}
