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
import { SnapshotService } from '../snapshot/snapshot.service';
import { Snapshot } from '../snapshot/snapshot.schema';
// import { SnapbatchService } from 'src/snapbatch/snapbatch.service';
// import { Snapbatch } from 'src/snapbatch/snapbatch.schema';
import { DepositService } from 'src/deposit/deposit.service';
import { WithdrawService } from 'src/withdraw/withdraw.service';
import { BorrowService } from 'src/borrow/borrow.service';
import { RepayService } from 'src/repay/repay.service';
import { SnappriceService } from 'src/snapprice/snapprice.service';
import { SnapairdropService } from 'src/snapairdrop/snapairdrop.service';

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

  @Inject(DepositService)
  private readonly _depositService: DepositService;

  @Inject(WithdrawService)
  private readonly _withdrawService: WithdrawService;

  @Inject(BorrowService)
  private readonly _borrowService: BorrowService;

  @Inject(RepayService)
  private readonly _repayService: RepayService;

  @Inject(SnapshotService)
  private readonly _snapshotService: SnapshotService;

  @Inject(SnappriceService)
  private readonly _snappriceService: SnappriceService;

  @Inject(SnapairdropService)
  private readonly _snapairdropService: SnapairdropService;

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

  // private _coinPriceMap = new Map<string, number>();

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
    // AFSUI
    [
      'f325ce1300e8dac124071d3152c5c5ee6174914f8bc2161e88329cf579246efc::afsui::AFSUI',
      9,
    ],
    // HASUI
    [
      'bde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI',
      9,
    ],
    // VSUI
    [
      '549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT',
      9,
    ],
  ]);

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
    ['AFSUI', 'sui'],
    ['HASUI', 'sui'],
    ['VSUI', 'sui'],
    ['CERT', 'sui'],
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

    if (coinSymbol === 'CERT') {
      coinSymbol = 'VSUI';
    }
    return coinSymbol || '';
  }

  async getCoinPriceFromCoinGecko(symbol = 'USDC'): Promise<number> {
    let coinPrice = 0;
    let coinId = '';
    try {
      coinId = this.COIN_GECKO_IDS.get(symbol);
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
        `Error caught while getCoinPriceFromCoinGecko(${symbol})[${coinId}]: ${error}`,
      );
    }

    return coinPrice;
  }

  async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getCoinPriceMap(): Promise<Map<string, number>> {
    const coinPriceMap = new Map<string, number>();
    try {
      for (const coinType of this.COIN_DECIMALS.keys()) {
        const coinSymbol = this.getCoinSymbol(coinType);
        let coinPrice = 0;
        // LSD Tokens (*SUI) use SUI price temporarily
        if (coinSymbol.length > 3 && coinSymbol.endsWith('SUI')) {
          coinPrice =
            coinPriceMap.get(
              '0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
            ) || 0;
        } else {
          coinPrice = await this.getCoinPriceFromCoinGecko(coinSymbol);
          // delay 12.5 sec to avoid rate limit (5 calls per minute)
          await this.delay(12500);
        }

        // console.log(`[CoinPrice]: ${coinSymbol} <${coinPrice}>`);
        coinPriceMap.set(coinType, coinPrice);
      }
    } catch (error) {
      console.error('Error caught while getCoinPriceMap() ', error);
    }

    return coinPriceMap;
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
        console.log('[Stat-Prices]', marketStatistic.prices);

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
        const borrowLeadboard = await this.fetchBorrowLeaderboard(
          coinTypePriceMap,
          limit,
        );
        leaderboards.set('borrow', borrowLeadboard);
        const tvlLeadboard = await this.fetchTvlLeaderboard(
          coinTypePriceMap,
          limit,
        );
        leaderboards.set('tvl', tvlLeadboard);

        marketStatistic.leaderboards = leaderboards;
        marketStatistic.timestamp = new Date();
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

  async fetchBorrowLeaderboard(
    coinPriceMap: Map<string, number>,
    limit = this.LEADERBOARD_LIMIT,
  ): Promise<any[]> {
    const borrowLeadboard = [];

    try {
      const startTime = new Date().getTime();
      // const coinPriceMap = await this.getCoinPriceMap();

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

          if (senderBorrowValue > 0) {
            senderBorrowMap.set(sender.sender, senderBorrowValue);
          }
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

  async fetchTvlLeaderboard(
    coinPriceMap: Map<string, number>,
    limit = this.LEADERBOARD_LIMIT,
  ): Promise<any[]> {
    const tvlLeadboard = [];

    try {
      const startTime = new Date().getTime();
      // const coinPriceMap = await this.getCoinPriceMap();

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

          if (senderBorrowValue > 0) {
            senderBorrowMap.set(sender.sender, senderBorrowValue);
          }
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
        if (senderTvlValue > 0) {
          senderTvlMap.set(sender, senderTvlValue);
        }
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

  // Phase 2----------------------------------------------------------------
  private _dailyCoinPriceMap = new Map<string, Map<string, number>>();

  // convert to dd-mm-yyyy format
  formatCoinGeckoDate(date: Date = new Date()): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // +1 because months are 0-indexed
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  }

  async getHistoryCoinPriceFromCoinGecko(
    dateAt: Date = new Date(),
    symbol = 'USDC',
  ): Promise<number> {
    const formatedDate = this.formatCoinGeckoDate(dateAt);
    let coinPrice = 0;
    let coinId = '';
    try {
      coinId = this.COIN_GECKO_IDS.get(symbol);
      if (coinId) {
        const response = await axios.get(
          `https://api.coingecko.com/api/v3/coins/${coinId}/history?date=${formatedDate}`,
        );
        if (response.data.market_data.current_price.usd) {
          coinPrice = Number(response.data.market_data.current_price.usd);
        }
      }
    } catch (error) {
      console.error(
        `Error caught while getHistoryCoinPriceFromCoinGecko(${symbol})[${coinId}]: ${error}`,
      );
    }

    return coinPrice;
  }

  async isSenderSnapshotedAt(
    sender: string,
    snapshotAt = new Date(),
  ): Promise<boolean> {
    const snapshots = await this._snapshotService.findBySenderAt(
      sender,
      snapshotAt,
    );
    if (snapshots.length > 0) {
      return true;
    }
    return false;
  }

  async isThisDaySnapshoted(snapshotAt = new Date()): Promise<boolean> {
    const snapshots = await this._snapshotService.findBySnapshotDay(snapshotAt);

    return snapshots.length > 0 ? true : false;
  }

  async phase2SnapshotUniqueActiveSenders(
    snapStartAt = new Date(),
    snapEndAt = new Date(),
  ): Promise<void> {
    try {
      // const snapEndTSms = snapEndAt.getTime();
      const startTime = new Date().getTime();

      console.log('[p2Snapshot-ActiveSenders]: Getting uniqueSenders ....');
      const uniqueSenders = await this._snapshotService.findDistinctSenders();

      let senderCount = 0;
      let senderStartTime = new Date().getTime();
      let senderEndTime = new Date().getTime();
      for (const sender of uniqueSenders) {
        senderStartTime = new Date().getTime();
        senderCount += 1;

        if (!(await this.isSenderSnapshotedAt(sender, snapEndAt))) {
          const savedSnapshots = await this.phase2SnapshotSenderBetween(
            sender,
            snapStartAt,
            snapEndAt,
          );

          senderEndTime = new Date().getTime();
          const senderExecTime = (senderEndTime - senderStartTime) / 1000;

          console.log(
            `[p2Snapshot-ActiveSenders]: (${senderCount}/${uniqueSenders.length})], ${sender} , snapshots<${savedSnapshots.length}> , <${senderExecTime}> sec.`,
          );
        } else {
          console.log(
            `[p2Snapshot-ActiveSenders]: (${senderCount}/${uniqueSenders.length})]: Skip ${sender} due to already snapshoted`,
          );
        }
      }
      const endTime = new Date().getTime();
      const batchExecTime = (endTime - startTime) / 1000;
      console.log(
        `[p2Snapshot-ActiveSenders]: <${uniqueSenders.length}>, <${batchExecTime}> sec.`,
      );
    } catch (e) {
      console.error(
        `Error caught while phase2SnapshotUniqueActiveSenders() ${e}`,
      );
    }
  }

  async phase2SnapshotObligationsBetween(
    snapStartAt = new Date(),
    snapEndAt = new Date(),
  ): Promise<void> {
    try {
      // const snapEndTSms = snapEndAt.getTime();
      const startTime = new Date().getTime();

      console.log('[p2Snapshot-Obligations]: Getting uniqueSortedSenders ....');
      const uniqueSenders = await this._obligationService.findDistinctSenders();

      let senderCount = 0;
      let senderStartTime = new Date().getTime();
      let senderEndTime = new Date().getTime();
      for (const sender of uniqueSenders) {
        senderStartTime = new Date().getTime();
        senderCount += 1;

        if (!(await this.isSenderSnapshotedAt(sender, snapEndAt))) {
          const savedSnapshots = await this.phase2SnapshotSenderBetween(
            sender,
            snapStartAt,
            snapEndAt,
          );

          senderEndTime = new Date().getTime();
          const senderExecTime = (senderEndTime - senderStartTime) / 1000;

          console.log(
            `[p2Snapshot-Obligations]: (${senderCount}/${uniqueSenders.length})], ${sender} , snapshots<${savedSnapshots.length}> , <${senderExecTime}> sec.`,
          );
        } else {
          console.log(
            `[p2Snapshot-Obligations]: (${senderCount}/${uniqueSenders.length})]: Skip ${sender} due to already snapshoted`,
          );
        }
      }
      const endTime = new Date().getTime();
      const batchExecTime = (endTime - startTime) / 1000;
      console.log(
        `[p2Snapshot-Obligations]: <${uniqueSenders.length}>, <${batchExecTime}> sec.`,
      );
    } catch (e) {
      console.error(
        `Error caught while phase2SnapshotObligationsBetween() ${e}`,
      );
    }
  }

  async phase2SnapshotSuppliesBetween(
    snapStartAt = new Date(),
    snapEndAt = new Date(),
  ): Promise<void> {
    try {
      // const snapEndTSms = snapEndAt.getTime();
      const startTime = new Date().getTime();

      // get all senders page by page
      const pageSize = Number(process.env.SNAPSHOT_PAGE_SIZE) || 1000;
      const pageStart = Number(process.env.SNAPSHOT_PAGE_START) || 1;
      const pageEnd = Number(process.env.SNAPSHOT_PAGE_END) || 9999;

      let pageIdx = pageStart;
      let totalSupplyCount = 0;
      let pageStartTime;
      let pageEndTime;
      while (true) {
        pageStartTime = new Date().getTime();

        const pageSupplies = await this._supplyService.findSortedPage(
          pageSize,
          pageIdx,
        );
        totalSupplyCount += pageSupplies.length;

        // if there are no more supplies, break
        if (pageSupplies.length === 0) {
          break;
        }

        let senderCount = 0;
        let senderStartTime = new Date().getTime();
        let senderEndTime = new Date().getTime();
        for (const supply of pageSupplies) {
          senderCount += 1;

          if (!(await this.isSenderSnapshotedAt(supply.sender, snapEndAt))) {
            senderStartTime = new Date().getTime();
            const savedSnapshots = await this.phase2SnapshotSenderBetween(
              supply.sender,
              snapStartAt,
              snapEndAt,
            );

            senderEndTime = new Date().getTime();
            const senderExecTime = (senderEndTime - senderStartTime) / 1000;
            console.log(
              `[p2Snapshot-Supplies]: Page[${pageIdx}](${senderCount}/${pageSupplies.length})]: ${supply.sender} , snapshots<${savedSnapshots.length}> , <${senderExecTime}> sec.`,
            );
          } else {
            console.log(
              `[p2Snapshot-Supplies]: Page[${pageIdx}](${senderCount}/${pageSupplies.length})]: Skip ${supply.sender} due to already snapshoted`,
            );
          }
        }
        pageEndTime = new Date().getTime();
        const pageExecTime = (pageEndTime - pageStartTime) / 1000;
        console.log(
          `[p2Snapshot-Supplies]: Page[${pageIdx}](${senderCount}/${pageSupplies.length})]: , <${pageExecTime}> sec. `,
        );

        pageIdx += 1;
        if (pageIdx > pageEnd) {
          break;
        }
      } //end of while

      const endTime = new Date().getTime();
      const execTime = (endTime - startTime) / 1000;
      console.log(
        `[p2Snapshot-Supplies]: Total<${totalSupplyCount}>  , <${execTime}> sec.`,
      );
    } catch (e) {
      console.error(`Error caught while phase2SnapshotSuppliesBetween() ${e}`);
    }
  }

  async snapshotBack(): Promise<void> {
    // decide start date & end date
    const today = new Date();
    const today0am = new Date(today.toISOString().split('T')[0]);
    const previousDay = new Date(today0am);
    previousDay.setDate(today0am.getDate() - 1);
    const snapEndTSms = today0am.getTime();

    let snapStartAt: Date;
    let snapEndAt: Date;
    if (process.env.SNAPSHOT_MANUAL) {
      // get snapshot dates manually from env
      snapStartAt = process.env.SNAPSHOT_START_AT
        ? new Date(process.env.SNAPSHOT_START_AT)
        : new Date(previousDay);

      snapEndAt = process.env.SNAPSHOT_END_AT
        ? new Date(process.env.SNAPSHOT_END_AT)
        : new Date(previousDay);
    } else {
      // get snapshot date automatically
      snapEndAt = new Date(previousDay);

      while (!(await this.isThisDaySnapshoted(previousDay))) {
        snapStartAt = new Date(previousDay);
        // move to the previous day
        previousDay.setDate(snapStartAt.getDate() - 1);
      } // end of while
    }

    if (snapStartAt) {
      console.log(
        `[p2Snapshot][${today.toISOString()}]: Snapshot from<${
          snapStartAt.toISOString().split('T')[0]
        }>, To<${today0am.toISOString()}>(${snapEndTSms})`,
      );

      // Get all history coin price map
      this._dailyCoinPriceMap =
        await this._snappriceService.getDailyCoinPriceMapBetween(
          snapStartAt,
          snapEndAt,
        );
      console.log(this._dailyCoinPriceMap);

      const snapActiveSendersFlag =
        Number(process.env.SNAPSHOT_ACTIVE_SENDERS) || 0;
      const isSnapActiveSenders = snapActiveSendersFlag > 0 ? true : false;
      if (isSnapActiveSenders) {
        await this.phase2SnapshotUniqueActiveSenders(snapStartAt, snapEndAt);
      }

      const snapObligationsFlag = Number(process.env.SNAPSHOT_OBLIGATIONS) || 0;
      const isSnapbatchObligations = snapObligationsFlag > 0 ? true : false;
      if (isSnapbatchObligations) {
        await this.phase2SnapshotObligationsBetween(snapStartAt, snapEndAt);
      }

      const snapSuppliesFlag = Number(process.env.SNAPSHOT_SUPPLIES) || 0;
      const isSnapbatchSupplies = snapSuppliesFlag > 0 ? true : false;
      if (isSnapbatchSupplies) {
        await this.phase2SnapshotSuppliesBetween(snapStartAt, snapEndAt);
      }
    } else {
      console.log(`[p2Snapshot][${today.toISOString()}]: No snapshot to do.`);
    }
  }

  async phase2SnapshotBetween(): Promise<void> {
    const today = new Date();
    const snapStartAt = process.env.SNAPSHOT_START_AT
      ? new Date(process.env.SNAPSHOT_START_AT)
      : new Date(today.toISOString().split('T')[0]);

    const snapEndAt = process.env.SNAPSHOT_END_AT
      ? new Date(process.env.SNAPSHOT_END_AT)
      : new Date(today.toISOString().split('T')[0]);

    const endNextDate = new Date(snapEndAt);
    endNextDate.setDate(snapEndAt.getDate() + 1);
    const snapEndTSms = endNextDate.getTime();
    console.log(
      `[p2Snapshot]-From<${
        snapStartAt.toISOString().split('T')[0]
      }>, To<${endNextDate.toISOString()}>(${snapEndTSms})`,
    );

    // Get all history coin price map
    this._dailyCoinPriceMap =
      await this._snappriceService.getDailyCoinPriceMapBetween(
        snapStartAt,
        snapEndAt,
      );
    // console.log(this._dailyCoinPriceMap);

    const snapObligationsFlag = Number(process.env.SNAPSHOT_OBLIGATIONS) || 0;
    const isSnapbatchObligations = snapObligationsFlag > 0 ? true : false;

    if (isSnapbatchObligations) {
      await this.phase2SnapshotObligationsBetween(snapStartAt, snapEndAt);
    }
    await this.phase2SnapshotSuppliesBetween(snapStartAt, snapEndAt);
  }

  async phase2SnapshotSenderBetween(
    sender: string,
    snapStartAt = new Date(),
    snapEndAt = new Date(),
  ): Promise<Snapshot[]> {
    const savedSnapshots = [];
    try {
      const endNextDate = new Date(snapEndAt);
      endNextDate.setDate(snapEndAt.getDate() + 1);
      const snapEndTSms = endNextDate.getTime();

      // let startTime = new Date().getTime();
      // let endTime = new Date().getTime();
      // let execTime = 0;

      // Get all mint/redeem transactions of sender
      const mintList = await this._mintService.findBySenderBefore(
        sender,
        snapEndTSms,
      );
      // console.log(mintList);
      const redeemList = await this._redeemService.findBySenderBefore(
        sender,
        snapEndTSms,
      );

      const senderObligations =
        await this._obligationService.findBySenderBefore(sender, snapEndTSms);

      // console.log(senderObligations);
      const depositList = [],
        withdrawList = [],
        borrowList = [],
        repayList = [];
      for (const senderObligation of senderObligations) {
        const obligationId = senderObligation.obligation_id;
        // Get all deposit/withdraw transactions of obligation_id
        const oblDepositList =
          await this._depositService.findByObligationIdBefore(
            obligationId,
            snapEndTSms,
          );
        const oblWithdrawList =
          await this._withdrawService.findByObligationIdBefore(
            obligationId,
            snapEndTSms,
          );
        depositList.push(...oblDepositList);
        withdrawList.push(...oblWithdrawList);

        // Get all borrow/repay transactions of obligation_id
        const oblBorrowList =
          await this._borrowService.findByObligationIdBefore(
            obligationId,
            snapEndTSms,
          );

        const oblRepayList = await this._repayService.findByObligationIdBefore(
          obligationId,
          snapEndTSms,
        );
        borrowList.push(...oblBorrowList);
        repayList.push(...oblRepayList);
      }

      // endTime = new Date().getTime();
      // execTime = (endTime - startTime) / 1000;
      // console.log(`[p2Snapshot]- Get <${sender}> txs done, <${execTime}> sec.`);

      let currentDate = snapStartAt;
      while (currentDate <= snapEndAt) {
        // startTime = new Date().getTime();
        // const snapshotedAt = currentDate;
        // const snapTimestamp = currentDate.getTime();
        const nextDate = new Date(currentDate);
        nextDate.setDate(currentDate.getDate() + 1);
        const snapTimestamp = nextDate.getTime();

        // Calculate supply balance
        const supplyBalanceMap = new Map<string, number>();
        for (let i = 0; i < mintList.length; i++) {
          const mint = mintList[i];
          if (Number(mint.timestampMs) < snapTimestamp) {
            const coinName = mint.depositAsset;
            const coinAmount = Number(mint.depositAmount);
            let balance = 0;
            if (supplyBalanceMap.has(coinName)) {
              balance = supplyBalanceMap.get(coinName);
            }
            const caculatedBalance = Math.max(0, balance + coinAmount);
            supplyBalanceMap.set(coinName, caculatedBalance);
          }
        }
        for (let i = 0; i < redeemList.length; i++) {
          const redeem = redeemList[i];
          if (Number(redeem.timestampMs) < snapTimestamp) {
            const coinName = redeem.withdrawAsset;
            const coinAmount = Number(redeem.withdrawAmount);
            let balance = 0;
            if (supplyBalanceMap.has(coinName)) {
              balance = supplyBalanceMap.get(coinName);
            }
            const caculatedBalance = Math.max(0, balance - coinAmount);
            supplyBalanceMap.set(coinName, caculatedBalance);
          }
        }
        // console.log(`[getSenderSupplyAssets]- balanceMap: ${supplyBalanceMap}`);
        // console.log(supplyBalanceMap);

        // Check supply assets balance
        const supplyAssets = [];
        for (const [coinName, balance] of supplyBalanceMap) {
          const processedBalance = Math.max(0, balance);
          if (processedBalance > 0) {
            const asset = {
              coin: coinName,
              balance: balance,
            };
            supplyAssets.push(asset);
          }
        }

        // Calculate collateral balance
        const collateralBalanceMap = new Map<string, number>();
        for (let i = 0; i < depositList.length; i++) {
          const deposit = depositList[i];
          if (Number(deposit.timestampMs) < snapTimestamp) {
            const coinName = deposit.asset;
            const coinAmount = Number(deposit.amount);
            let balance = 0;
            if (collateralBalanceMap.has(coinName)) {
              balance = collateralBalanceMap.get(coinName);
            }
            const caculatedBalance = Math.max(0, balance + coinAmount);
            collateralBalanceMap.set(coinName, caculatedBalance);
          }
        }
        for (let i = 0; i < withdrawList.length; i++) {
          const withdraw = withdrawList[i];
          if (Number(withdraw.timestampMs) < snapTimestamp) {
            const coinName = withdraw.asset;
            const coinAmount = Number(withdraw.amount);
            let balance = 0;
            if (collateralBalanceMap.has(coinName)) {
              balance = collateralBalanceMap.get(coinName);
            }
            const caculatedBalance = Math.max(0, balance - coinAmount);
            collateralBalanceMap.set(coinName, caculatedBalance);
          }
        }

        // Check collateral assets balance
        const collateralAssets = [];
        for (const [coinName, balance] of collateralBalanceMap) {
          const processedBalance = Math.max(0, balance);
          if (processedBalance > 0) {
            const asset = {
              coin: coinName,
              balance: balance,
            };
            collateralAssets.push(asset);
          }
        }

        // Calculate debts balance
        const debtBalanceMap = new Map<string, number>();
        for (let i = 0; i < borrowList.length; i++) {
          const borrow = borrowList[i];
          if (Number(borrow.timestampMs) < snapTimestamp) {
            const coinName = borrow.asset;
            const coinAmount = Number(borrow.amount);
            let balance = 0;
            if (debtBalanceMap.has(coinName)) {
              balance = debtBalanceMap.get(coinName);
            }
            const caculatedBalance = Math.max(0, balance + coinAmount);
            debtBalanceMap.set(coinName, caculatedBalance);
          }
        }
        for (let i = 0; i < repayList.length; i++) {
          const repay = repayList[i];
          if (Number(repay.timestampMs) < snapTimestamp) {
            const coinName = repay.asset;
            const coinAmount = Number(repay.amount);
            let balance = 0;
            if (debtBalanceMap.has(coinName)) {
              balance = debtBalanceMap.get(coinName);
            }
            const caculatedBalance = Math.max(0, balance - coinAmount);
            debtBalanceMap.set(coinName, caculatedBalance);
          }
        }

        // Check debts assets balance
        const debtAssets = [];
        for (const [coinName, balance] of debtBalanceMap) {
          const processedBalance = Math.max(0, balance);
          if (processedBalance > 0) {
            const asset = {
              coin: coinName,
              balance: balance,
            };
            debtAssets.push(asset);
          }
        }

        const snapshotDay = currentDate.toISOString().split('T')[0];

        // calculate supply value of sender
        let senderSupplyValue = 0;
        // const coinPriceMap = dayPriceMap.get(csnapshotDay);
        const coinPriceMap = this._dailyCoinPriceMap.get(snapshotDay);
        for (const asset of supplyAssets) {
          const coinPrice = coinPriceMap.get(asset.coin) || 0;
          const multiple = this.getDecimalMultiplier(asset.coin);
          const coinValue = asset.balance * multiple * coinPrice;
          // console.log(
          //   `[Snapshot]- <${asset.coin}>@<${coinPrice}>= ${coinValue}`,
          // );
          senderSupplyValue += coinValue;
        }
        // console.log(senderSupplyValue);

        // calculate collateral & borrow value of sender
        let senderCollateralValue = 0;
        for (const collateral of collateralAssets) {
          const coinPrice = coinPriceMap.get(collateral.coin) || 0;
          const multiple = this.getDecimalMultiplier(collateral.coin);
          const coinValue = collateral.balance * multiple * coinPrice;
          senderCollateralValue += coinValue;
        }
        let senderBorrowValue = 0;
        for (const debt of debtAssets) {
          const coinPrice = coinPriceMap.get(debt.coin) || 0;
          const multiple = this.getDecimalMultiplier(debt.coin);
          const coinValue = debt.balance * multiple * coinPrice;

          senderBorrowValue += coinValue;
        }

        const senderTvl = Math.max(
          0,
          senderSupplyValue + senderCollateralValue - senderBorrowValue,
        );

        const supplyValueThreshold =
          Number(process.env.SNAPSHOT_SUPPLY_VALUE_THRESHOLD) || 10;
        const borrowValueThreshold =
          Number(process.env.SNAPSHOT_BORROW_VALUE_THRESHOLD) || 10;

        if (
          senderSupplyValue > supplyValueThreshold ||
          senderBorrowValue > borrowValueThreshold
        ) {
          const snapshot = {
            sender: sender,
            supplyValue: senderSupplyValue,
            collateralValue: senderCollateralValue,
            borrowValue: senderBorrowValue,
            tvl: senderTvl,

            // snapshotedAt: snapshotedAt,
            snapshotDay: snapshotDay,
          };

          // console.log(snapshot);

          const savedSnapshot =
            await this._snapshotService.findOneAndUpdateBySenderAt(
              snapshot.snapshotDay,
              snapshot.sender,
              snapshot,
            );
          savedSnapshots.push(savedSnapshot);

          // endTime = new Date().getTime();
          // execTime = (endTime - startTime) / 1000;
          // // console.log(
          //   `[p2Snapshot][${snapshotDay}]:sender<${sender}>, borrowValue<${savedSnapshot.borrowValue}>, supplyValue<${savedSnapshot.supplyValue}, <${execTime}> sec. `,
          // );
        } else {
          // endTime = new Date().getTime();
          // execTime = (endTime - startTime) / 1000;
          // console.log(
          //   `[p2Snapshot][${snapshotDay}]:sender<${sender}>, No borrowValue & supplyValue, <${execTime}> sec. `,
          // );
        }

        // Move to the next day
        currentDate = nextDate;
      } // end of while
    } catch (e) {
      console.error(
        `Error caught while phase2SnapshotSenderBetween()-From<${snapStartAt.toISOString()}><${sender}> ${e}`,
      );
    } finally {
      return savedSnapshots;
    }
  }

  async snapairdropBack(): Promise<void> {
    // decide start date & end date
    const today = new Date();
    const today0am = new Date(today.toISOString().split('T')[0]);
    const previousDay = new Date(today0am);
    previousDay.setDate(today0am.getDate() - 1);
    const snapEndTSms = today0am.getTime();

    let snapStartAt: Date;
    let snapEndAt: Date;
    if (process.env.SNAPSHOT_MANUAL) {
      // get snapshot dates manually from env
      snapStartAt = process.env.SNAPSHOT_START_AT
        ? new Date(process.env.SNAPSHOT_START_AT)
        : new Date(previousDay);

      snapEndAt = process.env.SNAPSHOT_END_AT
        ? new Date(process.env.SNAPSHOT_END_AT)
        : new Date(previousDay);
    } else {
      // get snapshot date automatically
      snapEndAt = new Date(previousDay);

      while (!(await this.isThisDaySnapairdroped(previousDay))) {
        snapStartAt = new Date(previousDay);
        // move to the previous day
        previousDay.setDate(snapStartAt.getDate() - 1);
      } // end of while
    }

    if (snapStartAt) {
      console.log(
        `[SnapAirdrop][${today.toISOString()}]: Snapshot from<${
          snapStartAt.toISOString().split('T')[0]
        }>, To<${today0am.toISOString()}>(${snapEndTSms})`,
      );

      // Get all history coin price map
      this._dailyCoinPriceMap =
        await this._snappriceService.getDailyCoinPriceMapBetween(
          snapStartAt,
          snapEndAt,
        );
      console.log(this._dailyCoinPriceMap);

      const snapActiveSendersFlag =
        Number(process.env.SNAPSHOT_ACTIVE_SENDERS) || 0;
      const isSnapActiveSenders = snapActiveSendersFlag > 0 ? true : false;
      if (isSnapActiveSenders) {
        await this.snapairdropUniqueActiveSenders(snapStartAt, snapEndAt);
      }

      const snapObligationsFlag = Number(process.env.SNAPSHOT_OBLIGATIONS) || 0;
      const isSnapbatchObligations = snapObligationsFlag > 0 ? true : false;
      if (isSnapbatchObligations) {
        await this.snapairdropObligationsBetween(snapStartAt, snapEndAt);
      }

      const snapSuppliesFlag = Number(process.env.SNAPSHOT_SUPPLIES) || 0;
      const isSnapbatchSupplies = snapSuppliesFlag > 0 ? true : false;
      if (isSnapbatchSupplies) {
        await this.snapairdropSuppliesBetween(snapStartAt, snapEndAt);
      }
    } else {
      console.log(`[SnapAirdrop][${today.toISOString()}]: No snapshot to do.`);
    }
  }

  async snapairdropUniqueActiveSenders(
    snapStartAt = new Date(),
    snapEndAt = new Date(),
  ): Promise<void> {
    try {
      // const snapEndTSms = snapEndAt.getTime();
      const startTime = new Date().getTime();

      console.log('[SnapAirdrop-ActiveSenders]: Getting uniqueSenders ....');
      const uniqueSenders = await this._snapshotService.findDistinctSenders();

      let senderCount = 0;
      let senderStartTime = new Date().getTime();
      let senderEndTime = new Date().getTime();
      for (const sender of uniqueSenders) {
        senderStartTime = new Date().getTime();
        senderCount += 1;

        if (!(await this.isSenderSnapairdropedAt(sender, snapEndAt))) {
          // if (!(await this.isSenderSnapairdroped(sender))) {
          const savedSnapairdrops = await this.snapairdropSenderBetween(
            sender,
            snapStartAt,
            snapEndAt,
          );

          senderEndTime = new Date().getTime();
          const senderExecTime = (senderEndTime - senderStartTime) / 1000;

          console.log(
            `[SnapAirdrop-ActiveSenders]: (${senderCount}/${uniqueSenders.length})], ${sender} , snapshots<${savedSnapairdrops.length}> , <${senderExecTime}> sec.`,
          );
        } else {
          console.log(
            `[SnapAirdrop-ActiveSenders]: (${senderCount}/${uniqueSenders.length})]: Skip ${sender} due to already snapshoted`,
          );
        }
      }
      const endTime = new Date().getTime();
      const batchExecTime = (endTime - startTime) / 1000;
      console.log(
        `[SnapAirdrop-ActiveSenders]: <${uniqueSenders.length}>, <${batchExecTime}> sec.`,
      );
    } catch (e) {
      console.error(`Error caught while snapairdropUniqueActiveSenders() ${e}`);
    }
  }

  async isThisDaySnapairdroped(snapAt = new Date()): Promise<boolean> {
    const snapairdrops = await this._snapairdropService.findBySnapairdropDay(
      snapAt,
    );

    return snapairdrops.length > 0 ? true : false;
  }

  async isSenderSnapairdropedAt(
    sender: string,
    snapAt = new Date(),
  ): Promise<boolean> {
    const snapairdrops = await this._snapairdropService.findBySenderAt(
      sender,
      snapAt,
    );
    if (snapairdrops.length > 0) {
      return true;
    }
    return false;
  }

  async isSenderSnapairdroped(sender: string): Promise<boolean> {
    const snapairdrops = await this._snapairdropService.findBySender(sender);
    if (snapairdrops.length > 0) {
      return true;
    }
    return false;
  }

  async snapairdropSenderBetween(
    sender: string,
    snapStartAt = new Date(),
    snapEndAt = new Date(),
  ): Promise<Snapshot[]> {
    const savedSnapairdrops = [];
    try {
      const endNextDate = new Date(snapEndAt);
      endNextDate.setDate(snapEndAt.getDate() + 1);
      const snapEndTSms = endNextDate.getTime();

      // let startTime = new Date().getTime();
      // let endTime = new Date().getTime();
      // let execTime = 0;

      // Get all mint/redeem transactions of sender
      const mintList = await this._mintService.findBySenderBefore(
        sender,
        snapEndTSms,
      );
      // console.log(mintList);
      const redeemList = await this._redeemService.findBySenderBefore(
        sender,
        snapEndTSms,
      );

      const senderObligations =
        await this._obligationService.findBySenderBefore(sender, snapEndTSms);

      // console.log(senderObligations);
      const depositList = [],
        withdrawList = [],
        borrowList = [],
        repayList = [];
      for (const senderObligation of senderObligations) {
        const obligationId = senderObligation.obligation_id;
        // Get all deposit/withdraw transactions of obligation_id
        const oblDepositList =
          await this._depositService.findByObligationIdBefore(
            obligationId,
            snapEndTSms,
          );
        const oblWithdrawList =
          await this._withdrawService.findByObligationIdBefore(
            obligationId,
            snapEndTSms,
          );
        depositList.push(...oblDepositList);
        withdrawList.push(...oblWithdrawList);

        // Get all borrow/repay transactions of obligation_id
        const oblBorrowList =
          await this._borrowService.findByObligationIdBefore(
            obligationId,
            snapEndTSms,
          );

        const oblRepayList = await this._repayService.findByObligationIdBefore(
          obligationId,
          snapEndTSms,
        );
        borrowList.push(...oblBorrowList);
        repayList.push(...oblRepayList);
      }

      // endTime = new Date().getTime();
      // execTime = (endTime - startTime) / 1000;
      // console.log(`[p2Snapshot]- Get <${sender}> txs done, <${execTime}> sec.`);

      let currentDate = snapStartAt;
      while (currentDate <= snapEndAt) {
        // startTime = new Date().getTime();
        // const snapshotedAt = currentDate;
        // const snapTimestamp = currentDate.getTime();
        const nextDate = new Date(currentDate);
        nextDate.setDate(currentDate.getDate() + 1);
        const snapTimestamp = nextDate.getTime();

        // Calculate supply balance
        const supplyBalanceMap = new Map<string, number>();
        for (let i = 0; i < mintList.length; i++) {
          const mint = mintList[i];
          if (Number(mint.timestampMs) < snapTimestamp) {
            const coinName = mint.depositAsset;
            const coinAmount = Number(mint.depositAmount);
            let balance = 0;
            if (supplyBalanceMap.has(coinName)) {
              balance = supplyBalanceMap.get(coinName);
            }
            const caculatedBalance = Math.max(0, balance + coinAmount);
            supplyBalanceMap.set(coinName, caculatedBalance);
          }
        }
        for (let i = 0; i < redeemList.length; i++) {
          const redeem = redeemList[i];
          if (Number(redeem.timestampMs) < snapTimestamp) {
            const coinName = redeem.withdrawAsset;
            const coinAmount = Number(redeem.withdrawAmount);
            let balance = 0;
            if (supplyBalanceMap.has(coinName)) {
              balance = supplyBalanceMap.get(coinName);
            }
            const caculatedBalance = Math.max(0, balance - coinAmount);
            supplyBalanceMap.set(coinName, caculatedBalance);
          }
        }
        // console.log(`[getSenderSupplyAssets]- balanceMap: ${supplyBalanceMap}`);
        // console.log(supplyBalanceMap);

        // Check supply assets balance
        const supplyAssets = [];
        for (const [coinName, balance] of supplyBalanceMap) {
          const processedBalance = Math.max(0, balance);
          if (processedBalance > 0) {
            const asset = {
              coin: coinName,
              balance: balance,
            };
            supplyAssets.push(asset);
          }
        }

        // Calculate collateral balance
        const collateralBalanceMap = new Map<string, number>();
        for (let i = 0; i < depositList.length; i++) {
          const deposit = depositList[i];
          if (Number(deposit.timestampMs) < snapTimestamp) {
            const coinName = deposit.asset;
            const coinAmount = Number(deposit.amount);
            let balance = 0;
            if (collateralBalanceMap.has(coinName)) {
              balance = collateralBalanceMap.get(coinName);
            }
            const caculatedBalance = Math.max(0, balance + coinAmount);
            collateralBalanceMap.set(coinName, caculatedBalance);
          }
        }
        for (let i = 0; i < withdrawList.length; i++) {
          const withdraw = withdrawList[i];
          if (Number(withdraw.timestampMs) < snapTimestamp) {
            const coinName = withdraw.asset;
            const coinAmount = Number(withdraw.amount);
            let balance = 0;
            if (collateralBalanceMap.has(coinName)) {
              balance = collateralBalanceMap.get(coinName);
            }
            const caculatedBalance = Math.max(0, balance - coinAmount);
            collateralBalanceMap.set(coinName, caculatedBalance);
          }
        }

        // Check collateral assets balance
        const collateralAssets = [];
        for (const [coinName, balance] of collateralBalanceMap) {
          const processedBalance = Math.max(0, balance);
          if (processedBalance > 0) {
            const asset = {
              coin: coinName,
              balance: balance,
            };
            collateralAssets.push(asset);
          }
        }

        // Calculate debts balance
        const debtBalanceMap = new Map<string, number>();
        for (let i = 0; i < borrowList.length; i++) {
          const borrow = borrowList[i];
          if (Number(borrow.timestampMs) < snapTimestamp) {
            const coinName = borrow.asset;
            const coinAmount = Number(borrow.amount);
            let balance = 0;
            if (debtBalanceMap.has(coinName)) {
              balance = debtBalanceMap.get(coinName);
            }
            const caculatedBalance = Math.max(0, balance + coinAmount);
            debtBalanceMap.set(coinName, caculatedBalance);
          }
        }
        for (let i = 0; i < repayList.length; i++) {
          const repay = repayList[i];
          if (Number(repay.timestampMs) < snapTimestamp) {
            const coinName = repay.asset;
            const coinAmount = Number(repay.amount);
            let balance = 0;
            if (debtBalanceMap.has(coinName)) {
              balance = debtBalanceMap.get(coinName);
            }
            const caculatedBalance = Math.max(0, balance - coinAmount);
            debtBalanceMap.set(coinName, caculatedBalance);
          }
        }

        // Check debts assets balance
        const debtAssets = [];
        for (const [coinName, balance] of debtBalanceMap) {
          const processedBalance = Math.max(0, balance);
          if (processedBalance > 0) {
            const asset = {
              coin: coinName,
              balance: balance,
            };
            debtAssets.push(asset);
          }
        }

        const snapairdropDay = currentDate.toISOString().split('T')[0];

        // calculate supply value of sender
        let senderSupplyValue = 0;
        // const coinPriceMap = dayPriceMap.get(csnapshotDay);
        const coinPriceMap = this._dailyCoinPriceMap.get(snapairdropDay);
        for (const asset of supplyAssets) {
          const coinPrice = coinPriceMap.get(asset.coin) || 0;
          const multiple = this.getDecimalMultiplier(asset.coin);
          const coinValue = asset.balance * multiple * coinPrice;
          // console.log(
          //   `[Snapshot]- <${asset.coin}>@<${coinPrice}>= ${coinValue}`,
          // );
          senderSupplyValue += coinValue;
        }
        // console.log(senderSupplyValue);

        // calculate collateral & borrow value of sender
        let senderCollateralValue = 0;
        for (const collateral of collateralAssets) {
          const coinPrice = coinPriceMap.get(collateral.coin) || 0;
          const multiple = this.getDecimalMultiplier(collateral.coin);
          const coinValue = collateral.balance * multiple * coinPrice;
          senderCollateralValue += coinValue;
        }
        let senderBorrowValue = 0;
        for (const debt of debtAssets) {
          const coinPrice = coinPriceMap.get(debt.coin) || 0;
          const multiple = this.getDecimalMultiplier(debt.coin);
          const coinValue = debt.balance * multiple * coinPrice;

          senderBorrowValue += coinValue;
        }

        const senderTvl = Math.max(
          0,
          senderSupplyValue + senderCollateralValue - senderBorrowValue,
        );

        const supplyValueThreshold =
          Number(process.env.SNAPSHOT_SUPPLY_VALUE_THRESHOLD) || 1;
        const borrowValueThreshold =
          Number(process.env.SNAPSHOT_BORROW_VALUE_THRESHOLD) || 1;
        const collateralValueThreshold =
          Number(process.env.SNAPSHOT_COLLATERAL_VALUE_THRESHOLD) || 1;
        const tvlThreshold = Number(process.env.SNAPSHOT_TVL_THRESHOLD) || 1;

        if (
          senderSupplyValue >= supplyValueThreshold ||
          senderBorrowValue >= borrowValueThreshold ||
          senderCollateralValue >= collateralValueThreshold
        ) {
          const snapairdrop = {
            sender: sender,
            supplyValue: senderSupplyValue,
            collateralValue: senderCollateralValue,
            borrowValue: senderBorrowValue,
            tvl: senderTvl,

            supplyEligible: senderSupplyValue >= supplyValueThreshold ? 1 : 0,
            collateralEligible:
              senderCollateralValue >= collateralValueThreshold ? 1 : 0,
            borrowEligible: senderBorrowValue >= borrowValueThreshold ? 1 : 0,
            tvlEligible: senderTvl >= tvlThreshold ? 1 : 0,

            // snapshotedAt: snapshotedAt,
            snapairdropDay: snapairdropDay,
          };

          // console.log(snapshot);

          const savedSnapairdrop =
            await this._snapairdropService.findOneAndUpdateBySenderAt(
              snapairdrop.snapairdropDay,
              snapairdrop.sender,
              snapairdrop,
            );
          savedSnapairdrops.push(savedSnapairdrop);

          // Only snapshot sender's first eligible day
          const snapAirdropSkip = Number(process.env.SNAPAIRDROP_SKIP) || 0;
          const isSnapAirdropSkip = snapAirdropSkip > 0 ? true : false;
          if (isSnapAirdropSkip) {
            console.log(
              `[SnapAirdrop]: <${snapairdrop.sender}>@<${snapairdrop.snapairdropDay}>: <${snapairdrop.supplyValue}>, <${snapairdrop.collateralValue}>, <${snapairdrop.borrowValue}>, <${snapairdrop.tvl}>`,
            );
            break;
          }

          // endTime = new Date().getTime();
          // execTime = (endTime - startTime) / 1000;
          // // console.log(
          //   `[p2Snapshot][${snapshotDay}]:sender<${sender}>, borrowValue<${savedSnapshot.borrowValue}>, supplyValue<${savedSnapshot.supplyValue}, <${execTime}> sec. `,
          // );
        } else {
          // endTime = new Date().getTime();
          // execTime = (endTime - startTime) / 1000;
          // console.log(
          //   `[p2Snapshot][${snapshotDay}]:sender<${sender}>, No borrowValue & supplyValue, <${execTime}> sec. `,
          // );
        }

        // Move to the next day
        currentDate = nextDate;
      } // end of while
    } catch (e) {
      console.error(
        `Error caught while snapairdropSenderBetween()-From<${snapStartAt.toISOString()}><${sender}> ${e}`,
      );
    } finally {
      return savedSnapairdrops;
    }
  }

  async snapairdropObligationsBetween(
    snapStartAt = new Date(),
    snapEndAt = new Date(),
  ): Promise<void> {
    try {
      // const snapEndTSms = snapEndAt.getTime();
      const startTime = new Date().getTime();

      console.log(
        '[SnapAirdrop-Obligations]: Getting uniqueSortedSenders ....',
      );
      const uniqueSenders = await this._obligationService.findDistinctSenders();

      let senderCount = 0;
      let senderStartTime = new Date().getTime();
      let senderEndTime = new Date().getTime();
      for (const sender of uniqueSenders) {
        senderStartTime = new Date().getTime();
        senderCount += 1;

        if (!(await this.isSenderSnapairdropedAt(sender, snapEndAt))) {
          // if (!(await this.isSenderSnapairdroped(sender))) {
          const savedSnapairdrops = await this.snapairdropSenderBetween(
            sender,
            snapStartAt,
            snapEndAt,
          );

          senderEndTime = new Date().getTime();
          const senderExecTime = (senderEndTime - senderStartTime) / 1000;

          console.log(
            `[SnapAirdrop-Obligations]: (${senderCount}/${uniqueSenders.length})], ${sender} , snapshots<${savedSnapairdrops.length}> , <${senderExecTime}> sec.`,
          );
        } else {
          console.log(
            `[SnapAirdrop-Obligations]: (${senderCount}/${uniqueSenders.length})]: Skip ${sender} due to already snapshoted`,
          );
        }
      }
      const endTime = new Date().getTime();
      const batchExecTime = (endTime - startTime) / 1000;
      console.log(
        `[SnapAirdrop-Obligations]: <${uniqueSenders.length}>, <${batchExecTime}> sec.`,
      );
    } catch (e) {
      console.error(`Error caught while snapairdropObligationsBetween() ${e}`);
    }
  }

  async snapairdropSuppliesBetween(
    snapStartAt = new Date(),
    snapEndAt = new Date(),
  ): Promise<void> {
    try {
      // const snapEndTSms = snapEndAt.getTime();
      const startTime = new Date().getTime();

      // get all senders page by page
      const pageSize = Number(process.env.SNAPSHOT_PAGE_SIZE) || 1000;
      const pageStart = Number(process.env.SNAPSHOT_PAGE_START) || 1;
      const pageEnd = Number(process.env.SNAPSHOT_PAGE_END) || 9999;

      let pageIdx = pageStart;
      let totalSupplyCount = 0;
      let pageStartTime;
      let pageEndTime;
      while (true) {
        pageStartTime = new Date().getTime();

        const pageSupplies = await this._supplyService.findSortedPage(
          pageSize,
          pageIdx,
        );
        totalSupplyCount += pageSupplies.length;

        // if there are no more supplies, break
        if (pageSupplies.length === 0) {
          break;
        }

        let senderCount = 0;
        let senderStartTime = new Date().getTime();
        let senderEndTime = new Date().getTime();
        for (const supply of pageSupplies) {
          senderCount += 1;

          if (!(await this.isSenderSnapairdropedAt(supply.sender, snapEndAt))) {
            // if (!(await this.isSenderSnapairdroped(supply.sender))) {
            senderStartTime = new Date().getTime();
            const savedSnapshots = await this.snapairdropSenderBetween(
              supply.sender,
              snapStartAt,
              snapEndAt,
            );

            senderEndTime = new Date().getTime();
            const senderExecTime = (senderEndTime - senderStartTime) / 1000;
            console.log(
              `[SnapAirdrop-Supplies]: Page[${pageIdx}](${senderCount}/${pageSupplies.length})]: ${supply.sender} , snapshots<${savedSnapshots.length}> , <${senderExecTime}> sec.`,
            );
          } else {
            console.log(
              `[SnapAirdrop-Supplies]: Page[${pageIdx}](${senderCount}/${pageSupplies.length})]: Skip ${supply.sender} due to already snapshoted`,
            );
          }
        }
        pageEndTime = new Date().getTime();
        const pageExecTime = (pageEndTime - pageStartTime) / 1000;
        console.log(
          `[SnapAirdrop-Supplies]: Page[${pageIdx}](${senderCount}/${pageSupplies.length})]: , <${pageExecTime}> sec. `,
        );

        pageIdx += 1;
        if (pageIdx > pageEnd) {
          break;
        }
      } //end of while

      const endTime = new Date().getTime();
      const execTime = (endTime - startTime) / 1000;
      console.log(
        `[SnapAirdrop-Supplies]: Total<${totalSupplyCount}>  , <${execTime}> sec.`,
      );
    } catch (e) {
      console.error(`Error caught while snapairdropSuppliesBetween() ${e}`);
    }
  }
}
