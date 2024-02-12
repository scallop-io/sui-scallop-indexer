import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as mongoose from 'mongoose';
import { Snapairdrop, SnapairdropDocument } from './snapairdrop.schema';

@Injectable()
export class SnapairdropService {
  constructor(
    @InjectModel(Snapairdrop.name)
    private snapairdropModel: Model<SnapairdropDocument>,
  ) {}

  async create(
    snapairdrop: Snapairdrop,
    session: mongoose.ClientSession | null = null,
  ): Promise<Snapairdrop> {
    const createdSnapairdrop = new this.snapairdropModel(snapairdrop);
    return createdSnapairdrop.save({ session });
  }

  async findAll(): Promise<Snapairdrop[]> {
    return this.snapairdropModel.find().exec();
  }

  // findBySender
  async findBySender(sender: string): Promise<Snapairdrop[]> {
    return this.snapairdropModel.find({ sender: sender }).exec();
  }

  async findBySenderAt(
    sender: string,
    snapairdropDay = new Date(),
  ): Promise<Snapairdrop[]> {
    return this.snapairdropModel
      .find({
        sender: sender,
        snapairdropDay: snapairdropDay.toISOString().split('T')[0],
      })
      .exec();
  }

  async findBySnapairdropDay(
    snapairdropDay = new Date(),
  ): Promise<Snapairdrop[]> {
    const snapairdrops = await this.snapairdropModel
      .find({
        snapairdropDay: snapairdropDay.toISOString().split('T')[0],
      })
      .exec();
    return snapairdrops.length > 0 ? snapairdrops : [];
  }

  async findDistinctSenders(): Promise<string[]> {
    const distinctSenders = await this.snapairdropModel
      .distinct('sender')
      .exec();

    return distinctSenders;
  }

  async findOneBySenderAndUpdate(
    sender: string,
    snapairdrop: Snapairdrop,
    session: mongoose.ClientSession | null = null,
  ): Promise<Snapairdrop> {
    return this.snapairdropModel
      .findOneAndUpdate({ sender: sender }, snapairdrop, {
        upsert: true,
        new: true,
      })
      .session(session)
      .exec();
  }

  async findOneAndUpdateBySenderAt(
    snapairdropDay: string,
    sender: string,
    snapairdrop: Snapairdrop,
    session: mongoose.ClientSession | null = null,
  ): Promise<Snapairdrop> {
    return this.snapairdropModel
      .findOneAndUpdate(
        { sender: sender, snapairdropDay: snapairdropDay },
        snapairdrop,
        {
          upsert: true,
          new: true,
        },
      )
      .session(session)
      .exec();
  }
}
