import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Flashloan, FlashloanDocument } from './flashloan.schema';
import { SuiService } from 'src/sui/sui.service';
import { EventState } from 'src/eventstate/eventstate.schema';
import * as mongoose from 'mongoose';

@Injectable()
export class FlashloanService {
  constructor(
    @InjectModel(Flashloan.name)
    private flashloanModel: Model<FlashloanDocument>,
  ) {}

  async create(
    flashloan: Flashloan,
    session: mongoose.ClientSession | null = null,
  ): Promise<FlashloanDocument> {
    const createdFlashloan = new this.flashloanModel(flashloan);
    return createdFlashloan.save({ session });
  }

  async getBorrowFlashloansFromQueryEvent(
    suiService: SuiService,
    eventStateMap: Map<string, EventState>,
  ): Promise<any[]> {
    const eventId = await suiService.getFlashloanBorrowEventId();
    return await suiService.getEventsFromQuery(
      eventId,
      eventStateMap,
      async (item) => {
        return {
          type: 'borrow',
          borrower: item.parsedJson.borrower,
          asset: item.parsedJson.asset.name,
          amount: item.parsedJson.amount,
          timestampMs: item.timestampMs,
        };
      },
    );
  }

  async getRepayFlashloansFromQueryEvent(
    suiService: SuiService,
    eventStateMap: Map<string, EventState>,
  ): Promise<any[]> {
    const eventId = await suiService.getFlashloanRepayEventId();
    return await suiService.getEventsFromQuery(
      eventId,
      eventStateMap,
      async (item) => {
        return {
          type: 'repay',
          borrower: item.parsedJson.borrower,
          asset: item.parsedJson.asset.name,
          amount: item.parsedJson.amount,
          timestampMs: item.timestampMs,
        };
      },
    );
  }
}
