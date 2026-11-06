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
        <img src="/detail/hero.jpg" alt="" />
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
          <img src="/detail/pouches.jpg" alt="Two quilted pouches" />
        </figure>

        <div className={styles.topRight}>
          <figure className={styles.desk}>
            <img src="/detail/desk.jpg" alt="A chair and an open laptop" />
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
          <img src="/detail/portrait.jpg" alt="" />
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
