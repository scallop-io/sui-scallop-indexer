import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as mongoose from 'mongoose';
import { Snapbatch, SnapbatchDocument } from './snapbatch.schema';

@Injectable()
export class SnapbatchService {
  constructor(
    @InjectModel(Snapbatch.name)
    private snapbatchModel: Model<SnapbatchDocument>,
  ) {}

  async create(
    snapbatch: Snapbatch,
    session: mongoose.ClientSession | null = null,
  ): Promise<Snapbatch> {
    const createdSnapbatch = new this.snapbatchModel(snapbatch);
    return createdSnapbatch.save({ session });
  }

  async findAll(): Promise<Snapbatch[]> {
    return this.snapbatchModel.find().exec();
  }

  // findByBatchSender
  async findByBatchSender(batch: number, sender: string): Promise<Snapbatch[]> {
    return this.snapbatchModel.find({ batch: batch, sender: sender }).exec();
  }

  async findOneBySenderAndUpdate(
    batch: number,
    sender: string,
    snapbatch: Snapbatch,
    session: mongoose.ClientSession | null = null,
  ): Promise<Snapbatch> {
    return this.snapbatchModel
      .findOneAndUpdate({ batch: batch, sender: sender }, snapbatch, {
        upsert: true,
        new: true,
      })
      .session(session)
      .exec();
  }
}
