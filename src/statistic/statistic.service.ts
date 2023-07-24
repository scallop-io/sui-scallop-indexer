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
  private LEADERBOARD_INTERVAL_SECONDS =
    Number(process.env.LEADERBOARD_INTERVAL_SECONDS) || 60; // default 60 seconds

  private LEADERBOARD_LIMIT = 100;

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

  async getCoinPriceFromBinance(symbol = 'USDC'): Promise<number> {
    let coinPrice = 0;
    try {
      const response = await axios.get(
        `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`,
      );
      if (response.data.price) {
        coinPrice = Number(response.data.price);
      }
    } catch (error) {
      console.error('Error caught while getCoinPriceFromBinance() ', error);
    }

    return coinPrice;
  }

  async getCoinPriceMap(): Promise<Map<string, number>> {
    //TODO: fetch coin price from oracle
    const coinPriceMap = new Map<string, number>();

    const coins = this._suiService.getCoinTypes();
    for (const coin of coins) {
      if (coin === 'USDT') {
        coinPriceMap.set(coin, 1.0);
      } else {
        const coinPrice = await this.getCoinPriceFromBinance(coin);
        coinPriceMap.set(coin, coinPrice);
      }
    }

    return coinPriceMap;
  }

  async updateLatestLeaderboard(): Promise<any> {
    let latestLeaderboard;
    try {
      const currentTime = new Date().getTime();
      const passTime = (currentTime - StatisticService._logTime) / 1000;

      if (passTime > this.LEADERBOARD_INTERVAL_SECONDS) {
        const LEADERBOARD_API_URL = this.API_URL + 'leaderboards';
        const startTime = new Date().getTime();
        latestLeaderboard = {
          zealy: await this.fetchZealyLeaderboard(),
          tvl: await this.fetchTvlLeaderboard(),
          borrow: await this.fetchBorrowLeaderboard(),
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
          `[Leaderboard]: saveLatestLeaderboard(), <${execTime}> sec.`,
        );

        StatisticService.resetLogTime();
      }
    } catch (e) {
      console.error('Error caught while saveLatestLeaderboard() ', e);
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

  private async calculateMarketValue(
    coinName: string,
    coinAmount: string,
    coinPriceMap: Map<string, number>,
  ): Promise<number> {
    const coinSymbol =
      coinName.split('::')[2] === 'COIN' ? 'USDC' : coinName.split('::')[2];
    let decimalMultiplier = 0;
    switch (coinSymbol) {
      case 'USDC': {
        decimalMultiplier = 0.000001;
        break;
      }
      case 'USDT': {
        decimalMultiplier = 0.000001;
        break;
      }
      default: {
        decimalMultiplier = 0.000000001;
        break;
      }
    }

    return (
      coinPriceMap.get(coinSymbol) * Number(coinAmount) * decimalMultiplier
    );
  }

  async fetchTvlLeaderboard(limit = this.LEADERBOARD_LIMIT): Promise<any[]> {
    const tvlLeadboard = [];

    try {
      const startTime = new Date().getTime();
      const coinPriceMap = await this.getCoinPriceMap();

      const obligationList = await this._obligationService.findAll();
      const senderCollateralMap = new Map<string, number>();
      const senderBorrowMap = new Map<string, number>();
      for (const obligation of obligationList) {
        // calculate collateral value of senders
        let obligationCollateralValue = 0;
        for (const collateral of obligation.collaterals) {
          const collateralValue = await this.calculateMarketValue(
            collateral.asset,
            collateral.amount,
            coinPriceMap,
          );
          obligationCollateralValue += collateralValue;
        }
        let senderCollateralValue = obligationCollateralValue;
        if (senderCollateralMap.has(obligation.sender)) {
          senderCollateralValue += senderCollateralMap.get(obligation.sender);
        }
        senderCollateralMap.set(obligation.sender, senderCollateralValue);

        // calculate borrow value of senders
        let obligationBorrowValue = 0;
        for (const debt of obligation.debts) {
          const borrowValue = await this.calculateMarketValue(
            debt.asset,
            debt.amount,
            coinPriceMap,
          );
          obligationBorrowValue += borrowValue;
        }

        let senderBorrowValue = obligationBorrowValue;
        if (senderBorrowMap.has(obligation.sender)) {
          senderBorrowValue += senderBorrowMap.get(obligation.sender);
        }
        senderBorrowMap.set(obligation.sender, senderBorrowValue);
      }

      // calculate supply value of senders
      const supplyList = await this._supplyService.findSuppliesWithBalance();
      const senderSupplyMap = new Map<string, number>();
      for (const supply of supplyList) {
        let supplyValue = 0;
        for (const asset of supply.assets) {
          const assetValue = await this.calculateMarketValue(
            asset.coin,
            asset.balance,
            coinPriceMap,
          );
          supplyValue += assetValue;
        }

        let senderSupplyValue = supplyValue;
        if (senderSupplyMap.has(supply.sender)) {
          senderSupplyValue += senderSupplyMap.get(supply.sender);
        }
        senderSupplyMap.set(supply.sender, senderSupplyValue);
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
      let totalTvlValue = 0;
      for (const [sender, senderTvlValue] of topTvlerMap) {
        rank += 1;
        totalTvlValue += senderTvlValue;
        const boardItem = {
          rank: rank,
          address: sender,
          name: sender,
          amount: senderTvlValue,
        };

        if (rank <= limit) {
          // TODO: optimize this SuiName bottleneck
          // boardItem.name = await this._suiService.getSuiName(sender);
          tvlLeadboard.push(boardItem);
        } else {
          break;
        }
      }

      const endTime = new Date().getTime();
      const execTime = (endTime - startTime) / 1000;
      console.log(
        `[Leaderboard-TVL]: Total TVL <$${Math.round(
          totalTvlValue,
        )}> USD, <${execTime}> sec.`,
      );
    } catch (error) {
      console.error('Error caught while fetchTvlLeaderboard() ', error);
    }

    return tvlLeadboard;
  }

  async fetchBorrowLeaderboard(limit = this.LEADERBOARD_LIMIT): Promise<any[]> {
    const borrowLeadboard = [];

    try {
      const startTime = new Date().getTime();
      const coinPriceMap = await this.getCoinPriceMap();

      const obligationList = await this._obligationService.findAll();
      // calculate borrow value of sender
      const senderBorrowMap = new Map<string, number>();
      for (const obligation of obligationList) {
        let obligationBorrowValue = 0;
        for (const debt of obligation.debts) {
          const borrowValue = await this.calculateMarketValue(
            debt.asset,
            debt.amount,
            coinPriceMap,
          );

          obligationBorrowValue += borrowValue;
        }
        let senderBorrowValue = obligationBorrowValue;
        // console.log(`${obligation.sender}, Total: $${totalBorrowValue} USD`);
        if (senderBorrowMap.has(obligation.sender)) {
          senderBorrowValue += senderBorrowMap.get(obligation.sender);
        }
        senderBorrowMap.set(obligation.sender, senderBorrowValue);
      }

      // sort by value
      const topBorrowerMap = new Map(
        [...senderBorrowMap.entries()].sort((a, b) => b[1] - a[1]),
      );

      let rank = 0;
      let totalBorrowValue = 0;
      for (const [sender, senderBorrowValue] of topBorrowerMap) {
        rank += 1;
        totalBorrowValue += senderBorrowValue;
        const suiNS = sender;
        const boardItem = {
          rank: rank,
          address: sender,
          name: suiNS,
          amount: senderBorrowValue,
        };

        if (rank <= limit) {
          // TODO: optimize this SuiName bottleneck
          // boardItem.name = await this._suiService.getSuiName(sender);
          borrowLeadboard.push(boardItem);
        } else {
          break;
        }
      }

      const endTime = new Date().getTime();
      const execTime = (endTime - startTime) / 1000;
      console.log(
        `[Leaderboard-Borrows]: Total Borrow <$${Math.round(
          totalBorrowValue,
        )}> USD, <${execTime}> sec.`,
      );
    } catch (error) {
      console.error('Error caught while fetchBorrowLeaderboard() ', error);
    }

    return borrowLeadboard;
  }

  async fetchCollateralLeaderboard(
    limit = this.LEADERBOARD_LIMIT,
  ): Promise<any[]> {
    const collateralLeadboard = [];

    try {
      const startTime = new Date().getTime();
      const coinPriceMap = await this.getCoinPriceMap();

      const obligationList = await this._obligationService.findAll();
      // calculate collateral value of sender
      const senderCollateralMap = new Map<string, number>();
      for (const obligation of obligationList) {
        let obligationCollateralValue = 0;
        for (const collateral of obligation.collaterals) {
          const collateralValue = await this.calculateMarketValue(
            collateral.asset,
            collateral.amount,
            coinPriceMap,
          );

          obligationCollateralValue += collateralValue;
        }
        let senderCollateralValue = obligationCollateralValue;
        if (senderCollateralMap.has(obligation.sender)) {
          senderCollateralValue += senderCollateralMap.get(obligation.sender);
        }
        senderCollateralMap.set(obligation.sender, senderCollateralValue);
      }

      // sort by value
      const topCollateralerMap = new Map(
        [...senderCollateralMap.entries()].sort((a, b) => b[1] - a[1]),
      );

      let rank = 0;
      let totalCollateralValue = 0;
      for (const [sender, senderCollateralValue] of topCollateralerMap) {
        rank += 1;
        totalCollateralValue += senderCollateralValue;
        // const suiNS = await this._suiService.getSuiName(sender);
        const suiNS = sender;
        const boardItem = {
          rank: rank,
          address: sender,
          name: suiNS,
          amount: senderCollateralValue,
        };

        if (rank <= limit) {
          // TODO: optimize this SuiName bottleneck
          // boardItem.name = await this._suiService.getSuiName(sender);
          collateralLeadboard.push(boardItem);
        } else {
          break;
        }
      }
      const endTime = new Date().getTime();
      const execTime = (endTime - startTime) / 1000;
      console.log(
        `[Leaderboard-Collaterals]: Total Collaterals <$${Math.round(
          totalCollateralValue,
        )}> USD, <${execTime}> sec.`,
      );
    } catch (error) {
      console.error('Error caught while fetchCollateralLeaderboard() ', error);
    }

    return collateralLeadboard;
  }

  async fetchSupplyLeaderboard(limit = this.LEADERBOARD_LIMIT): Promise<any[]> {
    const supplyLeadboard = [];

    try {
      const startTime = new Date().getTime();
      // get coin price
      const coinPriceMap = await this.getCoinPriceMap();

      // calculate supply value of sender
      const supplyList = await this._supplyService.findSuppliesWithBalance();
      const senderSupplyMap = new Map<string, number>();
      for (const supply of supplyList) {
        let supplyValue = 0;
        for (const asset of supply.assets) {
          const assetValue = await this.calculateMarketValue(
            asset.coin,
            asset.balance,
            coinPriceMap,
          );

          supplyValue += assetValue;
        }
        let senderSupplyValue = supplyValue;
        // console.log(`${supply.sender}, Total: $${supplyValue} USD`);
        if (senderSupplyMap.has(supply.sender)) {
          senderSupplyValue += senderSupplyMap.get(supply.sender);
        }
        senderSupplyMap.set(supply.sender, senderSupplyValue);
      }
      // sort by value
      const topSupplyerMap = new Map(
        [...senderSupplyMap.entries()].sort((a, b) => b[1] - a[1]),
      );

      let rank = 0;
      let totalSupplyValue = 0;
      for (const [sender, senderSupplyValue] of topSupplyerMap) {
        rank += 1;
        totalSupplyValue += senderSupplyValue;
        // const suiNS = await this._suiService.getSuiName(sender);
        const suiNS = sender;
        const boardItem = {
          rank: rank,
          address: sender,
          name: suiNS,
          amount: senderSupplyValue,
        };

        if (rank <= limit) {
          // TODO: optimize this SuiName bottleneck
          // boardItem.name = await this._suiService.getSuiName(sender);
          supplyLeadboard.push(boardItem);
        } else {
          break;
        }
      }
      const endTime = new Date().getTime();
      const execTime = (endTime - startTime) / 1000;
      console.log(
        `[Leaderboard-Supply]: Total Supply <$${Math.round(
          totalSupplyValue,
        )}> USD, <${execTime}> sec.`,
      );
    } catch (error) {
      console.error('Error caught while fetchSupplyLeaderboard() ', error);
    }

    return supplyLeadboard;
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
          // const coinName = mint.mintAsset.split('::')[2];
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
          // const coinName = redeem.withdrawAsset.split('::')[2];
          const coinName = redeem.withdrawAsset;
          const coinAmount = Number(redeem.withdrawAmount);
          let balance = 0;
          if (balanceMap.has(coinName)) {
            balance = balanceMap.get(coinName);
          }
          balanceMap.set(coinName, balance - coinAmount);
        }

        // Save supply balance
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
        // console.log(supplyObj);
        supplies.push(supplyObj);
      }
    } catch (error) {
      console.error('Error caught while updateSupplyBalance() ', error);
    }

    return supplies;
  }
}
