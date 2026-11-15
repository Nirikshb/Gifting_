import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";
import { AddToCartButton } from "@/components/AddToCartButton";
import {
  formatInr,
  getCataloguePage,
  productImageUrl,
  productPath,
} from "@/lib/api/catalogue";
import type { CatalogueProduct } from "@/lib/api/catalogue";
import { publicPageMetadata } from "@/lib/site-url";
import SignatureSequence from "./SignatureSequence";
import styles from "./page.module.css";

const description =
  "Thoughtful gifts and hand-finished hampers for the people who make every day matter.";

export const metadata: Metadata = {
  title: { absolute: "Aapulki — Gifts that feel like you" },
  ...publicPageMetadata("Aapulki — Gifts that feel like you", description, "/"),
};

export const instant = false;

const recipients = [
  {
    title: "A little celebration",
    note: "For the days that deserve a ribbon.",
    image: "/gifting/6102479.jpg",
    alt: "A collection of carefully wrapped presents tied with red ribbon",
  },
  {
    title: "A fresh beginning",
    note: "For new keys, new chapters and new arrivals.",
    image: "/gifting/6045704.jpg",
    alt: "A small gift box wrapped with a bright ribbon",
  },
  {
    title: "Just because",
    note: "For no reason other than them.",
    image: "/gifting/6102096.jpg",
    alt: "A hand-wrapped gift resting on soft fabric",
  },
];

const occasions = [
  { title: "The big day", label: "Weddings & milestones", image: "/gifting/32498681.jpg" },
  { title: "New keys", label: "Housewarmings", image: "/gifting/14365405.jpg" },
  { title: "A little one", label: "New arrivals", image: "/gifting/6045704.jpg" },
  { title: "No occasion", label: "Just because", image: "/gifting/6102096.jpg" },
];

/**
 * Splits a headline into per-character spans so the opening line can be
 * revealed with a stagger. Purely CSS-driven: the markup ships hidden and
 * each character animates in through its `--i` delay, so there is no
 * hydration flash and it still reads correctly without JavaScript.
 */
function SplitLine({
  text,
  startIndex,
  soft = false,
}: {
  text: string;
  startIndex: number;
  soft?: boolean;
}) {
  return (
    <span
      className={soft ? `${styles.heroLine} ${styles.heroLineSoft}` : styles.heroLine}
      aria-hidden="true"
    >
      {Array.from(text).map((character, index) => (
        <span
          className={styles.char}
          key={`${character}-${index}`}
          style={{ "--i": startIndex + index } as CSSProperties}
        >
          {character === " " ? "\u00A0" : character}
        </span>
      ))}
    </span>
  );
}

function ProductCard({ product }: { product: CatalogueProduct }) {
  const href = productPath(product.slug);
  const image = productImageUrl(product.imageUrl);
  if (!href || !image) return null;

  const price = formatInr(product.price);

  return (
    <article className={styles.productCard}>
      <Link className={styles.productPhoto} href={href} aria-label={`View ${product.name}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={product.name} loading="lazy" />
        {product.stockQuantity <= 0 ? <span className={styles.soldOut}>Out of stock</span> : null}
      </Link>
      <div className={styles.productDetails}>
        <div>
          <h3>
            <Link href={href}>{product.name}</Link>
          </h3>
          {price ? <p className={styles.productPrice}>{price}</p> : null}
        </div>
        <AddToCartButton productId={product.id} stockQuantity={product.stockQuantity} />
      </div>
    </article>
  );
}

export default async function HomePage() {
  const catalogueResult = await getCataloguePage(1);
  const products = catalogueResult.ok
    ? catalogueResult.data.products
        .filter((product) => productImageUrl(product.imageUrl))
        .slice(0, 4)
    : null;

  return (
    <ViewTransition name="page-curtain" share="curtain" default="none">
      <div className={styles.page} data-aapulki-homepage="">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.heroEyebrow}>For the ones who make life lovely</p>
            <h1
              className={styles.heroTitle}
              id="hero-title"
              aria-label="A little thing. A whole feeling."
            >
              <SplitLine text="A little thing." startIndex={0} />
              <SplitLine text="A whole feeling." startIndex={16} soft />
            </h1>
            <p className={styles.heroDescription}>
              Hand-finished gifts that feel like they were made just for them.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.lightButton} href="/shop" transitionTypes={["curtain"]}>
                Find their kind of gift <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <p className={styles.heroTrust}>Wrapped by hand · Delivered with care</p>
          </div>
          <div className={styles.heroVisual}>
            <Image
              className={styles.heroImage}
              src="/gifting/6102479.jpg"
              alt="An arrangement of gifts wrapped with vivid red ribbons"
              fill
              loading="eager"
              sizes="(max-width: 809px) 94vw, 60vw"
            />
          </div>
        </section>

        <div className={styles.marquee} aria-hidden="true">
          <div className={styles.marqueeTrack}>
            {[0, 1, 2].map((group) => (
              <span className={styles.marqueeGroup} key={group}>
                <span>Thoughtful by nature</span>
                <i>✳</i>
                <span>Made to feel personal</span>
                <i>✳</i>
                <span>Wrapped with care</span>
                <i>✳</i>
              </span>
            ))}
          </div>
        </div>

        <SignatureSequence />

        <section className={styles.editorial} aria-labelledby="editorial-title">
          <div className={styles.editorialCard}>
            <div className={styles.editorialVisual}>
              <Image
                src="/gifting/9185565.jpg"
                alt="A handwritten parcel with natural twine and a leafy branch in soft light"
                fill
                sizes="(max-width: 809px) 100vw, 46vw"
              />
              <span className={styles.imageNote}>A moment before the unwrapping</span>
            </div>
            <div className={styles.editorialCopy}>
              <p className={styles.eyebrow}>A note on giving</p>
              <h2 id="editorial-title">
                The best gifts
                <br />
                say, <em>I know you.</em>
              </h2>
              <p>
                It might be their favourite colour. A detail they mentioned once.
                The feeling that someone took their time. We believe the magic is
                never just what&apos;s inside the box.
              </p>
              <Link className={styles.textLink} href="/about" transitionTypes={["curtain"]}>
                A little more about us <span aria-hidden="true">↗</span>
              </Link>
              <span className={styles.editorialMark} aria-hidden="true">A</span>
            </div>
          </div>
        </section>

        <section className={styles.recipients} aria-labelledby="recipient-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Start with their smile</p>
              <h2 id="recipient-title">Who are we celebrating?</h2>
            </div>
            <Link className={styles.textLink} href="/shop" transitionTypes={["curtain"]}>
              All the good things <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className={styles.recipientGrid}>
            {recipients.map((recipient, index) => (
              <Link
                className={styles.recipientCard}
                href="/shop"
                transitionTypes={["curtain"]}
                key={recipient.title}
              >
                <span className={styles.recipientPhoto}>
                  <Image
                    src={recipient.image}
                    alt={recipient.alt}
                    fill
                    sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw"
                  />
                  <span className={styles.recipientNumber}>0{index + 1}</span>
                  <span className={styles.recipientArrow} aria-hidden="true">↗</span>
                </span>
                <span className={styles.recipientTitle}>{recipient.title}</span>
                <span className={styles.recipientNote}>{recipient.note}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.builder} aria-labelledby="builder-title">
          <div className={styles.builderCard}>
            <div className={styles.builderCopy}>
              <p className={styles.eyebrow}>The Signature collection</p>
              <h2 id="builder-title">
                A little more,
                <br />
                <em>beautifully together.</em>
              </h2>
              <p>
                Explore pre-curated hampers, assembled and wrapped to feel like a
                complete gift from the very first moment.
              </p>
              <Link className={styles.darkButton} href="/signature" transitionTypes={["curtain"]}>
                Explore hand-wrapped hampers <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <div className={styles.builderPhoto}>
              <Image
                src="/gifting/32498681.jpg"
                alt="A warm-toned hamper held close, filled with small gifts"
                fill
                sizes="(max-width: 809px) 100vw, 46vw"
              />
              <span>One for them.<br />A little joy for you, too.</span>
            </div>
          </div>
        </section>

        <section className={styles.occasions} aria-labelledby="occasion-title">
          <div className={styles.occasionIntro}>
            <p className={styles.eyebrow}>There&apos;s always a reason</p>
            <h2 id="occasion-title">And even when there isn&apos;t.</h2>
            <p>For the once-in-a-lifetime days, and all the ordinary ones worth keeping.</p>
          </div>
          <div className={styles.occasionList}>
            {occasions.map((occasion) => (
              <Link
                className={styles.occasionRow}
                href="/shop"
                transitionTypes={["curtain"]}
                key={occasion.title}
              >
                <span className={styles.occasionPhoto}>
                  <Image src={occasion.image} alt="" fill sizes="88px" />
                </span>
                <span className={styles.occasionWords}>
                  <strong>{occasion.title}</strong>
                  <small>{occasion.label}</small>
                </span>
                <span className={styles.occasionArrow} aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.featured} id="featured-gifts" aria-labelledby="featured-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>A few current favourites</p>
              <h2 id="featured-title">Good things, ready to give.</h2>
            </div>
            <Link className={styles.textLink} href="/shop" transitionTypes={["curtain"]}>
              Shop the collection <span aria-hidden="true">↗</span>
            </Link>
          </div>
          {products === null ? (
            <p className={styles.catalogueMessage} role="status">
              Our gifts couldn&apos;t load just now. Please visit the shop to try again.
            </p>
          ) : products.length > 0 ? (
            <div className={styles.productGrid}>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <p className={styles.catalogueMessage} role="status">
              Product photos will appear here when they&apos;re available. In the meantime,{" "}
              <Link href="/shop">browse the catalogue</Link>.
            </p>
          )}
        </section>

        <section className={styles.unboxing} aria-labelledby="unboxing-title">
          <div className={styles.unboxingCard}>
            <div className={styles.unboxingCopy}>
              <p className={styles.eyebrow}>The first little thrill</p>
              <h2 id="unboxing-title">
                Before they see
                <br />
                what&apos;s inside.
              </h2>
              <p>
                Keep the anticipation. Take your time with the ribbon. Let the
                outside feel like the beginning of something special.
              </p>
              <Link className={styles.textLink} href="/process" transitionTypes={["curtain"]}>
                Discover the details <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <div className={styles.unboxingVisual}>
              <Image
                src="/gifting/6102096.jpg"
                alt="A carefully wrapped white gift box with a vivid red ribbon"
                fill
                sizes="(max-width: 809px) 100vw, 47vw"
              />
              <span className={styles.unboxingTag}>Made to be kept</span>
            </div>
          </div>
        </section>

        <section className={styles.testimonial} aria-labelledby="testimonial-title">
          <div className={styles.quoteMark} aria-hidden="true">✳</div>
          <p className={styles.eyebrow}>The feeling is the whole point</p>
          <h2 id="testimonial-title">
            It&apos;s the thought
            <br />
            they can <em>feel.</em>
          </h2>
          <p className={styles.testimonialNote}>
            A favourite colour. A ribbon worth saving. The moment it all comes
            together, before the box is even open.
          </p>
          <Link className={styles.textLink} href="/process" transitionTypes={["curtain"]}>
            See the care behind it <span aria-hidden="true">↗</span>
          </Link>
        </section>

        <footer className={styles.footer}>
          <div className={styles.footerCampaign}>
            <p className={styles.eyebrow}>A little goes a long way</p>
            <h2>Someone you love is about to feel very loved.</h2>
            <Link className={styles.lightButton} href="/shop" transitionTypes={["curtain"]}>
              Find their gift <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className={styles.footerBottom}>
            <Link className={styles.wordmark} href="/" transitionTypes={["curtain"]}>
              Aapulki<span>.</span>
            </Link>
            <p>Thoughtful gifting, from our hands to theirs.</p>
            <nav aria-label="Footer">
              <Link href="/shop" transitionTypes={["curtain"]}>Shop</Link>
              <Link href="/about" transitionTypes={["curtain"]}>Our story</Link>
              <Link href="/process" transitionTypes={["curtain"]}>Our process</Link>
            </nav>
            <span className={styles.copyright}>© Aapulki</span>
          </div>
        </footer>
      </div>
    </ViewTransition>
  );
}
