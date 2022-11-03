import { chromium } from "playwright"; // Or 'webkit' or 'firefox'.
import { createAbstractions, Key } from "./abstractions.js";

const {
  connectToAriaAtDriverWebsocket,
  sleep,
  pressAndReleaseKey,
  pressKey,
  releaseKey,
} = createAbstractions();

const browser = await chromium.connect(
  "ws://localhost:4284/unguessable-string" // See the security.md file for why this is fine though it seems strange on the face
);
await connectToAriaAtDriverWebsocket({ wsUrl: "ws://localhost:4382" });

const browserContext = await browser.newContext();
const page = await browserContext.newPage();

await page.goto(`https://webaim.org/?randomQueryParameter=${Date.now()}`); // Random query parameter for NVDA specifically to prevent focus caching, see https://github.com/eps1lon/screen-reader-testing-library/blob/main/examples/jest/index.test.ts#L37 and https://stackoverflow.com/questions/22517242/how-to-prevent-nvda-setting-focus-automatically-on-last-used-html-element

await sleep(10000); // hack in place of a stability check

await page.bringToFront();

pressAndReleaseKey("tab");

await sleep(10000); // hack in place of a stability check

pressAndReleaseKey("d"); // next landmark

await sleep(10000); // make it easier to see what's happening

pressAndReleaseKey("d"); // next landmark

await sleep(10000); // make it easier to see what's happening

pressAndReleaseKey("tab");

await sleep(10000); // make it easier to see what's happening

[..."contact@assistivlabs.com"].forEach((character) => {
  if (character === "@") {
    pressKey("shift");
    pressKey("2");
    releaseKey("2");
    releaseKey("shift");

    return;
  }

  pressAndReleaseKey(character as Key);
});

pressAndReleaseKey("enter");

await sleep(10000); // hack in place of a stability check

await sleep(10000); // make it easier to see what's happening

await browser.close();
