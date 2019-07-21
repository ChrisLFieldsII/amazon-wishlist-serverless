'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

const width = 1920;
const height = 1080;

const initWishlistPage = async url => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({
    width,
    height,
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
  console.time();
  const { wishlistUrl, scrollLoops = 2 } = event;

  const page = await initWishlistPage(wishlistUrl);

  // this allows wishlist items to load due to infinite scrolling
  for (let x = 0; x < scrollLoops; x++) {
    await page.evaluate(`window.scrollBy(0, ${height / 2})`);
    await page.waitFor(1000);
  }

  // collect data points
  const itemNames = await page.$$eval('a[id*="itemName"]', nodes => nodes.map(n => n.innerHTML));
  const itemUrls = await page.$$eval('div[id*=itemImage]', nodes =>
    nodes.map(n => n.firstChild.firstChild.src),
  );
  const prices = await page.$$eval('li[data-price]', nodes =>
    nodes.map(n => Number(n.attributes['data-price'].value)),
  );
  const priorities = await page.$$eval('span[id*=itemPriorityLabel]', nodes =>
    nodes.map(n => n.innerHTML),
  );
  const quantitiesReq = await page.$$eval('span[id*=itemRequested]', nodes =>
    nodes.filter(n => n.id.startsWith('itemRequested_')).map(n => Number(n.innerHTML)),
  );
  const quantitiesHave = await page.$$eval('span[id*=itemPurchased]', nodes =>
    nodes.filter(n => n.id.startsWith('itemPurchased_')).map(n => Number(n.innerHTML)),
  );
  const comments = await page.$$eval('span[id*=itemComment]', nodes => nodes.map(n => n.innerHTML));

  await takeScreenshot(page);

  // cleanup resources
  await page.browser().close();

  const obj = {
    numItems: itemNames.length,
    numUrls: itemUrls.length,
    numPrices: prices.length,
    numPriorities: priorities.length,
    quantitiesReqLength: quantitiesReq.length,
    quantitiesHaveLength: quantitiesHave.length,
    commentsLength: comments.length,
    itemNames,
    itemUrls,
    prices,
    priorities,
    quantitiesReq,
    quantitiesHave,
    comments,
  };

  const strObj = JSON.stringify(obj, null, 5);

  fs.writeFileSync('json/my-list.json', strObj);

  console.log('FUNCTION RUN TIME');
  console.timeEnd();

  return {
    statusCode: 200,
    body: strObj,
  };

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};

module.exports
  .main({
    scrollLoops: 20,
    wishlistUrl:
      'https://www.amazon.com/hz/wishlist/ls/33SHCDPOSZ155/ref=nav_wishlist_lists_1?_encoding=UTF8&type=wishlist',
  })
  .then(res => {
    const parsedBody = JSON.parse(res.body);
    const { itemNames, itemUrls, prices, priorities, ...rest } = parsedBody;
    console.log(rest, `\nStatus code: ${res.statusCode}`);
  })
  .catch(console.error);

/** EVENT PARAMS
 * @param wishlistUrl The url to the wishlist
 * @param scrollLoops The number of times to scroll page to load items.
 * Amazon uses infinite scrolling display
 */
