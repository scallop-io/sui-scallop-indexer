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

  async findSuppliesWithBalance(): Promise<Supply[]> {
    return (
      this.supplyModel
        .find({
          'assets.0': { $exists: true },
        })
        // .limit(100)
        .exec()
    );
  }

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
}
