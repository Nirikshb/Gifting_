Organization
All font packs now live under one parent folder:

frontend/src/assets/fonts/

Subfolder	Role
fraunces/
Full Fraunces family (many weights; variable font used in app)
testimonia/
Testimonia
devina-garden/
Devina Garden
blue-ridge/
Blue Ridge
patung/
Patung
de-valencia/
De Valencia
tirelessly-love-you/
Tirelessly Love You
sansilk/
Sansilk
Preview images, PDFs, and readme files stayed with each family inside those folders.

Connection
frontend/src/lib/fonts.ts — next/font/local for each family (CSS variables on <html>).
frontend/src/app/layout.tsx — loads those variables app-wide.
frontend/src/app/globals.css — utility classes you can use anywhere.
Usage (works today, no Tailwind):


<h1 className="font-patung">Gift Packaging</h1>
<p className="font-fraunces">Body copy</p>
Available classes: font-fraunces, font-testimonia, font-devina-garden, font-blue-ridge, font-patung, font-de-valencia, font-tirelessly-love-you, font-sansilk.

Geist stays the default in your CSS modules via --font-geist-sans until you add one of these classes.

Tailwind font-{name}?
Not yet — this project has no Tailwind (only CSS modules).

If you add Tailwind later, yes: extend theme.fontFamily with the same CSS variables, e.g. patung: ['var(--font-patung)', 'sans-serif'], then font-patung works like any other Tailwind font utility.

Until then, use the global classes above (same naming idea: font-{slug}).

Later
Extra Fraunces weights are in fraunces/; swap or add src entries in fonts.ts when you try them.
I did not start the dev server to verify rendering — run npm run dev and try a class on the brand link when you are ready.