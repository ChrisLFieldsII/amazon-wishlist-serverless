'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

const initWishlistPage = async url => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({
    width: 1920,
    height: 1080,
  });
  await page.goto(url);
  return page;
};

const takeScreenshot = async page => {
  await page.screenshot({
    path: `screenshots/my-list.png`,
    type: 'png',
    fullPage: true,
  });
};

module.exports.main = async event => {
  const { wishlistUrl, scrollLoops = 2 } = event;
  const page = await initWishlistPage(wishlistUrl);

  // this allows wishlist items to load due to infinite scrolling
  for (let x = 0; x < scrollLoops; x++) {
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await page.waitFor(1000);
  }

  // collect data points
  const itemNames = await page.$$eval('a[id*="itemName"]', nodes => nodes.map(n => n.innerHTML));
  const itemUrls = await page.$$eval('div[id*=itemImage]', nodes =>
    nodes.map(n => n.firstChild.firstChild.src),
  );

  await takeScreenshot(page);

  // cleanup resources
  await page.browser().close();

  const obj = {
    itemNames,
    itemUrls,
    numItems: itemNames.length,
  };

  const strObj = JSON.stringify(obj, null, 5);

  fs.writeFileSync('json/my-list.json', strObj);

  return {
    statusCode: 200,
    body: strObj,
  };

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};

module.exports
  .main({
    scrollLoops: 6,
    wishlistUrl:
      'https://www.amazon.com/hz/wishlist/ls/33SHCDPOSZ155/ref=nav_wishlist_lists_1?_encoding=UTF8&type=wishlist',
  })
  .then(console.log)
  .catch(console.error);

/** EVENT PARAMS
 * @param wishlistUrl The url to the wishlist
 * @param scrollLoops The number of times to scroll page to load items.
 * Amazon uses infinite scrolling display
 */
