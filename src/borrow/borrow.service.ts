import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Borrow, BorrowDocument } from './borrow.schema';
import { SuiService } from 'src/sui/sui.service';
import { EventState } from 'src/eventstate/eventstate.schema';
import * as mongoose from 'mongoose';
import { BorrowTypeV3 } from 'src/types/common';

@Injectable()
export class BorrowService {
  constructor(
    @InjectModel(Borrow.name)
    private borrowModel: Model<BorrowDocument>,
  ) {}

  async create(
    borrow: Borrow,
    session: mongoose.ClientSession | null = null,
  ): Promise<BorrowDocument> {
    const createdBorrow = new this.borrowModel(borrow);
    return createdBorrow.save({ session });
  }

  async getBorrowsFromQueryEvent(
    suiService: SuiService,
    eventStateMap: Map<string, EventState>,
  ): Promise<any[]> {
    const eventId = await suiService.getBorrowEventId();
    return await suiService.getEventsFromQuery(
      // process.env.EVENT_BORROW,
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

  async getBorrowsV2FromQueryEvent(
    suiService: SuiService,
    eventStateMap: Map<string, EventState>,
  ): Promise<any[]> {
    const eventId = await suiService.getBorrowEventV2Id();
    return await suiService.getEventsFromQuery(
      eventId,
      eventStateMap,
      async (item) => {
        return {
          obligation_id: item.parsedJson.obligation,
          asset: item.parsedJson.asset.name,
          amount: item.parsedJson.amount,
          borrowFee: item.parsedJson.borrow_fee,
          timestampMs: item.timestampMs,
        };
      },
    );
  }

  async getBorrowsV3FromQueryEvent(
    suiService: SuiService,
    eventStateMap: Map<string, EventState>,
  ): Promise<any[]> {
    const eventId = suiService.getBorrowEventV3Id();
    return await suiService.getEventsFromQuery(
      eventId,
      eventStateMap,
      async (item) => {
        return {
          obligation_id: item.parsedJson.obligation,
          asset: item.parsedJson.asset.name,
          amount: item.parsedJson.amount,
          borrowFee: item.parsedJson.borrow_fee,
          timestampMs: item.timestampMs,
          borrowFeeDiscount: item.parsedJson.borrow_fee_discount,
          borrowReferrallFee: item.parsedJson.borrow_referral_fee,
          time: item.parsedJson.time,
        } as BorrowTypeV3;
      },
    );
  }
}
