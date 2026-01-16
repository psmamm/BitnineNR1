Bitget Design-Analyse: So haben sie es gebaut
Framework & Architektur
Bitget verwendet Vue 3 als Haupt-Framework, kombiniert mit einer Micro-Frontend-Architektur (erkennbar am micro-runtime.js). Das bedeutet, verschiedene Teams können unabhängig an verschiedenen Teilen der Plattform arbeiten. Der Code wird mit ES Modules geladen und vermutlich mit Webpack oder Vite gebündelt (erkennbar an den gehashten Dateinamen wie cbf813a.js).

Schriftart
Die primäre Schriftart ist "Pulse" – eine Custom-Font speziell für Bitget. Als Fallback werden Arial und system-ui verwendet:

css
font-family: Pulse, Arial, sans-serif;
Die Font-Größen folgen einer Skala: 10px, 12px, 14px, 16px, 18px, 20px, 24px, 36px, 44px. Font-Weights nutzen 400 (normal), 500 (medium), 600 (semi-bold) und 700 (bold).

Farbpalette (Dark Theme)
Die Seite nutzt ein durchgängiges Dark Theme mit diesen Hauptfarben:

Farbe	RGB	Verwendung
Schwarz	rgb(21, 21, 23)	Haupt-Hintergrund
Dunkelgrau	rgb(27, 27, 29)	Cards, Sidebar
Cyan/Teal	rgb(3, 170, 199)	Primärfarbe (Logo, Akzente)
Helles Cyan	rgb(38, 191, 212)	Highlights, Hover-States
Weiß/Hellgrau	rgb(244, 245, 247)	Text
Weiß	rgb(255, 255, 255)	Buttons (CTA)
Buttons
Die Buttons sind clean und minimalistisch:

Primary Button (z.B. "Deposit now"):

Weißer Hintergrund mit dunklem Text
border-radius: 12px (abgerundete Ecken)
padding: 15px 24px
font-weight: 500
Schnelle Transition: 0.1s
Secondary Buttons:

Dunkler Hintergrund rgb(37, 38, 41)
border-radius: 8px
Helle Textfarbe
Animationen & Transitions
Bitget nutzt keine externe Animation-Library wie GSAP oder Framer Motion. Stattdessen setzen sie auf reine CSS Transitions und Keyframe-Animationen:

Timing Functions (Easing):

cubic-bezier(0.4, 0, 0.2, 1) – Material Design Standard
cubic-bezier(0.5, 0, 0, 1.25) – Leichter "Bounce"-Effekt
cubic-bezier(0.645, 0.045, 0.355, 1) – Smooth custom easing
Keyframe-Animationen:

dialog-fade-in/out – Modal-Animationen
slideInRight – Drawer/Panel-Animationen
viewer-fade-in/out – Overlay-Effekte
Transition-Dauern: Typisch 0.1s–0.3s für schnelle, responsive Interaktionen.

3D-Grafiken (Hero-Bilder)
Die beeindruckenden 3D-Elemente (Wallet, Kreditkarten, Coins) sind keine Echtzeit-WebGL-Grafiken. Es sind vorgerenderte PNG-Bilder mit Transparenz. Diese wurden wahrscheinlich in Blender, Cinema 4D oder ähnlicher 3D-Software erstellt und dann als statische Assets exportiert.

UI-Komponenten
Carousel/Slider: Swiper.js (29 Swiper-Elemente gefunden)
Icons: Custom Icon-Font (iconfont.css) plus SVG-Icons
Modals/Dialogs: Custom Vue-Komponenten mit CSS-Animationen
Charts: Canvas-basiert (wahrscheinlich ein integriertes Trading-View-Widget oder Custom-Lösung)
Layout & Responsive Design
Das Layout nutzt CSS Grid und Flexbox. Breakpoints sind:

376px, 768px, 1020px, 1024px, 1200px, 1440px, 1600px
Der Ansatz ist Mobile-First mit progressiver Erweiterung für größere Screens.

Border-Radius System: 4px, 8px, 12px, 16px, 32px, 50% (für Kreise)

Zusammenfassung: Tech-Stack
Bereich	Technologie
Framework	Vue 3
Architektur	Micro-Frontend
CSS	Custom CSS + Utility Classes (hybrid)
Schriftart	"Pulse" (Custom Font)
Animationen	CSS Transitions + Keyframes
Slider	Swiper.js
Icons	Custom iconfont + SVG
3D-Grafiken	Pre-rendered PNGs
Build	Webpack/Vite mit Code-Splitting


