import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as mongoose from 'mongoose';
import { Snapshot, SnapshotDocument } from './snapshot.schema';

@Injectable()
export class SnapshotService {
  constructor(
    @InjectModel(Snapshot.name)
    private snapshotModel: Model<SnapshotDocument>,
  ) {}

  async create(
    snapshot: Snapshot,
    session: mongoose.ClientSession | null = null,
  ): Promise<Snapshot> {
    const createdSnapshot = new this.snapshotModel(snapshot);
    return createdSnapshot.save({ session });
  }

  async findAll(): Promise<Snapshot[]> {
    return this.snapshotModel.find().exec();
  }

  // findBySender
  async findBySender(sender: string): Promise<Snapshot[]> {
    return this.snapshotModel.find({ sender: sender }).exec();
  }

  async findBySenderAt(
    sender: string,
    snapshotDay = new Date(),
  ): Promise<Snapshot[]> {
    return this.snapshotModel
      .find({
        sender: sender,
        snapshotDay: snapshotDay.toISOString().split('T')[0],
      })
      .exec();
  }

  async findBySnapshotDay(snapshotDay = new Date()): Promise<Snapshot[]> {
    const snapshots = await this.snapshotModel
      .find({
        snapshotDay: snapshotDay.toISOString().split('T')[0],
      })
      .exec();
    return snapshots.length > 0 ? snapshots : [];
  }

  async findDistinctSenders(): Promise<string[]> {
    const distinctSenders = await this.snapshotModel.distinct('sender').exec();

    return distinctSenders;
  }

  async findOneBySenderAndUpdate(
    sender: string,
    snapshot: Snapshot,
    session: mongoose.ClientSession | null = null,
  ): Promise<Snapshot> {
    return this.snapshotModel
      .findOneAndUpdate({ sender: sender }, snapshot, {
        upsert: true,
        new: true,
      })
      .session(session)
      .exec();
  }

  async findOneAndUpdateBySenderAt(
    snapshotDay: string,
    sender: string,
    snapshot: Snapshot,
    session: mongoose.ClientSession | null = null,
  ): Promise<Snapshot> {
    return this.snapshotModel
      .findOneAndUpdate(
        { sender: sender, snapshotDay: snapshotDay },
        snapshot,
        {
          upsert: true,
          new: true,
        },
      )
      .session(session)
      .exec();
  }
}
