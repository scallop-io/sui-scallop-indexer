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

      latestEvent.data.forEach((element) => {
        eventData.push(element);

        cursorTxDigest = element.id.txDigest;
        cursorEventSeq = element.id.eventSeq;
      });

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
    const suiKit = new SuiKit({ mnemonics, networkType: network });

    // loop every interval secconds
    let hasCollateralsChanged = true;
    let hasDebtsChanged = true;
    setInterval(async () => {
      const start = new Date().getTime();
      const changedObligationMap = new Map();

      await this.updateCreatedObliations(suiKit, changedObligationMap);

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
    }, Number(process.env.QUERY_INTERVAL_SECONDS) * 1000);
  }

  // update collaterals to obligation
  async updateCollaterals(
    suiKit: SuiKit,
    obligationMap: Map<string, Obligation>,
  ): Promise<void> {
    const keys = [...obligationMap.keys()];
    const obligationObjs = await suiKit.getObjects(keys);
    obligationObjs.forEach(async (obligationObj) => {
      const parentId =
        obligationObj.objectFields.collaterals.fields.table.fields.id.id;
      const dynamicFields = await suiKit
        .provider()
        .getDynamicFields({ parentId: parentId });

      const obligation = obligationMap.get(obligationObj.objectId);
      dynamicFields.data.forEach(async (item) => {
        const fieldObjs =
          await suiKit.rpcProvider.provider.getDynamicFieldObject({
            parentId: parentId,
            name: {
              type: item.name.type,
              value: item.name.value,
            },
          });

        let amount = '';
        if ('fields' in fieldObjs.data.content) {
          amount = fieldObjs.data.content.fields.value.fields.amount;
        }

        const collateral: Collateral = {
          asset: item.name.value.name,
          amount: amount,
        };

        if (
          obligation.collaterals === undefined ||
          obligation.collaterals === null
        ) {
          obligation.collaterals = [];
        }
        if (!obligation.collaterals.includes(collateral)) {
          obligation.collaterals.push(collateral);
        }
        this.findOneAndUpdateObligation(obligation.obligation_id, obligation);
        obligationMap.set(obligation.obligation_id, obligation);
        console.log(
          `[Collaterals]: update <${obligation.obligation_id}>, collaterals[${obligation.collaterals.length}]`,
        );
      });
    });
  }

  // update debts to obligation
  async updateDebts(
    suiKit: SuiKit,
    obligationMap: Map<string, Obligation>,
  ): Promise<void> {
    const keys = [...obligationMap.keys()];
    const obligationObjs = await suiKit.getObjects(keys); // obligation obj
    obligationObjs.forEach(async (obligationObj) => {
      const parentId =
        obligationObj.objectFields.debts.fields.table.fields.id.id;

      const dynamicFields = await suiKit
        .provider()
        .getDynamicFields({ parentId: parentId });

      const obligation = obligationMap.get(obligationObj.objectId);
      dynamicFields.data.forEach(async (item) => {
        const fieldObjs =
          await suiKit.rpcProvider.provider.getDynamicFieldObject({
            parentId: parentId,
            name: {
              type: item.name.type,
              value: item.name.value,
            },
          });

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

        if (obligation.debts === undefined || obligation.debts === null) {
          obligation.debts = [];
        }
        if (!obligation.debts.includes(debt)) {
          obligation.debts.push(debt);
        }
        this.findOneAndUpdateObligation(obligation.obligation_id, obligation);
        obligationMap.set(obligation.obligation_id, obligation);
        console.log(
          `[Debts]: update <${obligation.obligation_id}>, debts[${obligation.debts.length}]`,
        );
      });
    });
  }

  // update created obligations
  async updateCreatedObliations(
    suiKit: SuiKit,
    obligationMap: Map<string, Obligation>,
  ): Promise<any[]> {
    const createdData = await this.getEventData(
      suiKit,
      process.env.EVENT_OBLIGATION_CREATED,
    );

    const eventName = process.env.EVENT_OBLIGATION_CREATED.split('::')[2];
    createdData.forEach((item) => {
      const obligation: Obligation = {
        obligation_id: item.parsedJson.obligation,
        obligation_key: item.parsedJson.obligation_key,
        sender: item.parsedJson.sender,
        timestampMs: item.timestampMs,
      };
      this.findOneAndUpdateObligation(obligation.obligation_id, obligation);
      obligationMap.set(obligation.obligation_id, obligation);
      console.log(`[${eventName}]: update <${obligation.obligation_id}>`);
    });
    console.log(`[${eventName}]: update <${createdData.length}>`);
    return createdData;
  }

  // update deposits to obligation
  async updateDeposits(
    suiKit: SuiKit,
    obligationMap: Map<string, Obligation>,
  ): Promise<any[]> {
    const depositData = await this.getEventData(
      suiKit,
      process.env.EVENT_COLLATERAL_DEPOSIT,
    );

    const eventName = process.env.EVENT_COLLATERAL_DEPOSIT.split('::')[2];
    let obligation: Obligation;
    depositData.forEach(async (item) => {
      obligation = obligationMap.get(item.parsedJson.obligation);
      if (obligation === undefined || !obligation) {
        obligation = await this.findByObligation(item.parsedJson.obligation);
      }

      const deposit: Deposit = {
        asset: item.parsedJson.deposit_asset.name,
        amount: item.parsedJson.deposit_amount,
        timestampMs: item.timestampMs,
      };

      if (obligation.deposits === undefined || obligation.deposits === null) {
        obligation.deposits = [];
      }
      if (!obligation.deposits.includes(deposit)) {
        obligation.deposits.push(deposit);
      }
      this.findOneAndUpdateObligation(obligation.obligation_id, obligation);
      obligationMap.set(obligation.obligation_id, obligation);
      console.log(`[${eventName}]: update <${obligation.obligation_id}>`);
    });

    console.log(`[${eventName}]: update <${depositData.length}>`);
    return depositData;
  }

  // update withdraw to obligation
  async updateWithdraws(
    suiKit: SuiKit,
    obligationMap: Map<string, Obligation>,
  ): Promise<any[]> {
    const withdrawData = await this.getEventData(
      suiKit,
      process.env.EVENT_COLLATERAL_WITHDRAW,
    );

    const eventName = process.env.EVENT_COLLATERAL_WITHDRAW.split('::')[2];
    let obligation: Obligation;
    withdrawData.forEach(async (item) => {
      obligation = obligationMap.get(item.parsedJson.obligation);
      if (obligation === undefined || !obligation) {
        obligation = await this.findByObligation(item.parsedJson.obligation);
      }
      const withdraw: Withdraw = {
        asset: item.parsedJson.withdraw_asset.name,
        amount: item.parsedJson.withdraw_amount,
        timestampMs: item.timestampMs,
      };

      if (obligation.withdraws === undefined || obligation.withdraws === null) {
        obligation.withdraws = [];
      }
      if (!obligation.withdraws.includes(withdraw)) {
        obligation.withdraws.push(withdraw);
      }
      this.findOneAndUpdateObligation(obligation.obligation_id, obligation);
      obligationMap.set(obligation.obligation_id, obligation);
      console.log(`[${eventName}]: update <${obligation.obligation_id}>`);
    });
    console.log(`[${eventName}]: update <${withdrawData.length}>`);
    return withdrawData;
  }

  // update borrow to obligation
  async updateBorrows(
    suiKit: SuiKit,
    obligationMap: Map<string, Obligation>,
  ): Promise<any[]> {
    const borrowData = await this.getEventData(
      suiKit,
      process.env.EVENT_BORROW,
    );
    const eventName = process.env.EVENT_BORROW.split('::')[2];
    let obligation: Obligation;
    borrowData.forEach(async (item) => {
      obligation = obligationMap.get(item.parsedJson.obligation);
      if (obligation === undefined || !obligation) {
        obligation = await this.findByObligation(item.parsedJson.obligation);
      }
      const borrow: Borrow = {
        asset: item.parsedJson.asset.name,
        amount: item.parsedJson.amount,
        timestampMs: item.timestampMs,
      };

      if (obligation.borrows === undefined || obligation.borrows === null) {
        obligation.borrows = [];
      }
      if (!obligation.borrows.includes(borrow)) {
        obligation.borrows.push(borrow);
      }
      this.findOneAndUpdateObligation(obligation.obligation_id, obligation);
      obligationMap.set(obligation.obligation_id, obligation);
      console.log(`[${eventName}]: update <${obligation.obligation_id}>`);
    });
    console.log(`[${eventName}]: update <${borrowData.length}>`);
    return borrowData;
  }

  // update repay to obligation
  async updateRepays(
    suiKit: SuiKit,
    obligationMap: Map<string, Obligation>,
  ): Promise<any[]> {
    const repayData = await this.getEventData(suiKit, process.env.EVENT_REPAY);

    const eventName = process.env.EVENT_REPAY.split('::')[2];
    let obligation: Obligation;
    repayData.forEach(async (item) => {
      obligation = obligationMap.get(item.parsedJson.obligation);
      if (obligation === undefined || !obligation) {
        obligation = await this.findByObligation(item.parsedJson.obligation);
      }
      const repay: Repay = {
        asset: item.parsedJson.asset.name,
        amount: item.parsedJson.amount,
        timestampMs: item.timestampMs,
      };

      if (obligation.repays === undefined || obligation.repays === null) {
        obligation.repays = [];
      }
      if (!obligation.repays.includes(repay)) {
        obligation.repays.push(repay);
      }
      this.findOneAndUpdateObligation(obligation.obligation_id, obligation);
      obligationMap.set(obligation.obligation_id, obligation);
      console.log(`[${eventName}]: update <${obligation.obligation_id}>`);
    });
    console.log(`[${eventName}]: update <${repayData.length}>`);
    return repayData;
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
    const suiKit = new SuiKit({ mnemonics, networkType: network });
    const owner = suiKit.currentAddress();
    console.log(`currentAddress:<${owner}>`);

    this.subscribeDepositEvent(suiKit);
    this.subscribeCreatedEvent(suiKit);
    this.subscribeWithdrawEvent(suiKit);
    this.subscribBorrowEvent(suiKit);
    this.subscribRepayEvent(suiKit);
  }
}
