import { Inject, Injectable } from '@nestjs/common';
import { NetworkType, SuiKit } from '@scallop-dao/sui-kit';
import { PaginatedEvents, SuiEvent } from '@mysten/sui.js';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Deposit,
  Withdraw,
  Borrow,
  Repay,
  Obligation,
  ObligationDocument,
  Collateral,
  Debt,
} from './obligation.schema';

import { EventStateService } from '../eventstate/eventstate.service';
import { EventState } from 'src/eventstate/eventstate.schema';
import { delay } from 'src/common/utils/time';

@Injectable()
export class ObligationService {
  @Inject(EventStateService)
  private readonly _eventStateService: EventStateService;

  constructor(
    @InjectModel(Obligation.name)
    private obligationModel: Model<ObligationDocument>,
  ) {}

  async create(obligation: Obligation): Promise<Obligation> {
    const createdObligation = new this.obligationModel(obligation);
    return createdObligation.save();
  }

  async findAll(): Promise<Obligation[]> {
    return this.obligationModel.find().exec();
  }

  async findOne(id: string): Promise<Obligation> {
    return this.obligationModel.findById(id).exec();
  }

  async update(id: string, obligation: Obligation): Promise<Obligation> {
    return this.obligationModel
      .findByIdAndUpdate(id, obligation, {
        new: true,
      })
      .exec();
  }

  // findOneByObligationId
  async findByObligation(id: string): Promise<Obligation> {
    return this.obligationModel.findOne({ obligation_id: id }).exec();
  }

  // findOneAndUpdateObligation
  async findOneAndUpdateObligation(
    id: string,
    obligation: Obligation,
  ): Promise<Obligation> {
    return this.obligationModel
      .findOneAndUpdate({ obligation_id: id }, obligation, { upsert: true })
      .exec();
  }

  // get event data
  async getEventData(
    suiKit: SuiKit,
    eventType: string,
    limit = Number(process.env.QUERY_LIMIT),
    cursorTxDigest?: string,
    cursorEventSeq?: string,
  ): Promise<any[]> {
    // Find if there is cursor stored in DB
    const eventName = eventType.split('::')[2];
    const eventState = await this._eventStateService.findByEventType(eventType);
    if (eventState !== null) {
      cursorTxDigest = eventState.nextCursorTxDigest;
      cursorEventSeq = eventState.nextCursorEventSeq;
    }

    const eventData = [];
    let hasNextPage = true;
    let latestEvent: PaginatedEvents;
    while (hasNextPage) {
      if (cursorTxDigest === undefined || cursorEventSeq === undefined) {
        latestEvent = await suiKit.rpcProvider.provider.queryEvents({
          query: {
            MoveEventType: eventType,
          },
          limit: limit,
          order: 'ascending',
        });
        console.log(`[${eventName}]: qurey from start.`);
      } else {
        latestEvent = await suiKit.rpcProvider.provider.queryEvents({
          query: {
            MoveEventType: eventType,
          },
          cursor: {
            txDigest: cursorTxDigest,
            eventSeq: cursorEventSeq,
          },
          limit: limit,
          order: 'ascending',
        });
        console.log(`[${eventName}]: qurey from cursor[${cursorTxDigest}].`);
      }

      for (const element of latestEvent.data) {
        eventData.push(element);

        cursorTxDigest = element.id.txDigest;
        cursorEventSeq = element.id.eventSeq;
      }

      hasNextPage = latestEvent.hasNextPage;
      if (hasNextPage === true) {
        cursorTxDigest = latestEvent.nextCursor.txDigest;
        cursorEventSeq = latestEvent.nextCursor.eventSeq;
      }
    }
    // Save Next Cursor data
    if (eventData.length > 0) {
      const lastEventState: EventState = {
        eventType: eventType,
        nextCursorTxDigest: latestEvent.nextCursor.txDigest,
        nextCursorEventSeq: latestEvent.nextCursor.eventSeq,
      };
      await this._eventStateService.findOneByEventTypeAndUpdateEventState(
        eventType,
        lastEventState,
      );
    }
    return eventData;
  }

  // loop 5 events every 30 seconds
  async loopQueryEvents(): Promise<void> {
    const mnemonics = process.env.MNEMONICS;
    const network = <NetworkType>process.env.NETWORK;
    const fullNodeUrl = process.env.RPC_ENDPOINT ?? undefined;
    const suiKit = new SuiKit({
      mnemonics,
      networkType: network,
      fullnodeUrl: fullNodeUrl,
    });

    // loop every interval secconds
    let hasCollateralsChanged = false;
    let hasDebtsChanged = false;
    while (true) {
      const start = new Date().getTime();
      const changedObligationMap = new Map();

      const obligations = await this.updateCreatedObliations(
        suiKit,
        changedObligationMap,
      );
      if (obligations.length > 0) {
        hasCollateralsChanged = true;
        hasDebtsChanged = true;
      }

      const deposits = await this.updateDeposits(suiKit, changedObligationMap);
      if (deposits.length > 0) {
        hasCollateralsChanged = true;
      }

      const withdraws = await this.updateWithdraws(
        suiKit,
        changedObligationMap,
      );
      if (withdraws.length > 0) {
        hasCollateralsChanged = true;
      }

      const borrows = await this.updateBorrows(suiKit, changedObligationMap);
      if (borrows.length > 0) {
        hasDebtsChanged = true;
      }

      const repays = await this.updateRepays(suiKit, changedObligationMap);
      if (repays.length > 0) {
        hasDebtsChanged = true;
      }

      if (hasCollateralsChanged) {
        await this.updateCollaterals(suiKit, changedObligationMap);
        hasCollateralsChanged = false;
      }
      if (hasDebtsChanged) {
        await this.updateDebts(suiKit, changedObligationMap);
        hasDebtsChanged = false;
      }

      const end = new Date().getTime();
      const execTime = (end - start) / 1000;
      console.log(`=== loopQueryEvents exec Times: <${execTime}> seconds ===`);
      if (execTime < Number(process.env.QUERY_INTERVAL_SECONDS)) {
        await delay(
          (Number(process.env.QUERY_INTERVAL_SECONDS) - execTime) * 1000,
        );
      }
    }
  }

  async updateObligationFields(
    suiKit: SuiKit,
    fieldName: string,
    obligationMap: Map<string, Obligation>,
    processField: (
      item: any,
      fieldObjs: any,
      obligation: Obligation,
    ) => Promise<void>,
  ): Promise<void> {
    const keys = [...obligationMap.keys()];
    const obligationObjs = await suiKit.getObjects(keys);

    for (const obligationObj of obligationObjs) {
      const parentId =
        obligationObj.objectFields[fieldName].fields.table.fields.id.id;
      const dynamicFields = await suiKit
        .provider()
        .getDynamicFields({ parentId });

      const obligation = obligationMap.get(obligationObj.objectId);
      for (const item of dynamicFields.data) {
        const fieldObjs =
          await suiKit.rpcProvider.provider.getDynamicFieldObject({
            parentId: parentId,
            name: {
              type: item.name.type,
              value: item.name.value,
            },
          });

        await processField(item, fieldObjs, obligation);

        obligationMap.set(obligation.obligation_id, obligation);
        await this.findOneAndUpdateObligation(
          obligation.obligation_id,
          obligation,
        );
        console.log(`[${fieldName}]: update <${obligation.obligation_id}>`);
      }
    }
  }

  // update collaterals to obligation
  async updateCollaterals(
    suiKit: SuiKit,
    obligationMap: Map<string, Obligation>,
  ): Promise<void> {
    return this.updateObligationFields(
      suiKit,
      'collaterals',
      obligationMap,
      async (item, fieldObjs, obligation) => {
        let amount = '';
        if ('fields' in fieldObjs.data.content) {
          amount = fieldObjs.data.content.fields.value.fields.amount;
        }
        const collateral: Collateral = {
          asset: item.name.value.name,
          amount: amount,
        };
        await this.updateObligationProperty(
          obligation,
          'collaterals',
          collateral,
        );
      },
    );
  }

  // update debts to obligation
  async updateDebts(
    suiKit: SuiKit,
    obligationMap: Map<string, Obligation>,
  ): Promise<void> {
    return this.updateObligationFields(
      suiKit,
      'debts',
      obligationMap,
      async (item, fieldObjs, obligation) => {
        let amount = '';
        let borrowIdx = '';
        if ('fields' in fieldObjs.data.content) {
          amount = fieldObjs.data.content.fields.value.fields.amount;
          borrowIdx = fieldObjs.data.content.fields.value.fields.borrow_index;
        }
        const debt: Debt = {
          asset: item.name.value.name,
          amount: amount,
          borrowIndex: borrowIdx,
        };
        await this.updateObligationProperty(obligation, 'debts', debt);
      },
    );
  }

  async updateFromEventData(
    suiKit: SuiKit,
    eventKey: string,
    obligationMap: Map<string, Obligation>,
    updateCallback: (item: any, obligation: Obligation) => Promise<void>,
  ): Promise<any[]> {
    try {
      const eventData = await this.getEventData(suiKit, eventKey);

      const eventName = eventKey.split('::')[2];
      // eventData.forEach(async (item) => {
      for (const item of eventData) {
        let obligation = obligationMap.get(item.parsedJson.obligation);
        if (obligation === undefined || !obligation) {
          obligation = await this.findByObligation(item.parsedJson.obligation);
        }
        if (!obligation) {
          obligation = {
            obligation_id: item.parsedJson.obligation,
          } as Obligation;
        }

        await updateCallback(item, obligation);

        obligationMap.set(obligation.obligation_id, obligation);
        await this.findOneAndUpdateObligation(
          obligation.obligation_id,
          obligation,
        );
        console.log(`[${eventName}]: update <${obligation.obligation_id}>`);
        // console.log(obligationMap);
      }

      console.log(`[${eventName}]: update <${eventData.length}>`);
      return eventData;
    } catch (error) {
      console.error(
        `Error updating event data for ${eventKey}: ${error.message}`,
      );
      throw error;
    }
  }

  // update created obligations
  async updateCreatedObliations(
    suiKit: SuiKit,
    obligationMap: Map<string, Obligation>,
  ): Promise<any[]> {
    return await this.updateFromEventData(
      suiKit,
      process.env.EVENT_OBLIGATION_CREATED,
      obligationMap,
      async (item, obligation) => {
        obligation.obligation_id = item.parsedJson.obligation;
        obligation.obligation_key = item.parsedJson.obligation_key;
        obligation.sender = item.parsedJson.sender;
        obligation.timestampMs = item.timestampMs;
      },
    );
  }

  async updateObligationProperty(
    obligation: Obligation,
    property: string,
    item: any,
  ): Promise<Obligation> {
    if (!obligation[property]) {
      obligation[property] = [];
    }
    if (!obligation[property].includes(item)) {
      obligation[property].push(item);
    }
    return obligation;
  }

  // update deposits to obligation
  async updateDeposits(
    suiKit: SuiKit,
    obligationMap: Map<string, Obligation>,
  ): Promise<any[]> {
    return await this.updateFromEventData(
      suiKit,
      process.env.EVENT_COLLATERAL_DEPOSIT,
      obligationMap,
      async (item, obligation) => {
        const deposit: Deposit = {
          asset: item.parsedJson.deposit_asset.name,
          amount: item.parsedJson.deposit_amount,
          timestampMs: item.timestampMs,
        };
        await this.updateObligationProperty(obligation, 'deposits', deposit);
      },
    );
  }

  // update withdraw to obligation
  async updateWithdraws(
    suiKit: SuiKit,
    obligationMap: Map<string, Obligation>,
  ): Promise<any[]> {
    return await this.updateFromEventData(
      suiKit,
      process.env.EVENT_COLLATERAL_WITHDRAW,
      obligationMap,
      async (item, obligation) => {
        const withdraw: Withdraw = {
          asset: item.parsedJson.withdraw_asset.name,
          amount: item.parsedJson.withdraw_amount,
          timestampMs: item.timestampMs,
        };
        await this.updateObligationProperty(obligation, 'withdraws', withdraw);
      },
    );
  }

  // update borrow to obligation
  async updateBorrows(
    suiKit: SuiKit,
    obligationMap: Map<string, Obligation>,
  ): Promise<any[]> {
    return await this.updateFromEventData(
      suiKit,
      process.env.EVENT_BORROW,
      obligationMap,
      async (item, obligation) => {
        const borrow: Borrow = {
          asset: item.parsedJson.asset.name,
          amount: item.parsedJson.amount,
          timestampMs: item.timestampMs,
        };

        await this.updateObligationProperty(obligation, 'borrows', borrow);
      },
    );
  }

  // update repay to obligation
  async updateRepays(
    suiKit: SuiKit,
    obligationMap: Map<string, Obligation>,
  ): Promise<any[]> {
    return await this.updateFromEventData(
      suiKit,
      process.env.EVENT_REPAY,
      obligationMap,
      async (item, obligation) => {
        const repay: Repay = {
          asset: item.parsedJson.asset.name,
          amount: item.parsedJson.amount,
          timestampMs: item.timestampMs,
        };

        await this.updateObligationProperty(obligation, 'repays', repay);
      },
    );
  }

  // subscribe protocol::open_obligation::ObligationCreatedEvent
  async subscribeCreatedEvent(suiKit: SuiKit): Promise<void> {
    const subId = suiKit.provider().subscribeEvent({
      filter: {
        MoveEventType: process.env.EVENT_OBLIGATION_CREATED,
      },
      onMessage: (event: SuiEvent) => {
        console.log(event);
        // TODO: Parse the event
        // TODO: Update DB
        console.log(`subscribeCreatedEvent[${subId}]:<${event}>`);
      },
    });
  }

  // subscribe protocol::deposit_collateral::CollateralDepositEvent
  async subscribeDepositEvent(suiKit: SuiKit): Promise<void> {
    const subId = suiKit.provider().subscribeEvent({
      filter: {
        MoveEventType: process.env.EVENT_COLLATERAL_DEPOSIT,
      },
      onMessage: (event: SuiEvent) => {
        console.log(event);
        // TODO: Parse the event
        // TODO: Update DB
        console.log(`subscribeDepositEvent[${subId}]:<${event}>`);
      },
    });
  }

  // subscribe protocol::withdraw_collateral::CollateralWithdrawEvent
  async subscribeWithdrawEvent(suiKit: SuiKit): Promise<void> {
    const subId = suiKit.provider().subscribeEvent({
      filter: {
        MoveEventType: process.env.EVENT_COLLATERAL_WITHDRAW,
      },
      onMessage: (event: SuiEvent) => {
        console.log(event);
        // TODO: Parse the event
        // TODO: Update DB
        console.log(`subscribeWithdrawEvent[${subId}]:<${event}>`);
      },
    });
  }

  // subscribe protocol::borrow::BorrowEvent
  async subscribBorrowEvent(suiKit: SuiKit): Promise<void> {
    const subId = suiKit.provider().subscribeEvent({
      filter: {
        MoveEventType: process.env.EVENT_BORROW,
      },
      onMessage: (event: SuiEvent) => {
        console.log(event);
        // TODO: Parse the event
        // TODO: Update DB
        console.log(`subscribBorrowEvent[${subId}]:<${event}>`);
      },
    });
  }

  // subscribe protocol::repay::RepayEvent
  async subscribRepayEvent(suiKit: SuiKit): Promise<void> {
    const subId = suiKit.provider().subscribeEvent({
      filter: {
        MoveEventType: process.env.EVENT_REPAY,
      },
      onMessage: (event: SuiEvent) => {
        console.log(event);
        // TODO: Parse the event
        // TODO: Update DB
        console.log(`subscribRepayEvent[${subId}]:<${event}>`);
      },
    });
  }

  // listen 5 events
  async listenEvents(): Promise<void> {
    const mnemonics = process.env.MNEMONICS;
    const network = <NetworkType>process.env.NETWORK;
    const fullNodeUrl = process.env.RPC_ENDPOINT ?? undefined;
    const suiKit = new SuiKit({
      mnemonics,
      networkType: network,
      fullnodeUrl: fullNodeUrl,
    });
    const owner = suiKit.currentAddress();
    console.log(`currentAddress:<${owner}>`);

    this.subscribeDepositEvent(suiKit);
    this.subscribeCreatedEvent(suiKit);
    this.subscribeWithdrawEvent(suiKit);
    this.subscribBorrowEvent(suiKit);
    this.subscribRepayEvent(suiKit);
  }
}
