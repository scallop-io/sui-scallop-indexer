import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Repay, RepayDocument } from './repay.schema';
import { SuiService } from 'src/sui/sui.service';
import { EventState } from 'src/eventstate/eventstate.schema';
import * as mongoose from 'mongoose';

@Injectable()
export class RepayService {
  constructor(
    @InjectModel(Repay.name)
    private repayModel: Model<RepayDocument>,
  ) {}

  async create(
    repay: Repay,
    session: mongoose.ClientSession | null = null,
  ): Promise<RepayDocument> {
    const createdRepay = new this.repayModel(repay);
    return createdRepay.save({ session });
  }

  async getRepaysFromQueryEvent(
    suiService: SuiService,
    eventStateMap: Map<string, EventState>,
  ): Promise<any[]> {
    const eventId = await suiService.getRepayEventId();
    return await suiService.getEventsFromQuery(
      // process.env.EVENT_REPAY,
      eventId,
      eventStateMap,
      async (item) => {
        return {
          obligation_id: item.parsedJson.obligation,
          asset: item.parsedJson.asset.name,
          amount: item.parsedJson.amount,
          timestampMs: item.timestampMs,
        };
      },
    );
  }

  async findByObligationIdAt(
    obligationId: string,
    snapTimestamp = new Date().getTime(),
  ): Promise<Repay[]> {
    return this.repayModel
      .find({
        obligation_id: obligationId,
        timestampMs: { $lt: snapTimestamp },
      })
      .sort({ timestampMs: 1 })
      .exec();
  }

  async findByObligationIdBefore(
    obligationId: string,
    snapTimestamp = new Date().getTime(),
  ): Promise<Repay[]> {
    return this.repayModel
      .find({
        obligation_id: obligationId,
        timestampMs: { $lt: snapTimestamp },
      })
      .sort({ timestampMs: 1 })
      .exec();
  }
}
