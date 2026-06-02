/* Self-hosted web fonts (bundled via @fontsource, dev-only deps).
 *
 * These were previously loaded from Google Fonts (fonts.googleapis.com /
 * fonts.gstatic.com). That was the app's ONLY cross-origin request, and it
 * leaks the visitor's IP to Google on every page load — which trips iOS
 * Safari's privacy protections (Private Relay / "Hide IP Address" / content
 * blockers / cross-site-tracking prevention) into showing a "reduce your
 * privacy settings" notice. Serving the fonts ourselves removes the third
 * party entirely: no tracking surface, faster first paint (no extra
 * DNS/preconnect), and the service worker can now cache them for real offline
 * use (it only caches same-origin requests).
 *
 * Weights/styles mirror exactly what the old Google Fonts URL requested, so
 * the editorial design is byte-for-byte unchanged. Family names match the CSS
 * (Spectral / Space Grotesk / JetBrains Mono / EB Garamond / Newsreader), so
 * no stylesheet changes are needed. Bundler turns each import into a local,
 * content-hashed @font-face. */

/* Spectral — the serif body face (--serif). */
import '@fontsource/spectral/300.css';
import '@fontsource/spectral/400.css';
import '@fontsource/spectral/600.css';
import '@fontsource/spectral/700.css';
import '@fontsource/spectral/800.css';
import '@fontsource/spectral/300-italic.css';
import '@fontsource/spectral/400-italic.css';

/* Space Grotesk — the sans UI face (--sans). */
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';

/* JetBrains Mono — the mono face (--mono, plain view, stats). */
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';

/* EB Garamond — optional reading face (dev "Appearance" panel, data-type). */
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/500.css';
import '@fontsource/eb-garamond/600.css';
import '@fontsource/eb-garamond/400-italic.css';

/* Newsreader — optional reading face (dev "Appearance" panel, data-type). */
import '@fontsource/newsreader/400.css';
import '@fontsource/newsreader/500.css';
import '@fontsource/newsreader/600.css';
import '@fontsource/newsreader/700.css';
import '@fontsource/newsreader/400-italic.css';
