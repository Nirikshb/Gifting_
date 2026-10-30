import localFont from "next/font/local";

export const fraunces = localFont({
  src: "../assets/fonts/fraunces/Fraunces-VariableFont_SOFTWONKopszwght.ttf",
  variable: "--font-fraunces",
  display: "swap",
});

export const testimonia = localFont({
  src: "../assets/fonts/testimonia/Testimonia.otf",
  variable: "--font-testimonia",
  display: "swap",
});

export const devinaGarden = localFont({
  src: "../assets/fonts/devina-garden/Devina Garden.otf",
  variable: "--font-devina-garden",
  display: "swap",
});

export const blueRidge = localFont({
  src: "../assets/fonts/blue-ridge/blue-ridge.otf",
  variable: "--font-blue-ridge",
  display: "swap",
});

export const patung = localFont({
  src: "../assets/fonts/patung/Patung.otf",
  variable: "--font-patung",
  display: "swap",
});

export const deValencia = localFont({
  src: "../assets/fonts/de-valencia/de-valencia-beta.otf",
  variable: "--font-de-valencia",
  display: "swap",
});

export const tirelesslyLoveYou = localFont({
  src: "../assets/fonts/tirelessly-love-you/Tirelessly Love You.otf",
  variable: "--font-tirelessly-love-you",
  display: "swap",
});

export const sansilk = localFont({
  src: "../assets/fonts/sansilk/Sansilk.otf",
  variable: "--font-sansilk",
  display: "swap",
});

/** CSS variable classes — add to `<html>` once in layout. */
export const customFontVariables = [
  fraunces.variable,
  testimonia.variable,
  devinaGarden.variable,
  blueRidge.variable,
  patung.variable,
  deValencia.variable,
  tirelesslyLoveYou.variable,
  sansilk.variable,
].join(" ");
