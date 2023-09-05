import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import mongoose, { Model } from 'mongoose';
import { ConfigInterface } from 'src/app.config';
import { SuiService } from 'src/sui/sui.service';
import { EventState } from 'src/eventstate/eventstate.schema';
import { Obligation, ObligationDocument } from './obligation.schema';

@Injectable()
export class ObligationService {
  private readonly configSui: ConfigInterface['sui'];

  constructor(
    private configService: ConfigService<ConfigInterface>,
    @InjectModel(Obligation.name)
    private obligationModel: Model<ObligationDocument>,
  ) {
    this.configSui = this.configService.get('sui', { infer: true });
  }

  // findOneByObligationId
  async findByObligation(
    id: string,
    session: mongoose.ClientSession | null = null,
  ): Promise<ObligationDocument> {
    return this.obligationModel
      .findOne({ obligation_id: id })
      .session(session)
      .exec();
  }

  async findOneAndUpdateObligation(
    id: string,
    obligation: ObligationDocument,
    session: mongoose.ClientSession | null = null,
  ): Promise<ObligationDocument> {
    return this.obligationModel
      .findOneAndUpdate({ obligation_id: id }, obligation, {
        upsert: true,
        new: true,
      })
      .session(session)
      .exec();
  }

  // get created obligations
  async getObligationsFromQueryEvent(
    suiService: SuiService,
    eventStateMap: Map<string, EventState>,
  ): Promise<any[]> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [eventObjects, hasNextPage] =
      await this.getObligationsFromQueryEventByPages(suiService, eventStateMap);
    return eventObjects;
  }

  // get collaterals from obligation
  async getCollateralsInObligationMap(
    suiService: SuiService,
    changedObligations: Set<string>,
  ): Promise<Map<string, any>> {
    const obligationCollateralsMap = new Map<string, any>();
    let obligationId;
    try {
      for (obligationId of changedObligations) {
        const obligationDB = await this.findByObligation(obligationId);
        const parentId = obligationDB.collaterals_parent_id;
        const collaterals = await suiService.getCollaterals(parentId);
        obligationCollateralsMap.set(obligationId, collaterals);
      }
    } catch (e) {
      console.error(
        `Error caught while getCollateralsInObligationMap(): id<${obligationId}>, ${e}`,
      );
      throw e;
    }
    return obligationCollateralsMap;
  }

  async getDebtsInObligationMap(
    suiService: SuiService,
    changedObligations: Set<string>,
  ): Promise<Map<string, any>> {
    const obligationDebtsMap = new Map<string, any>();
    let obligationId;
    try {
      for (obligationId of changedObligations) {
        const obligationDB = await this.findByObligation(obligationId);
        const parentId = obligationDB.debts_parent_id;
        const debts = await suiService.getDebts(parentId);
        obligationDebtsMap.set(obligationId, debts);
      }
    } catch (e) {
      console.error(
        `Error caught while getDebtsInObligationMap(): id<${obligationId}>, ${e}`,
      );
      throw e;
    }
    return obligationDebtsMap;
  }

  // get created obligations
  async getObligationsFromQueryEventByPages(
    suiService: SuiService,
    eventStateMap: Map<string, EventState>,
    pageLimit = this.configSui.pageLimit,
  ): Promise<[any[], boolean]> {
    const eventId = await suiService.getObligationCreatedEventId();
    return await suiService.getEventsFromQueryByPages(
      eventId,
      eventStateMap,
      async (item) => {
        return {
          obligation_id: item.parsedJson.obligation,
          obligation_key: item.parsedJson.obligation_key,
          sender: item.parsedJson.sender,
          timestampMs: item.timestampMs,
          // version: version,
        };
      },
      pageLimit,
    );
  }

  async findAll(): Promise<Obligation[]> {
    return this.obligationModel.find().exec();
  }

  async findOne(id: string): Promise<Obligation> {
    return this.obligationModel.findById(id).exec();
  }

  // findOneByObligationId
  async findByObligationId(id: string): Promise<Obligation> {
    return this.obligationModel.findOne({ obligation_id: id }).exec();
  }

  async findObligationsBySender(sender: string): Promise<Obligation[]> {
    return this.obligationModel.find({ sender: sender }).exec();
  }

  async findDistinctCoins(field: string): Promise<any> {
    return await this.obligationModel
      .aggregate([
        {
          $unwind: `$${field}`,
        },
        {
          $group: {
            _id: `$${field}.asset`,
            coinCount: { $sum: 1 },
          },
        },
        {
          $project: {
            coinType: '$_id',
            coinCount: 1,
            _id: 0,
          },
        },
      ])
      .exec();
  }

  async findDistinctBorrowCoins(): Promise<any> {
    return this.findDistinctCoins('debts');
  }

  async findDistinctCollateralsCoins(): Promise<any> {
    return this.findDistinctCoins('collaterals');
  }

  async getTopValueSendersByCoinType(
    field: string,
    coinType: string,
    coinPrice: number,
    multiple: number,
    limit = 1000,
  ): Promise<any> {
    const multipleValue = coinPrice * multiple;
    return await this.obligationModel
      .aggregate([
        {
          $unwind: `$${field}`,
        },
        {
          $match: {
            [`${field}.asset`]: coinType,
          },
        },
        {
          $group: {
            _id: '$sender',
            senderCoinType: { $first: `$${field}.asset` },
            senderCoinAmount: { $sum: { $toDouble: `$${field}.amount` } },
            senderCoinValue: {
              $sum: {
                $multiply: [{ $toDouble: `$${field}.amount` }, multipleValue],
              },
            },
            senderObligationCount: { $sum: 1 },
          },
        },
        {
          $sort: { senderCoinValue: -1 },
        },
        {
          $limit: limit,
        },
        {
          $project: {
            sender: '$_id',
            senderCoinType: 1,
            senderCoinAmount: 1,
            senderCoinValue: 1,
            senderObligationCount: 1,
            _id: 0,
          },
        },
      ])
      .exec();
  }

  async getTopBorrowValueSendersByCoinType(
    coinType: string,
    coinPrice: number,
    multiple: number,
    limit = 1000,
  ): Promise<any> {
    return this.getTopValueSendersByCoinType(
      'debts',
      coinType,
      coinPrice,
      multiple,
      limit,
    );
  }

  async getTopCollateralValueSendersByCoinType(
    coinType: string,
    coinPrice: number,
    multiple: number,
    limit = 1000,
  ): Promise<any> {
    return this.getTopValueSendersByCoinType(
      'collaterals',
      coinType,
      coinPrice,
      multiple,
      limit,
    );
  }

  async getTotalCollateralValueByCoinType(
    coinType: string,
    coinPrice: number,
    multiple: number,
  ): Promise<any> {
    return this.getTotalValueByCoinType(
      'collaterals',
      coinType,
      coinPrice,
      multiple,
    );
  }

  async getTotalBorrowValueByCoinType(
    coinType: string,
    coinPrice: number,
    multiple: number,
  ): Promise<any> {
    return this.getTotalValueByCoinType('debts', coinType, coinPrice, multiple);
  }

  async getTotalValueByCoinType(
    field: string,
    coinType: string,
    coinPrice: number,
    multiple: number,
  ): Promise<any> {
    const multipleValue = coinPrice * multiple;
    return await this.obligationModel
      .aggregate([
        {
          $unwind: `$${field}`,
        },
        {
          $match: {
            [`${field}.asset`]: coinType,
          },
        },
        {
          $group: {
            _id: `$${field}.asset`,
            totalAsset: { $first: `$${field}.asset` },
            totalAmount: { $sum: { $toDouble: `$${field}.amount` } },
            totalValue: {
              $sum: {
                $multiply: [{ $toDouble: `$${field}.amount` }, multipleValue],
              },
            },
            totalCount: { $sum: 1 },
          },
        },
        {
          $project: {
            totalAsset: '$_id',
            totalAmount: 1,
            totalValue: 1,
            totalCount: 1,
            _id: 0,
          },
        },
      ])
      .exec();
  }
}
