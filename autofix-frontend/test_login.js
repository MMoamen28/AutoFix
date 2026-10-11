import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log('Navigating to http://localhost:3000/login');
  try {
    await page.goto('http://localhost:3000/login');
    
    console.log('Filling username and password');
    await page.fill('input[placeholder*="username"]', 'owner');
    await page.fill('input[type="password"]', 'password');
    
    console.log('Clicking Sign In');
    await page.click('button:has-text("Sign In")');
    
    console.log('Waiting for navigation...');
    await page.waitForTimeout(5000); // Wait for potential redirect
    
    console.log('Current URL:', page.url());
    
    await page.screenshot({ path: 'login_result.png' });
    console.log('Screenshot saved as login_result.png');
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await browser.close();
  }
})();
