import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Mint, MintDocument } from './mint.schema';
import { SuiService } from 'src/sui/sui.service';
import { EventState } from 'src/eventstate/eventstate.schema';
import * as mongoose from 'mongoose';

@Injectable()
export class MintService {
  constructor(
    @InjectModel(Mint.name)
    private mintModel: Model<MintDocument>,
  ) {}

  async create(
    mint: Mint,
    session: mongoose.ClientSession | null = null,
  ): Promise<Mint> {
    const createdMint = new this.mintModel(mint);
    return createdMint.save({ session });
  }

  async findAll(): Promise<Mint[]> {
    return this.mintModel.find().exec();
  }

  // findBySender
  async findBySender(sender: string): Promise<Mint[]> {
    return this.mintModel.find({ sender: sender }).exec();
  }

  async findBySenderAt(
    sender: string,
    snapTimestamp = new Date().getTime(),
  ): Promise<Mint[]> {
    return this.mintModel
      .find({ sender: sender, timestampMs: { $lt: snapTimestamp } })
      .sort({ timestampMs: 1 })
      .exec();
  }

  async findBySenderBefore(
    sender: string,
    snapTimestamp = new Date().getTime(),
  ): Promise<Mint[]> {
    return this.mintModel
      .find({ sender: sender, timestampMs: { $lt: snapTimestamp } })
      .sort({ timestampMs: 1 })
      .exec();
  }

  async getMintsFromQueryEvent(
    suiService: SuiService,
    eventStateMap: Map<string, EventState>,
  ): Promise<any[]> {
    const eventId = await suiService.getMintEventId();
    return await suiService.getEventsFromQuery(
      eventId,
      eventStateMap,
      async (item) => {
        return {
          sender: item.sender,
          timestampMs: item.timestampMs,

          depositAsset: item.parsedJson.deposit_asset.name,
          depositAmount: item.parsedJson.deposit_amount,
          mintAsset: item.parsedJson.mint_asset.name,
          mintAmount: item.parsedJson.mint_amount,
          minter: item.parsedJson.minter,
          mintTime: item.parsedJson.time,
        };
      },
    );
  }

  async countDistinctSendersBefore(
    snapshotTimestamp = new Date().getTime(),
  ): Promise<number> {
    const aggregation = await this.mintModel
      .aggregate([
        {
          $match: {
            timestampMs: { $lt: snapshotTimestamp.toString() },
          },
        },
        {
          $group: {
            _id: '$sender',
          },
        },
        {
          $count: 'distinctSendersCount',
        },
      ])
      .exec();

    return aggregation[0]?.distinctSendersCount || 0;
  }

  async findDistinctSendersBatchBefore(
    snapTimestamp = new Date().getTime(),
    batchNumber = 1,
    batchSize = 1000,
  ): Promise<string[]> {
    const skipNumber = (batchNumber - 1) * batchSize;

    const distinctSenders = await this.mintModel
      .aggregate([
        {
          $match: {
            timestampMs: { $lt: snapTimestamp.toString() },
          },
        },
        {
          $group: {
            _id: '$sender',
          },
        },
        {
          $skip: skipNumber,
        },
        {
          $limit: batchSize,
        },
      ])
      .exec();

    return distinctSenders.map((doc) => doc._id);
  }
}
