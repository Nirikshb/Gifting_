import localFont from "next/font/local";

const fontBase = "../assets/fonts";

export const fraunces = localFont({
  src: `${fontBase}/fraunces/Fraunces-VariableFont_SOFTWONKopszwght.ttf`,
  variable: "--font-fraunces",
  display: "swap",
});

export const testimonia = localFont({
  src: `${fontBase}/testimonia/Testimonia.otf`,
  variable: "--font-testimonia",
  display: "swap",
});

export const devinaGarden = localFont({
  src: `${fontBase}/devina-garden/Devina Garden.otf`,
  variable: "--font-devina-garden",
  display: "swap",
});

export const blueRidge = localFont({
  src: `${fontBase}/blue-ridge/blue-ridge.otf`,
  variable: "--font-blue-ridge",
  display: "swap",
});

export const patung = localFont({
  src: `${fontBase}/patung/Patung.otf`,
  variable: "--font-patung",
  display: "swap",
});

export const deValencia = localFont({
  src: `${fontBase}/de-valencia/de-valencia-beta.otf`,
  variable: "--font-de-valencia",
  display: "swap",
});

export const tirelesslyLoveYou = localFont({
  src: `${fontBase}/tirelessly-love-you/Tirelessly Love You.otf`,
  variable: "--font-tirelessly-love-you",
  display: "swap",
});

export const sansilk = localFont({
  src: `${fontBase}/sansilk/Sansilk.otf`,
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
