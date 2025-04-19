import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { EVENTS } from '../src/constants.js';
import { logError, logMessage } from '../src/utils.js';

// Note: this adapter does not actually call out to an external endpoint but this
// classification seems most appropriate given we do not need global context
const analyticsType = 'endpoint';

const { AUCTION_END } = EVENTS;
const code = 'codeDemoAnalytics';

const codeDemoAnalytics = Object.assign(adapter({
  analyticsType
}), {
  track({ eventType, args }) {
    // Filter events to just AUCTION_END events
    if (eventType !== AUCTION_END) return;

    // Extract ad unit codes, bids, and the auction ID
    const { adUnitCodes, bidsReceived, auctionId } = args;

    // Make sure we have either ad unit codes or bids received
    if (adUnitCodes.length === 0 && bidsReceived.length === 0) {
      logError(`${code}: ${auctionId} - No ad unit codes or bids found`);
      return;
    }

    // Determine the lowest overall price and lowest price per ad unit for the auction
    const adUnitCodeToPrice = {};
    let lowestBidOverall = null;
    adUnitCodes.forEach(code => adUnitCodeToPrice[code] = null);
    bidsReceived.forEach(bid => {
      const {
        adUnitCode,
        bidderCode,
        cpm,
        currency,
      } = bid;

      // Save this bid as the lowest if there are no other bids for the ad unit or the
      // CPM is less than the current bid saved for the ad unit
      if (
        typeof adUnitCodeToPrice[adUnitCode] === 'undefined' ||
        adUnitCodeToPrice[adUnitCode] === null ||
        cpm < adUnitCodeToPrice[adUnitCode].cpm
      ) {
        adUnitCodeToPrice[adUnitCode] = {
          cpm,
          bidderCode,
          currency,
        };
      }

      // Save this bid as the lowest overall bid if there isn't another bid saved or
      // this bid's CPM is lower than the current saved bid
      if (
        lowestBidOverall === null ||
        cpm < lowestBidOverall.cpm
      ) {
        lowestBidOverall = {
          cpm,
          bidderCode,
          currency,
        };
      }
    });

    // These are the lines that will be logged
    const logLines = [ `${code} - Auction ID ${auctionId}` ];

    // Log the messages for the overall auction
    if (lowestBidOverall !== null) {
      logLines.push(
        ` - overall lowest bid: ` +
        `${lowestBidOverall.cpm} ${lowestBidOverall.currency} ` +
        `by ${lowestBidOverall.bidderCode}`
      );
    } else {
      logLines.push(' - No overall lowest bid found');
    }

    // Log the message for each ad unit in the auction
    Object.keys(adUnitCodeToPrice).forEach(adUnitCode => {
      const bid = adUnitCodeToPrice[adUnitCode];

      if (bid !== null) {
        logLines.push(
          ` - lowest bid for ${adUnitCode}: ` +
          `${bid.cpm} ${bid.currency} ` +
          `by ${bid.bidderCode}`
        );
      } else {
        logLines.push(` - lowest bid for ${adUnitCode}: No bids found`);
      }
    });

    // Log to the console
    logMessage(logLines.join('\n'));
  },
});

adapterManager.registerAnalyticsAdapter({
  adapter: codeDemoAnalytics,
  code,
});

export default codeDemoAnalytics;
