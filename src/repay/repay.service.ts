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
}
