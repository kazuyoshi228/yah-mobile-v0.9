import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/');
  // wait for a few seconds to let React load
  await page.waitForTimeout(3000);
  
  const content = await page.content();
  const contactExists = content.includes('id="contact"');
  console.log("Contact section exists:", contactExists);
  
  await page.screenshot({ path: 'screenshot.png', fullPage: true });
  await browser.close();
})();
