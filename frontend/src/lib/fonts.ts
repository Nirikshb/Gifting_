import localFont from "next/font/local";

export const fraunces = localFont({
  src: "../assets/fonts/fraunces/Fraunces-VariableFont_SOFTWONKopszwght.ttf",
  variable: "--font-fraunces",
  display: "swap",
});

export const deValencia = localFont({
  src: "../assets/fonts/de-valencia/de-valencia-beta.otf",
  variable: "--font-de-valencia",
  display: "swap",
});

export const customFontVariables = [fraunces.variable, deValencia.variable].join(" ");
