import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { Statistic, StatisticDocument } from './statistic.schema';

@Injectable()
export class StatisticService {
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

  async updateLatestLeaderboard(): Promise<any> {
    const LEADERBOARD_API_URL = this.API_URL + 'leaderboards';
    let latestLeaderboard;
    try {
      const currentTime = new Date().getTime();
      const passTime = (currentTime - StatisticService._logTime) / 1000;

      if (passTime > this.LEADERBOARD_INTERVAL_SECONDS) {
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
        console.log(
          '[Leaderboard]: saveLatestLeaderboard() success:',
          latestLeaderboard.updatedAt,
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
    } catch (error) {
      console.error('Error caught while fetchZealyLeaderboard() ', error);
    }

    return zealyLeaderboard;
  }

  async fetchTvlLeaderboard(): Promise<any[]> {
    const tvlLeadboard = [];
    // TODO: fetch tvl leaderboard
    try {
    } catch (error) {
      console.error('Error caught while fetchTvlLeaderboard() ', error);
    }

    return tvlLeadboard;
  }

  async fetchBorrowLeaderboard(): Promise<any[]> {
    const borrowLeadboard = [];
    // TODO: fetch borrow leaderboard
    try {
    } catch (error) {
      console.error('Error caught while fetchBorrowLeaderboard() ', error);
    }

    return borrowLeadboard;
  }

  // async genFakeStatistics() {
  //   try {
  //     const currentTime = new Date().getTime();
  //     const passTime = (currentTime - StatisticService._logTime) / 1000;
  //     const interval = Number(process.env.STATISTIC_INTERVAL_SECONDS) || 60;

  //     const randomInt = (min: number, max: number) =>
  //       Math.floor(Math.random() * (max - min + 1)) + min;
  //     const sign = randomInt(0, 1) ? 1 : -1;
  //     const diff = sign * randomInt(0, 50); // 0 ~ 50
  //     const suiPrice = 0.66;
  //     const suiDeposit = Math.abs(100 + diff);
  //     const suiWeight = 0.6;

  //     const usdcPrice = 0.99;
  //     const usdcDeposit = Math.abs(10 + diff);
  //     const usdcWeight = 0.8;

  //     const suiSupply = Math.abs(200 + diff);
  //     const suiBorrow = Math.abs(10 + diff);
  //     const suiLiquity = suiSupply - suiBorrow;
  //     const suiBorrowWeight = 1.0;

  //     const usdcSupply = Math.abs(20 + diff);
  //     const usdcBorrow = Math.abs(2 + diff);
  //     const usdcLiquity = usdcSupply - usdcBorrow;
  //     const usdcBorrowWeight = 1.0;

  //     const totalSupply = suiSupply * suiPrice + usdcPrice * usdcDeposit;
  //     const totalBorrow = suiBorrow * suiPrice + usdcPrice * usdcBorrow;

  //     if (passTime > interval) {
  //       const fakeStatistic = {
  //         dataType: 'total',
  //         totalSupply: totalSupply,
  //         totalBorrow: totalBorrow,
  //         totalTVL: totalSupply - totalBorrow,
  //         timestamp: new Date(),
  //         // createdAt: new Date(),
  //         // updatedAt: new Date(),``

  //         collaterals: [
  //           {
  //             coin: 'SUI',
  //             price: suiPrice,
  //             deposit: suiDeposit,
  //             weight: suiWeight,
  //           },
  //           {
  //             coin: 'USDC',
  //             price: usdcPrice,
  //             deposit: usdcDeposit,
  //             weight: usdcWeight,
  //           },
  //         ],
  //         assets: [
  //           {
  //             coin: 'SUI',
  //             price: suiPrice,
  //             supply: suiSupply,
  //             borrow: suiBorrow,
  //             liquity: suiLiquity,
  //             borrowWeight: suiBorrowWeight,
  //           },
  //           {
  //             coin: 'USDC',
  //             price: usdcPrice,
  //             supply: usdcSupply,
  //             borrow: usdcBorrow,
  //             liquity: usdcLiquity,
  //             borrowWeight: usdcBorrowWeight,
  //           },
  //         ],
  //       };
  //       this.create(fakeStatistic);
  //       console.log(
  //         `<${new Date()}>[SaveStatistic]: diff<${diff}> fake<${fakeStatistic}>`,
  //       );
  //       StatisticService.resetLogTime();
  //     }
  //   } catch (error) {
  //     console.log('[Statistic]: save error', error);
  //   }
  // }
}
