import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Supply, SupplyDocument } from './supply.schema';
import * as mongoose from 'mongoose';

@Injectable()
export class SupplyService {
  constructor(
    @InjectModel(Supply.name)
    private supplyModel: Model<SupplyDocument>,
  ) {}

  async create(
    supply: Supply,
    session: mongoose.ClientSession | null = null,
  ): Promise<Supply> {
    const createdSupply = new this.supplyModel(supply);
    return createdSupply.save({ session });
  }

  async findAll(): Promise<Supply[]> {
    return this.supplyModel.find().exec();
  }

  // async findSuppliesWithBalance(): Promise<Supply[]> {
  //   return (
  //     this.supplyModel
  //       .find({
  //         'assets.0': { $exists: true },
  //       })
  //       // .limit(100)
  //       .exec()
  //   );
  // }

  // findBySender
  async findBySender(sender: string): Promise<Supply[]> {
    return this.supplyModel.find({ sender: sender }).exec();
  }

  async findOneBySenderAndUpdateSupply(
    sender: string,
    supply: Supply,
    session: mongoose.ClientSession | null = null,
  ): Promise<Supply> {
    return this.supplyModel
      .findOneAndUpdate({ sender: sender }, supply, {
        upsert: true,
        new: true,
      })
      .session(session)
      .exec();
  }

  async findDistinctCoins(): Promise<any> {
    return await this.supplyModel
      .aggregate([
        {
          $unwind: `$assets`,
        },
        {
          $group: {
            _id: `$assets.coin`,
            coinCount: { $sum: 1 },
          },
        },
        {
          $project: {
            coinType: '$_id',
            coinCount: 1,
            _id: 0,
          },
        },
      ])
      .exec();
  }
  async getTopSupplyValueSendersByCoinType(
    coinType: string,
    coinPrice: number,
    multiple: number,
    limit = 1000,
  ): Promise<any> {
    const multipleValue = coinPrice * multiple;
    return await this.supplyModel
      .aggregate([
        {
          $unwind: `$assets`,
        },
        {
          $match: {
            [`assets.coin`]: coinType,
          },
        },
        {
          $group: {
            _id: '$sender',
            senderCoinType: { $first: '$assets.coin' },
            senderCoinAmount: { $sum: { $toDouble: '$assets.balance' } },
            senderCoinValue: {
              $sum: {
                $multiply: [{ $toDouble: '$assets.balance' }, multipleValue],
              },
            },
            senderObligationCount: { $sum: 1 },
          },
        },
        {
          $sort: { senderCoinValue: -1 },
        },
        {
          $limit: limit,
        },
        {
          $project: {
            sender: '$_id',
            senderCoinType: 1,
            senderCoinAmount: 1,
            senderCoinValue: 1,
            senderObligationCount: 1,
            _id: 0,
          },
        },
      ])
      .exec();
  }

  async getTotalSupplyValueByCoinType(
    coinType: string,
    coinPrice: number,
    multiple: number,
  ): Promise<any> {
    const multipleValue = coinPrice * multiple;
    return await this.supplyModel
      .aggregate([
        {
          $unwind: '$assets',
        },
        {
          $match: {
            ['assets.coin']: coinType,
          },
        },
        {
          $group: {
            _id: '$assets.coin',
            totalAsset: { $first: '$assets.coin' },
            totalAmount: { $sum: { $toDouble: '$assets.balance' } },
            totalValue: {
              $sum: {
                $multiply: [{ $toDouble: '$assets.balance' }, multipleValue],
              },
            },
            totalCount: { $sum: 1 },
          },
        },
        {
          $project: {
            totalAsset: '$_id',
            totalAmount: 1,
            totalValue: 1,
            totalCount: 1,
            _id: 0,
          },
        },
      ])
      .exec();
  }
}
