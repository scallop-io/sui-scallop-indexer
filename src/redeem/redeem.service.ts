import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Redeem, RedeemDocument } from './redeem.schema';
import { SuiService } from 'src/sui/sui.service';
import { EventState } from 'src/eventstate/eventstate.schema';
import * as mongoose from 'mongoose';

@Injectable()
export class RedeemService {
  constructor(
    @InjectModel(Redeem.name)
    private redeemModel: Model<RedeemDocument>,
  ) {}

  async create(
    redeem: Redeem,
    session: mongoose.ClientSession | null = null,
  ): Promise<Redeem> {
    const createdRedeem = new this.redeemModel(redeem);
    return createdRedeem.save({ session });
  }

  async findAll(): Promise<Redeem[]> {
    return this.redeemModel.find().exec();
  }

  // findBySender
  async findBySender(sender: string): Promise<Redeem[]> {
    return this.redeemModel.find({ sender: sender }).exec();
  }

  async findBySenderAt(
    sender: string,
    snapTimestamp = new Date().getTime(),
  ): Promise<Redeem[]> {
    return this.redeemModel
      .find({ sender: sender, timestampMs: { $lt: snapTimestamp } })
      .sort({ timestampMs: 1 })
      .exec();
  }

  async findBySenderBefore(
    sender: string,
    snapTimestamp = new Date().getTime(),
  ): Promise<Redeem[]> {
    return this.redeemModel
      .find({ sender: sender, timestampMs: { $lt: snapTimestamp } })
      .sort({ timestampMs: 1 })
      .exec();
  }

  async getRedeemsFromQueryEvent(
    suiService: SuiService,
    eventStateMap: Map<string, EventState>,
  ): Promise<any[]> {
    const eventId = await suiService.getRedeemEventId();
    return await suiService.getEventsFromQuery(
      eventId,
      eventStateMap,
      async (item) => {
        return {
          sender: item.sender,
          timestampMs: item.timestampMs,

          withdrawAsset: item.parsedJson.withdraw_asset.name,
          withdrawAmount: item.parsedJson.withdraw_amount,
          burnAsset: item.parsedJson.burn_asset.name,
          burnAmount: item.parsedJson.burn_amount,
          redeemer: item.parsedJson.redeemer,
          redeemTime: item.parsedJson.time,
        };
      },
    );
  }
}
