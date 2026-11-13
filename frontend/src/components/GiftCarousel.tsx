import Image from "next/image";
import styles from "./GiftCarousel.module.css";

const images = [
  { src: "/gifting/6102479.jpg", alt: "Flat-lay of beautifully wrapped gift boxes with red ribbons" },
  { src: "/gifting/6102096.jpg", alt: "Elegant gift box with red ribbon" },
  { src: "/gifting/7957756.jpg", alt: "Floral wrapped gift box" },
  { src: "/gifting/29873585.jpg", alt: "Elegant gift boxes wrapped in luxurious paper" },
  { src: "/gifting/9185565.jpg", alt: "Gift box with brown ribbon on white textile" },
  { src: "/gifting/39042286.jpg", alt: "Festive gift baskets wrapped with green and gold ribbons" },
];

export function GiftCarousel() {
  const radius = 320;
  const count = images.length;
  const angleStep = 360 / count;

  return (
    <div className={styles.carousel} aria-label="Rotating gallery of Aapulki gift hampers">
      <div className={styles.scene}>
        <div className={styles.rotor}>
          {images.map((img, i) => {
            const angle = i * angleStep;
            return (
              <div
                key={img.src}
                className={styles.panel}
                style={{
                  transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                }}
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  width={220}
                  height={280}
                  className={styles.panelImg}
                />
              </div>
            );
          })}
        </div>
      </div>
      <p className={styles.hint}>Auto-rotating · hover to pause</p>
    </div>
  );
}
