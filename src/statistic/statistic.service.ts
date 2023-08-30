import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { Statistic, StatisticDocument } from './statistic.schema';
import { SuiService } from 'src/sui/sui.service';
import { ObligationService } from 'src/obligation/obligation.service';
import { SupplyService } from 'src/supply/supply.service';
import { MintService } from 'src/mint/mint.service';
import { RedeemService } from 'src/redeem/redeem.service';

@Injectable()
export class StatisticService {
  @Inject(SuiService)
  private readonly _suiService: SuiService;

  @Inject(ObligationService)
  private readonly _obligationService: ObligationService;

  @Inject(SupplyService)
  private readonly _supplyService: SupplyService;

  @Inject(MintService)
  private readonly _mintService: MintService;

  @Inject(RedeemService)
  private readonly _redeemService: RedeemService;

  private static _logTime = new Date().getTime();

  private API_URL = process.env.API_URL || 'https://sui.api.scallop.io/';
  private API_KEY = process.env.API_KEY || 'scalloptestapikey';
  private LEADERBOARD_ZEALY_URL =
    process.env.LEADERBOARD_ZEALY_URL ||
    'https://api.zealy.io/communities/scallopio/leaderboard?limit=100&page=0';
  private LEADERBOARD_API_KEY =
    process.env.LEADERBOARD_API_KEY || 'e0f0d9MU4aYqPvu0JRTSFP0nYhs';
  private LEADERBOARD_LIMIT = Number(process.env.LEADERBOARD_LIMIT) || 100;
  private LEADERBOARD_SUINS = Number(process.env.LEADERBOARD_SUINS) || 0;
  private LEADERBOARD_WRITE_TO_API =
    Number(process.env.LEADERBOARD_WRITE_TO_API) || 0;

  private STATISTIC_INTERVAL_SECONDS =
    Number(process.env.STATISTIC_INTERVAL_SECONDS) || 600; // default 10 mins

  private _coinPriceMap = new Map<string, number>();

  private COIN_DECIMALS = new Map<string, number>([
    [
      //SUI
      '0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      9,
    ],
    [
      //USDC
      '5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
      6,
    ],
    [
      //USDT
      'c060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN',
      6,
    ],
    [
      //ETH
      'af8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN',
      8,
    ],
    [
      //SOL
      'b7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8::coin::COIN',
      8,
    ],
    [
      //BTC
      '027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881::coin::COIN',
      8,
    ],
    [
      //APT
      '3a5143bb1196e3bcdfab6203d1683ae29edd26294fc8bfeafe4aaa9d2704df37::coin::COIN',
      8,
    ],
    [
      //CETUS
      '06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS',
      9,
    ],
  ]);

  // private COIN_DECIMALS = new Map<string, number>([
  //   ['SUI', 9],
  //   ['USDC', 6],
  //   ['USDT', 6],
  //   ['ETH', 8],
  //   ['SOL', 8],
  //   ['BTC', 8],
  // ]);
  private WORMHOLE_COINS = new Map<string, string>([
    [
      '5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf',
      'USDC',
    ],
    [
      'c060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c',
      'USDT',
    ],
    ['af8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5', 'ETH'],
    ['b7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8', 'SOL'],
    ['027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881', 'BTC'],
    ['3a5143bb1196e3bcdfab6203d1683ae29edd26294fc8bfeafe4aaa9d2704df37', 'APT'],
  ]);

  private COIN_GECKO_IDS = new Map<string, string>([
    ['BTC', 'bitcoin'],
    ['SUI', 'sui'],
    ['ETH', 'ethereum'],
    ['USDC', 'usd-coin'],
    ['USDT', 'tether'],
    ['SOL', 'solana'],
    ['CETUS', 'cetus-protocol'],
    ['APT', 'aptos'],
  ]);

  static resetLogTime() {
    StatisticService._logTime = new Date().getTime();
  }

  constructor(
    @InjectModel(Statistic.name)
    private statisticModel: Model<StatisticDocument>,
  ) {}

  async create(
    statistic: Statistic,
    session: mongoose.ClientSession | null = null,
  ): Promise<StatisticDocument> {
    const createdStatistic = new this.statisticModel(statistic);
    return createdStatistic.save({ session });
  }

  async findLatest(): Promise<Statistic> {
    return this.statisticModel.findOne().sort({ createdAt: -1 }).exec();
  }

  private getDecimalMultiplier(coinType: string): number {
    const decimal = this.COIN_DECIMALS.get(coinType) || 6;
    const decimalMultiplier = 1 / Math.pow(10, decimal);
    return decimalMultiplier;
  }

  private getCoinSymbol(coinType: string): string {
    let coinSymbol = coinType.split('::')[2].toUpperCase();
    // Deal with WormholeCoin Mapping
    if (coinSymbol === 'COIN') {
      const coinContract = coinType.split('::')[0];
      coinSymbol = this.WORMHOLE_COINS.get(coinContract);
    }
    return coinSymbol || '';
  }

  async getCoinPriceFromCoinGecko(symbol = 'USDC'): Promise<number> {
    let coinPrice = 0;
    try {
      const coinId = this.COIN_GECKO_IDS.get(symbol);
      if (coinId) {
        const response = await axios.get(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
        );
        if (response.data[coinId].usd) {
          coinPrice = Number(response.data[coinId].usd);
        }
      }
    } catch (error) {
      console.error(
        `Error caught while getCoinPriceFromCoinGecko(${symbol}): ${error}`,
      );
    }

    return coinPrice;
  }

  async getCoinPriceFromBinance(symbol = 'USDT'): Promise<number> {
    let coinPrice = 0;
    try {
      if (symbol === 'USDT') {
        return 1;
      } else {
        const response = await axios.get(
          `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`,
        );
        if (response.data.price) {
          coinPrice = Number(response.data.price);
        }
      }
    } catch (error) {
      console.error(
        `Error caught while getCoinPriceFromBinance(${symbol}): ${error}`,
      );
    }

    return coinPrice;
  }

  async getCoinPriceMap(): Promise<Map<string, number>> {
    if (this._coinPriceMap.size === 0) {
      try {
        for (const coinType of this.COIN_DECIMALS.keys()) {
          const coinSymbol = this.getCoinSymbol(coinType);
          const coinPrice = await this.getCoinPriceFromCoinGecko(coinSymbol);
          // console.log(`[CoinPrice]: ${coinSymbol} <${coinPrice}>`);
          this._coinPriceMap.set(coinType, coinPrice);
        }
      } catch (error) {
        console.error('Error caught while getCoinPriceMap() ', error);
      }
    }

    return this._coinPriceMap;
  }

  async updateMarketStatistic(
    limit = this.LEADERBOARD_LIMIT,
  ): Promise<Statistic> {
    let marketStatistic = undefined;
    try {
      const currentTime = new Date().getTime();
      const passTime = (currentTime - StatisticService._logTime) / 1000;
      if (passTime > this.STATISTIC_INTERVAL_SECONDS) {
        const startTime = new Date().getTime();
        let endTime = new Date().getTime();
        let execTime = (endTime - startTime) / 1000;

        marketStatistic = new Statistic();
        const coinTypePriceMap = await this.getCoinPriceMap();
        marketStatistic.prices = coinTypePriceMap;
        // console.log('[Stat-Prices]', marketStatistic.prices);

        // get total borrow amount and value of each coin type
        const totalDebts = [];
        let totalBorrowValue = 0;
        const borrowCoins =
          await this._obligationService.findDistinctBorrowCoins();
        for (const coin of borrowCoins) {
          const coinPrice = coinTypePriceMap.get(coin.coinType);
          const multiple = this.getDecimalMultiplier(coin.coinType);
          const coinTotalBorrowValue =
            await this._obligationService.getTotalBorrowValueByCoinType(
              coin.coinType,
              coinPrice,
              multiple,
            );
          const totalCoinDebt = {
            coin: coin.coinType,
            balance: coinTotalBorrowValue[0].totalAmount,
            value: coinTotalBorrowValue[0].totalValue,
          };
          totalBorrowValue += coinTotalBorrowValue[0].totalValue || 0;
          totalDebts.push(totalCoinDebt);
        }
        totalBorrowValue = Math.round(totalBorrowValue);
        marketStatistic.totalBorrowValue = totalBorrowValue;
        marketStatistic.debts = totalDebts;

        // get total collateral amount and value of each coin type
        const totalCollaterals = [];
        let totalCollateralValue = 0;
        const collateralCoins =
          await this._obligationService.findDistinctCollateralsCoins();
        for (const coin of collateralCoins) {
          const coinPrice = coinTypePriceMap.get(coin.coinType);
          const multiple = this.getDecimalMultiplier(coin.coinType);
          const coinTotalCollateralValue =
            await this._obligationService.getTotalCollateralValueByCoinType(
              coin.coinType,
              coinPrice,
              multiple,
            );
          const totalCoinCollateral = {
            coin: coin.coinType,
            balance: coinTotalCollateralValue[0].totalAmount,
            value: coinTotalCollateralValue[0].totalValue,
          };
          totalCollateralValue += coinTotalCollateralValue[0].totalValue || 0;
          totalCollaterals.push(totalCoinCollateral);
        }
        totalCollateralValue = Math.round(totalCollateralValue);
        marketStatistic.totalCollateralValue = totalCollateralValue;
        marketStatistic.collaterals = totalCollaterals;

        // get total supply amount and value of each coin type
        const totalSupplies = [];
        let totalSupplyValue = 0;
        const supplyCoins = await this._supplyService.findDistinctCoins();
        for (const coin of supplyCoins) {
          const coinPrice = coinTypePriceMap.get(coin.coinType);
          const multiple = this.getDecimalMultiplier(coin.coinType);
          const coinTotalSupplyValue =
            await this._supplyService.getTotalSupplyValueByCoinType(
              coin.coinType,
              coinPrice,
              multiple,
            );
          const totalCoinSupply = {
            coin: coin.coinType,
            balance: coinTotalSupplyValue[0].totalAmount,
            value: coinTotalSupplyValue[0].totalValue,
          };
          totalSupplyValue += coinTotalSupplyValue[0].totalValue || 0;
          totalSupplies.push(totalCoinSupply);
        }
        totalSupplyValue = Math.round(totalSupplyValue);
        marketStatistic.totalSupplyValue = totalSupplyValue;
        marketStatistic.supplies = totalSupplies;

        const totalTVL = Math.round(
          totalSupplyValue + totalCollateralValue - totalBorrowValue,
        );
        marketStatistic.totalTVL = totalTVL;

        // get latest leaderboard
        const leaderboards = new Map<string, any[]>();
        const zealyLeaderboard = await this.fetchZealyLeaderboard();
        leaderboards.set('zealy', zealyLeaderboard);
        const borrowLeadboard = await this.fetchBorrowLeaderboard(limit);
        leaderboards.set('borrow', borrowLeadboard);
        const tvlLeadboard = await this.fetchTvlLeaderboard(limit);
        leaderboards.set('tvl', tvlLeadboard);

        marketStatistic.leaderboards = leaderboards;
        await this.create(marketStatistic);

        if (this.LEADERBOARD_WRITE_TO_API !== 0) {
          await this.updateLatestLeaderboardToAPI(marketStatistic);
        }

        // console.log('[MarketStatistic]:', marketStatistic);
        endTime = new Date().getTime();
        execTime = (endTime - startTime) / 1000;

        const showSupplyValue = totalCollateralValue + totalSupplyValue;

        console.log(
          `[MarketStatistic]: TVL<${totalTVL}>, Supply<${showSupplyValue}>, Borrow<${totalBorrowValue}> , <${execTime}> sec.`,
        );
        StatisticService.resetLogTime();
      } // end of if passTime
    } catch (error) {
      console.error('Error caught while updateMarketStatistic() ', error);
    }
    return marketStatistic;
  }

  async updateLatestLeaderboardToAPI(latestStatistic: Statistic): Promise<any> {
    let latestLeaderboard;
    try {
      const LEADERBOARD_API_URL = this.API_URL + 'leaderboards';
      const startTime = new Date().getTime();
      const zealyLeaderboard = latestStatistic.leaderboards.get('zealy');
      const tvlLeadboard = latestStatistic.leaderboards.get('tvl');
      const borrowLeadboard = latestStatistic.leaderboards.get('borrow');

      latestLeaderboard = {
        zealy: zealyLeaderboard,
        tvl: tvlLeadboard,
        borrow: borrowLeadboard,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await axios.post(LEADERBOARD_API_URL, latestLeaderboard, {
        headers: {
          'api-key': this.API_KEY,
        },
      });

      const endTime = new Date().getTime();
      const execTime = (endTime - startTime) / 1000;
      console.log(
        `[Leaderboard]: updateLatestLeaderboardToAPI(), <${execTime}> sec.`,
      );
    } catch (e) {
      console.error(`Error caught while updateLatestLeaderboardToAPI() ${e}`);
    }
    return latestLeaderboard;
  }

  async fetchZealyLeaderboard(): Promise<any[]> {
    const zealyLeaderboard = [];
    try {
      const startTime = new Date().getTime();
      const response = await axios.get(this.LEADERBOARD_ZEALY_URL, {
        headers: { 'x-api-key': this.LEADERBOARD_API_KEY },
      });

      for (let i = 0; i < response.data.leaderboard.length; i++) {
        const item = response.data.leaderboard[i];
        const boardItem = {
          rank: i + 1,
          address: item.address,
          name: item.name,
          amount: item.xp,
        };

        zealyLeaderboard.push(boardItem);
      }
      const endTime = new Date().getTime();
      const execTime = (endTime - startTime) / 1000;
      console.log(
        `[Leaderboard-Zealy]: fetchZealyLeaderboard(), <${execTime}> sec.`,
      );
    } catch (error) {
      console.error('Error caught while fetchZealyLeaderboard() ', error);
    }

    return zealyLeaderboard;
  }

  async fetchBorrowLeaderboard(limit = this.LEADERBOARD_LIMIT): Promise<any[]> {
    const borrowLeadboard = [];

    try {
      const startTime = new Date().getTime();
      const coinPriceMap = await this.getCoinPriceMap();

      // calculate borrow value of senders
      const senderBorrowMap = new Map<string, number>();
      const borrowCoins =
        await this._obligationService.findDistinctBorrowCoins();
      for (const coin of borrowCoins) {
        const coinPrice = coinPriceMap.get(coin.coinType);
        const multiple = this.getDecimalMultiplier(coin.coinType);
        const topBorrowValueSenders =
          await this._obligationService.getTopBorrowValueSendersByCoinType(
            coin.coinType,
            coinPrice,
            multiple,
          );
        for (const sender of topBorrowValueSenders) {
          let senderBorrowValue = sender.senderCoinValue;
          if (senderBorrowMap.has(sender.sender)) {
            senderBorrowValue += senderBorrowMap.get(sender.sender);
          }
          senderBorrowMap.set(sender.sender, senderBorrowValue);
        }
      }

      // sort by value
      const topBorrowerMap = new Map(
        [...senderBorrowMap.entries()].sort((a, b) => b[1] - a[1]),
      );

      let rank = 0;
      for (const [sender, senderBorrowValue] of topBorrowerMap) {
        rank += 1;
        const suiNS = sender;
        const boardItem = {
          rank: rank,
          address: sender,
          name: suiNS,
          amount: senderBorrowValue,
        };

        if (rank <= limit) {
          if (this.LEADERBOARD_SUINS !== 0) {
            boardItem.name = await this._suiService.getSuiName(sender);
          }

          borrowLeadboard.push(boardItem);
        } else {
          break;
        }
      }

      const endTime = new Date().getTime();
      const execTime = (endTime - startTime) / 1000;
      console.log(
        `[Leaderboard-Borrows]: fetchBorrowLeaderboard() <${execTime}> sec.`,
      );
    } catch (error) {
      console.error('Error caught while fetchBorrowLeaderboard() ', error);
    }

    return borrowLeadboard;
  }

  async fetchTvlLeaderboard(limit = this.LEADERBOARD_LIMIT): Promise<any[]> {
    const tvlLeadboard = [];

    try {
      const startTime = new Date().getTime();
      const coinPriceMap = await this.getCoinPriceMap();

      // calculate collateral value of senders
      const senderCollateralMap = new Map<string, number>();
      const collateralCoins =
        await this._obligationService.findDistinctCollateralsCoins();
      for (const coin of collateralCoins) {
        const coinPrice = coinPriceMap.get(coin.coinType);
        const multiple = this.getDecimalMultiplier(coin.coinType);
        const topCollateralValueSenders =
          await this._obligationService.getTopCollateralValueSendersByCoinType(
            coin.coinType,
            coinPrice,
            multiple,
          );
        for (const sender of topCollateralValueSenders) {
          let senderCollateralValue = sender.senderCoinValue;
          if (senderCollateralMap.has(sender.sender)) {
            senderCollateralValue += senderCollateralMap.get(sender.sender);
          }
          senderCollateralMap.set(sender.sender, senderCollateralValue);
        }
      }

      // calculate borrow value of senders
      const senderBorrowMap = new Map<string, number>();
      const borrowCoins =
        await this._obligationService.findDistinctBorrowCoins();
      for (const coin of borrowCoins) {
        const coinPrice = coinPriceMap.get(coin.coinType);
        const multiple = this.getDecimalMultiplier(coin.coinType);
        const topBorrowValueSenders =
          await this._obligationService.getTopBorrowValueSendersByCoinType(
            coin.coinType,
            coinPrice,
            multiple,
          );
        for (const sender of topBorrowValueSenders) {
          let senderBorrowValue = sender.senderCoinValue;
          if (senderBorrowMap.has(sender.sender)) {
            senderBorrowValue += senderBorrowMap.get(sender.sender);
          }
          senderBorrowMap.set(sender.sender, senderBorrowValue);
        }
      }

      // calculate supply value of senders
      const senderSupplyMap = new Map<string, number>();
      const supplyCoins = await this._supplyService.findDistinctCoins();
      for (const coin of supplyCoins) {
        const coinPrice = coinPriceMap.get(coin.coinType);
        const multiple = this.getDecimalMultiplier(coin.coinType);
        const topSupplyValueSenders =
          await this._supplyService.getTopSupplyValueSendersByCoinType(
            coin.coinType,
            coinPrice,
            multiple,
          );
        for (const sender of topSupplyValueSenders) {
          let senderSupplyValue = sender.senderCoinValue;
          if (senderSupplyMap.has(sender.sender)) {
            senderSupplyValue += senderSupplyMap.get(sender.sender);
          }
          senderSupplyMap.set(sender.sender, senderSupplyValue);
        }
      }

      // calculate total tvl value of unique senders
      const uniqueSenders = new Set([
        ...senderCollateralMap.keys(),
        ...senderBorrowMap.keys(),
        ...senderSupplyMap.keys(),
      ]);
      const senderTvlMap = new Map<string, number>();
      for (const sender of uniqueSenders) {
        let senderTvlValue = 0;
        if (senderSupplyMap.has(sender)) {
          senderTvlValue += senderSupplyMap.get(sender);
        }
        if (senderCollateralMap.has(sender)) {
          senderTvlValue += senderCollateralMap.get(sender);
        }
        if (senderBorrowMap.has(sender)) {
          senderTvlValue -= senderBorrowMap.get(sender);
        }
        senderTvlMap.set(sender, senderTvlValue);
      }

      // sort by value
      const topTvlerMap = new Map(
        [...senderTvlMap.entries()].sort((a, b) => b[1] - a[1]),
      );

      let rank = 0;
      for (const [sender, senderTvlValue] of topTvlerMap) {
        rank += 1;
        const suiNS = sender;
        const boardItem = {
          rank: rank,
          address: sender,
          name: suiNS,
          amount: senderTvlValue,
        };

        if (rank <= limit) {
          if (this.LEADERBOARD_SUINS !== 0) {
            boardItem.name = await this._suiService.getSuiName(sender);
          }

          tvlLeadboard.push(boardItem);
        } else {
          break;
        }
      }

      const endTime = new Date().getTime();
      const execTime = (endTime - startTime) / 1000;
      console.log(
        `[Leaderboard-TVL]: fetchTvlLeaderboard() <${execTime}> sec.`,
      );
    } catch (error) {
      console.error('Error caught while fetchTvlLeaderboard() ', error);
    }

    return tvlLeadboard;
  }

  async updateSupplyBalance(
    senderList: string[],
    session: mongoose.ClientSession | null = null,
  ): Promise<any[]> {
    const supplies = [];
    try {
      for (let i = 0; i < senderList.length; i++) {
        const senderId = senderList[i];
        // Get all mint/redeem transactions of sender
        const mintList = await this._mintService.findBySender(senderId);
        const redeemList = await this._redeemService.findBySender(senderId);

        // Calculate supply balance
        const balanceMap = new Map<string, number>();
        for (let i = 0; i < mintList.length; i++) {
          const mint = mintList[i];
          const coinName = mint.depositAsset;
          const coinAmount = Number(mint.depositAmount);
          let balance = 0;
          if (balanceMap.has(coinName)) {
            balance = balanceMap.get(coinName);
          }
          balanceMap.set(coinName, balance + coinAmount);
        }
        for (let i = 0; i < redeemList.length; i++) {
          const redeem = redeemList[i];
          const coinName = redeem.withdrawAsset;
          const coinAmount = Number(redeem.withdrawAmount);
          let balance = 0;
          if (balanceMap.has(coinName)) {
            balance = balanceMap.get(coinName);
          }
          balanceMap.set(coinName, balance - coinAmount);
        }

        // Check supply assets balance
        const assets = [];
        for (const [coinName, balance] of balanceMap) {
          const processedBalance = Math.max(0, balance);
          if (processedBalance > 0) {
            const asset = {
              coin: coinName,
              balance: balance.toString(),
            };
            assets.push(asset);
          }
        }
        // Save only supply with assets
        if (assets.length > 0) {
          const supply = {
            sender: senderId,
            assets: assets,
          };
          const supplyObj =
            await this._supplyService.findOneBySenderAndUpdateSupply(
              senderId,
              supply,
              session,
            );
          supplies.push(supplyObj);
        }
      } // end of for loop
    } catch (error) {
      console.error(`Error caught while updateSupplyBalance() ${error}`);
    }

    return supplies;
  }
}
