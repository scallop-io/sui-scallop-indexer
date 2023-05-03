import { Injectable } from '@nestjs/common';
import { NetworkType, SuiKit } from '@scallop-dao/sui-kit';
import { SuiEvent } from '@mysten/sui.js';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Deposit, Obligation, ObligationDocument } from './obligation.schema';
import { Withdraw } from './obligation.schema';
import { Borrow } from './obligation.schema';
import { Repay } from './obligation.schema';

@Injectable()
export class ObligationService {
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

  // get event data
  async getEventData(suiKit: SuiKit, eventType: string): Promise<any[]> {
    let eventData = [];
    let hasNextPage = true;
    while (hasNextPage) {
      const fetchedEvent = await suiKit.rpcProvider.provider.queryEvents({
        query: {
          MoveEventType: eventType,
        },
        // TODO: Deal with Next Page -> cursor: {txDigest: createdEvent.nextCursor.txDigest,}
        limit: 1000,
      });
      hasNextPage = fetchedEvent.hasNextPage;
      if (eventData.length === 0) eventData = fetchedEvent.data;
      else eventData.concat(fetchedEvent.data.values());
      // console.log(fetchedEvent);
      // console.log(`eventData:<${eventData.length}>`);
    }

    return eventData;
  }

  // query 5 events
  async updateObligationsFromQueryEvents(): Promise<void> {
    const mnemonics = process.env.MNEMONICS;
    const network = <NetworkType>process.env.NETWORK;
    const suiKit = new SuiKit({ mnemonics, networkType: network });
    const owner = suiKit.currentAddress();
    console.log(`currentAddress:<${owner}>`);

    const obligationMap = new Map();
    await this.updateCreatedObliations(suiKit, obligationMap);
    await this.updateDeposits(suiKit, obligationMap);
    await this.updateWithdraws(suiKit, obligationMap);
    await this.updateBorrows(suiKit, obligationMap);
    await this.updateRepays(suiKit, obligationMap);

    await this.updateObligationsToDB(obligationMap);
  }

  // update obligations to DB
  async updateObligationsToDB(
    obligationMap: Map<string, Obligation>,
  ): Promise<void> {
    // Update to DB
    obligationMap.forEach((obligation, key) => {
      this.findOneAndUpdateObligation(key, obligation);

      console.log(obligation);
    });
  }

  // update created obligations
  async updateCreatedObliations(
    suiKit: SuiKit,
    obligationMap: Map<string, Obligation>,
  ): Promise<void> {
    const createdData = await this.getEventData(
      suiKit,
      process.env.EVENT_OBLIGATION_CREATED,
    );
    console.log(`createdData:<${createdData.length}>`);
    createdData.forEach((item) => {
      // console.log(`parsedJson[${index}]:<${item.parsedJson}>`);
      // console.log(item.parsedJson);
      const obligation: Obligation = {
        obligation_id: item.parsedJson.obligation,
        obligation_key: item.parsedJson.obligation_key,
        sender: item.parsedJson.sender,
        timestampMs: item.timestampMs,
      };
      obligationMap.set(obligation.obligation_id, obligation);
    });
  }

  // update deposits to obligation
  async updateDeposits(
    suiKit: SuiKit,
    obligationMap: Map<string, Obligation>,
  ): Promise<void> {
    const depositData = await this.getEventData(
      suiKit,
      process.env.EVENT_COLLATERAL_DEPOSIT,
    );
    console.log(`depositData:<${depositData.length}>`);
    depositData.forEach((item) => {
      const obligation: Obligation = obligationMap.get(
        item.parsedJson.obligation,
      );
      const deposit: Deposit = {
        asset: item.parsedJson.deposit_asset.name,
        amount: item.parsedJson.deposit_amount,
        timestampMs: item.timestampMs,
      };

      if (obligation.deposits === undefined) {
        obligation.deposits = [];
      }
      if (!obligation.deposits.includes(deposit)) {
        obligation.deposits.push(deposit);
      }
    });
  }

  // update withdraw to obligation
  async updateWithdraws(
    suiKit: SuiKit,
    obligationMap: Map<string, Obligation>,
  ): Promise<void> {
    const withdrawData = await this.getEventData(
      suiKit,
      process.env.EVENT_COLLATERAL_WITHDRAW,
    );
    console.log(`withdrawData:<${withdrawData.length}>`);
    withdrawData.forEach((item) => {
      const obligation: Obligation = obligationMap.get(
        item.parsedJson.obligation,
      );
      const withdraw: Withdraw = {
        asset: item.parsedJson.withdraw_asset.name,
        amount: item.parsedJson.withdraw_amount,
        timestampMs: item.timestampMs,
      };

      if (obligation.withdraws === undefined) {
        obligation.withdraws = [];
      }
      if (!obligation.withdraws.includes(withdraw)) {
        obligation.withdraws.push(withdraw);
      }
    });
  }

  // update borrow to obligation
  async updateBorrows(
    suiKit: SuiKit,
    obligationMap: Map<string, Obligation>,
  ): Promise<void> {
    const borrowData = await this.getEventData(
      suiKit,
      process.env.EVENT_BORROW,
    );
    console.log(`borrowData:<${borrowData.length}>`);
    borrowData.forEach((item) => {
      const obligation: Obligation = obligationMap.get(
        item.parsedJson.obligation,
      );
      const borrow: Borrow = {
        asset: item.parsedJson.asset.name,
        amount: item.parsedJson.amount,
        timestampMs: item.timestampMs,
      };

      if (obligation.borrows === undefined) {
        obligation.borrows = [];
      }
      if (!obligation.borrows.includes(borrow)) {
        obligation.borrows.push(borrow);
      }
    });
  }

  // update repay to obligation
  async updateRepays(
    suiKit: SuiKit,
    obligationMap: Map<string, Obligation>,
  ): Promise<void> {
    const repayData = await this.getEventData(suiKit, process.env.EVENT_REPAY);
    console.log(`repayData:<${repayData.length}>`);
    repayData.forEach((item) => {
      const obligation: Obligation = obligationMap.get(
        item.parsedJson.obligation,
      );
      const repay: Repay = {
        asset: item.parsedJson.asset.name,
        amount: item.parsedJson.amount,
        timestampMs: item.timestampMs,
      };

      if (obligation.repays === undefined) {
        obligation.repays = [];
      }
      if (!obligation.repays.includes(repay)) {
        obligation.repays.push(repay);
      }
    });
  }

  // update collaterals to obligation
  async updateCollaterals(
    suiKit: SuiKit,
    obligationMap: Map<string, Obligation>,
  ): Promise<void> {
    // TODO: implement
    console.log(`<${suiKit}>, <${obligationMap}>`);
  }

  // update debts to obligation
  async updateDebts(
    suiKit: SuiKit,
    obligationMap: Map<string, Obligation>,
  ): Promise<void> {
    // TODO: implement
    console.log(`<${suiKit}>, <${obligationMap}>`);
  }
}
