import { useId } from "react";

const bandMessages = [
  {
    text: [
      "BIRTHDAY GIFTS",
      "ANNIVERSARY GIFTS",
      "FESTIVE GIFT HAMPERS",
      "SURPRISE GIFTS FOR LOVED ONES",
      "UNIQUE GIFT IDEAS",
    ],
    color: "bg-[#e9d5ff] text-[var(--foreground)]",
    rotation: "rotate-[-4deg] max-[767px]:rotate-[-10deg]",
    animation: "animate-marquee-slow",
    shadow: "",
  },
  {
    text: [
      "GIFT HAMPERS ONLINE",
      "THOUGHTFUL GIFTS FOR EVERY OCCASION",
      "PERSONALIZED GIFTING",
      "BEAUTIFULLY CURATED GIFT BOXES",
    ],
    color: "bg-[var(--foreground)] text-white",
    rotation: "rotate-[4deg] max-[767px]:rotate-[9deg]",
    animation: "animate-marquee",
    shadow: "shadow-[0_24px_70px_rgba(0,0,0,0.3)]",
  },
];

export function IntersectingMarquee() {
  const badgeId = useId().replace(/:/g, "");
  const badgePathId = `${badgeId}-circle`;
  const badgeTitleId = `${badgeId}-title`;

  return (
    <section
      aria-label="Aapulki thoughtful gifting and gift ideas"
      className="relative isolate flex min-h-[320px] w-full items-center justify-center overflow-hidden bg-[var(--card)] sm:min-h-[380px] lg:min-h-[420px]"
    >
      <p className="sr-only">
        Gift hampers online, thoughtful gifts for every occasion, personalized
        gifting, and beautifully curated gift boxes. Birthday gifts, anniversary
        gifts, festive gift hampers, surprise gifts for loved ones, and unique
        gift ideas. Aapulki: thoughtful gifting.
      </p>

      {bandMessages.map((band) => (
        <div
          key={band.text[0]}
          aria-hidden="true"
          className={`absolute left-1/2 top-1/2 z-10 w-[140vw] -translate-x-1/2 -translate-y-1/2 ${band.rotation} ${band.color} ${band.shadow}`}
        >
          <div
            className={`flex w-max will-change-transform items-center ${band.animation} py-5 font-sans text-sm font-extrabold tracking-[0.08em] sm:py-6 sm:text-base`}
          >
            {[0, 1].map((copy) => (
              <span
                key={copy}
                className="flex min-w-[140vw] shrink-0 items-center justify-between gap-4 px-4 sm:gap-6 sm:px-6"
              >
                {band.text.map((message) => (
                  <span key={message} className="flex shrink-0 items-center gap-4 sm:gap-6">
                    <span>{message}</span>
                    <span aria-hidden="true" className="text-[0.7em]">
                      â€¢
                    </span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      ))}

      <svg
        viewBox="0 0 120 120"
        role="img"
        aria-labelledby={badgeTitleId}
        className="relative z-30 h-32 w-32 shrink-0 sm:h-36 sm:w-36"
      >
        <title id={badgeTitleId}>Aapulki, thoughtful gifting</title>
        <circle
          cx="60"
          cy="60"
          r="57"
          fill="white"
          stroke="var(--foreground)"
          strokeWidth="1.25"
        />
        <defs>
          <path
            id={badgePathId}
            d="M60 60m0-45a45 45 0 1 1 0 90a45 45 0 1 1 0-90"
          />
        </defs>
        <text
          fill="var(--foreground)"
          fontFamily="Arial, sans-serif"
          fontSize="8.5"
          fontWeight="700"
          letterSpacing="0.8"
        >
          <textPath href={`#${badgePathId}`} startOffset="0%">
            AAPULKI â€¢ THOUGHTFUL GIFTING â€¢ AAPULKI â€¢ GIFTING BY â€¢
          </textPath>
        </text>
        <path
          d="M43 58v4m7-10v16m7-21v26m7-21v16m7-10v4"
          fill="none"
          stroke="var(--foreground)"
          strokeLinecap="round"
          strokeWidth="2.5"
        />
      </svg>
    </section>
  );
}


