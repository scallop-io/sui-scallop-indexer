import { Inject, Injectable } from '@nestjs/common';
// import { delay } from './common/utils/time';
import { ObligationService } from './obligation/obligation.service';
import { DepositService } from './deposit/deposit.service';
import { SuiService } from './sui/sui.service';
import { WithdrawService } from './withdraw/withdraw.service';
import { BorrowService } from './borrow/borrow.service';
import { RepayService } from './repay/repay.service';
import { LiquidateService } from './liquidate/liquidate.service';
import { BorrowDynamicService } from './borrow-dynamic/borrow-dynamic.service';
import { EventStateService } from './eventstate/eventstate.service';
import { InjectConnection } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { FlashloanService } from './flashloan/flashloan.service';
import { StatisticService } from './statistic/statistic.service';
import { MintService } from './mint/mint.service';
import { RedeemService } from './redeem/redeem.service';

@Injectable()
export class AppService {
  @Inject(SuiService)
  private readonly _suiService: SuiService;

  @Inject(EventStateService)
  private readonly _eventStateService: EventStateService;

  @Inject(ObligationService)
  private readonly _obligationService: ObligationService;

  @Inject(DepositService)
  private readonly _depositService: DepositService;

  @Inject(WithdrawService)
  private readonly _withdrawService: WithdrawService;

  @Inject(BorrowService)
  private readonly _borrowService: BorrowService;

  @Inject(RepayService)
  private readonly _repayService: RepayService;

  @Inject(LiquidateService)
  private readonly _liquidateService: LiquidateService;

  @Inject(BorrowDynamicService)
  private readonly _borrowDynamicService: BorrowDynamicService;

  @Inject(FlashloanService)
  private readonly _flashloanService: FlashloanService;

  @Inject(StatisticService)
  private readonly _statisticService: StatisticService;

  @Inject(MintService)
  private readonly _mintService: MintService;

  @Inject(RedeemService)
  private readonly _redeemService: RedeemService;

  constructor(
    @InjectConnection() private readonly connection: mongoose.Connection,
  ) {}

  async updateAllObligationCreatedEvents(): Promise<void> {
    const changedEventStateMap = new Map();

    while (true) {
      try {
        const [obligations, hasNextPage] =
          await this._obligationService.getObligationsFromQueryEventByPages(
            this._suiService,
            changedEventStateMap,
          );

        const transactionSession = await this.connection.startSession();
        transactionSession.startTransaction();
        try {
          // update obligations
          const startTime = new Date().getTime();
          for (const obligation of obligations) {
            await this._obligationService.findOneAndUpdateObligation(
              obligation.obligation_id,
              obligation,
              transactionSession,
            );
            // console.debug(`[Obligations]: update <${obligation.obligation_id}>`);
          }
          const endTime = new Date().getTime();
          const execTime = (endTime - startTime) / 1000;
          console.log(
            `[Obligations]: update <${obligations.length}>, <${execTime}> secs.`,
          );

          // Update event states
          for (const eventState of changedEventStateMap.values()) {
            await this._eventStateService.findOneByEventTypeAndUpdateEventState(
              eventState.eventType,
              eventState,
              transactionSession,
            );
            console.log(
              `[EventState]: update <${eventState.eventType.split('::')[2]}>`,
            );
          }
          await transactionSession.commitTransaction();
        } catch (e) {
          await transactionSession.abortTransaction();
          console.error(
            'Error caught while updateAllObligationCreatedEvents():',
            e,
          );
        } finally {
          transactionSession.endSession();
        }

        if (!hasNextPage) {
          break;
        }
      } catch (err) {
        console.error(
          'Error caught while updateAllObligationCreatedEvents():',
          err,
        );
      }
    } //end while
  }

  async updateLiqudatorRelatedEvents(
    hasCollateralsChanged = false,
    hasDebtsChanged = false,
  ): Promise<void> {
    try {
      // update created obligations first
      await this.updateAllObligationCreatedEvents();

      const changedEventStateMap = new Map();
      const deposits = await this._depositService.getDepositsFromQueryEvent(
        this._suiService,
        changedEventStateMap,
      );
      if (deposits.length > 0) {
        hasCollateralsChanged = true;
      }

      const withdraws = await this._withdrawService.getWithdrawsFromQueryEvent(
        this._suiService,
        changedEventStateMap,
      );
      if (withdraws.length > 0) {
        hasCollateralsChanged = true;
      }

      const borrows = await this._borrowService.getBorrowsFromQueryEvent(
        this._suiService,
        changedEventStateMap,
      );
      if (borrows.length > 0) {
        hasDebtsChanged = true;
      }

      const repays = await this._repayService.getRepaysFromQueryEvent(
        this._suiService,
        changedEventStateMap,
      );
      if (repays.length > 0) {
        hasDebtsChanged = true;
      }

      const liquidates =
        await this._liquidateService.getLiquidatesFromQueryEvent(
          this._suiService,
          changedEventStateMap,
        );
      if (liquidates.length > 0) {
        hasCollateralsChanged = true;
        hasDebtsChanged = true;
      }

      const transactionSession = await this.connection.startSession();
      transactionSession.startTransaction();
      try {
        const changedObligationMap = new Map();
        // update deposits
        let startTime = new Date().getTime();
        for (const deposit of deposits) {
          let obligation = changedObligationMap.get(deposit.obligation_id);
          if (obligation === undefined) {
            obligation = await this._obligationService.findByObligation(
              deposit.obligation_id,
              transactionSession,
            );
            changedObligationMap.set(obligation.obligation_id, obligation);
          }
          deposit.obligation = obligation;
          await this._depositService.create(deposit, transactionSession);
        }
        let endTime = new Date().getTime();
        let execTime = (endTime - startTime) / 1000;
        console.log(
          `[Deposits]: update <${deposits.length}>, <${execTime}> secs.`,
        );

        // update withdraws
        startTime = new Date().getTime();
        for (const withdraw of withdraws) {
          let obligation = changedObligationMap.get(withdraw.obligation_id);
          if (obligation === undefined) {
            obligation = await this._obligationService.findByObligation(
              withdraw.obligation_id,
              transactionSession,
            );
            changedObligationMap.set(obligation.obligation_id, obligation);
          }
          withdraw.obligation = obligation;
          await this._withdrawService.create(withdraw, transactionSession);
        }
        endTime = new Date().getTime();
        execTime = (endTime - startTime) / 1000;
        console.log(
          `[Withdraws]: update <${withdraws.length}>, <${execTime}> secs.`,
        );

        // update borrows
        startTime = new Date().getTime();
        for (const borrow of borrows) {
          let obligation = changedObligationMap.get(borrow.obligation_id);
          if (obligation === undefined) {
            obligation = await this._obligationService.findByObligation(
              borrow.obligation_id,
              transactionSession,
            );
            changedObligationMap.set(obligation.obligation_id, obligation);
          }
          borrow.obligation = obligation;
          await this._borrowService.create(borrow, transactionSession);
        }
        endTime = new Date().getTime();
        execTime = (endTime - startTime) / 1000;
        console.log(
          `[Borrows]: update <${borrows.length}>, <${execTime}> secs.`,
        );

        // update repays
        startTime = new Date().getTime();
        for (const repay of repays) {
          let obligation = changedObligationMap.get(repay.obligation_id);
          if (obligation === undefined) {
            obligation = await this._obligationService.findByObligation(
              repay.obligation_id,
              transactionSession,
            );
            changedObligationMap.set(obligation.obligation_id, obligation);
          }
          repay.obligation = obligation;
          await this._repayService.create(repay, transactionSession);
        }
        endTime = new Date().getTime();
        execTime = (endTime - startTime) / 1000;
        console.log(`[Repays]: update <${repays.length}>, <${execTime}> secs.`);

        // update liquidates
        startTime = new Date().getTime();
        for (const liquidate of liquidates) {
          let obligation = changedObligationMap.get(liquidate.obligation_id);
          if (obligation === undefined) {
            obligation = await this._obligationService.findByObligation(
              liquidate.obligation_id,
              transactionSession,
            );
            changedObligationMap.set(obligation.obligation_id, obligation);
          }
          liquidate.obligation = obligation;
          await this._liquidateService.create(liquidate, transactionSession);
        }
        endTime = new Date().getTime();
        execTime = (endTime - startTime) / 1000;
        console.log(
          `[Liquidates]: update <${liquidates.length}>, <${execTime}> secs.`,
        );

        // Update obligations with collaterals and debts changed
        startTime = new Date().getTime();
        if (hasCollateralsChanged) {
          await this._obligationService.updateCollateralsInObligationMap(
            this._suiService,
            changedObligationMap,
            transactionSession,
          );
          hasCollateralsChanged = false;
        }
        endTime = new Date().getTime();
        execTime = (endTime - startTime) / 1000;
        console.log(
          `[Collaterals]: updateCollateralsInObligationMap, <${execTime}> secs.`,
        );

        startTime = new Date().getTime();
        if (hasDebtsChanged) {
          await this._obligationService.updateDebtsInObligationMap(
            this._suiService,
            changedObligationMap,
            transactionSession,
          );
          hasDebtsChanged = false;
        }
        endTime = new Date().getTime();
        execTime = (endTime - startTime) / 1000;
        console.log(`[Debts]: updateDebtsInObligationMap, <${execTime}> secs.`);

        // Update event states
        for (const eventState of changedEventStateMap.values()) {
          await this._eventStateService.findOneByEventTypeAndUpdateEventState(
            eventState.eventType,
            eventState,
            transactionSession,
          );
          console.log(
            `[EventState]: update <${eventState.eventType.split('::')[2]}>`,
          );
        }
        await transactionSession.commitTransaction();
      } catch (e) {
        await transactionSession.abortTransaction();
        console.error('Error caught while processLiqudatorRelatedEvents():', e);
      } finally {
        transactionSession.endSession();
      }
    } catch (err) {
      console.error('Error caught while updateLiqudatorRelatedEvents():', err);
    }
  }

  // async updateLiqudatorRelatedEvents(
  //   hasCollateralsChanged = false,
  //   hasDebtsChanged = false,
  // ): Promise<void> {
  //   const changedEventStateMap = new Map();

  //   const obligations =
  //     await this._obligationService.getObligationsFromQueryEvent(
  //       this._suiService,
  //       changedEventStateMap,
  //     );
  //   if (obligations.length > 0) {
  //     hasCollateralsChanged = true;
  //     hasDebtsChanged = true;
  //   }

  //   const deposits = await this._depositService.getDepositsFromQueryEvent(
  //     this._suiService,
  //     changedEventStateMap,
  //   );
  //   if (deposits.length > 0) {
  //     hasCollateralsChanged = true;
  //   }

  //   const withdraws = await this._withdrawService.getWithdrawsFromQueryEvent(
  //     this._suiService,
  //     changedEventStateMap,
  //   );
  //   if (withdraws.length > 0) {
  //     hasCollateralsChanged = true;
  //   }

  //   const borrows = await this._borrowService.getBorrowsFromQueryEvent(
  //     this._suiService,
  //     changedEventStateMap,
  //   );
  //   if (borrows.length > 0) {
  //     hasDebtsChanged = true;
  //   }

  //   const repays = await this._repayService.getRepaysFromQueryEvent(
  //     this._suiService,
  //     changedEventStateMap,
  //   );
  //   if (repays.length > 0) {
  //     hasDebtsChanged = true;
  //   }

  //   const liquidates = await this._liquidateService.getLiquidatesFromQueryEvent(
  //     this._suiService,
  //     changedEventStateMap,
  //   );
  //   if (liquidates.length > 0) {
  //     hasCollateralsChanged = true;
  //     hasDebtsChanged = true;
  //   }

  //   const transactionSession = await this.connection.startSession();
  //   transactionSession.startTransaction();
  //   try {
  //     // update obligations
  //     let startTime = new Date().getTime();
  //     const changedObligationMap = new Map();
  //     for (const obligation of obligations) {
  //       const updatedObligation =
  //         await this._obligationService.findOneAndUpdateObligation(
  //           obligation.obligation_id,
  //           obligation,
  //           transactionSession,
  //         );
  //       changedObligationMap.set(
  //         updatedObligation.obligation_id,
  //         updatedObligation,
  //       );
  //       // console.debug(`[Obligations]: update <${obligation.obligation_id}>`);
  //     }
  //     let endTime = new Date().getTime();
  //     let execTime = (endTime - startTime) / 1000;
  //     console.log(
  //       `[Obligations]: update <${obligations.length}>, <${execTime}> secs.`,
  //     );

  //     // update deposits
  //     startTime = new Date().getTime();
  //     for (const deposit of deposits) {
  //       let obligation = changedObligationMap.get(deposit.obligation_id);
  //       if (obligation === undefined) {
  //         obligation = await this._obligationService.findByObligation(
  //           deposit.obligation_id,
  //           transactionSession,
  //         );
  //         changedObligationMap.set(obligation.obligation_id, obligation);
  //       }
  //       deposit.obligation = obligation;
  //       await this._depositService.create(deposit, transactionSession);
  //     }
  //     endTime = new Date().getTime();
  //     execTime = (endTime - startTime) / 1000;
  //     console.log(
  //       `[Deposits]: update <${deposits.length}>, <${execTime}> secs.`,
  //     );

  //     // update withdraws
  //     startTime = new Date().getTime();
  //     for (const withdraw of withdraws) {
  //       let obligation = changedObligationMap.get(withdraw.obligation_id);
  //       if (obligation === undefined) {
  //         obligation = await this._obligationService.findByObligation(
  //           withdraw.obligation_id,
  //           transactionSession,
  //         );
  //         changedObligationMap.set(obligation.obligation_id, obligation);
  //       }
  //       withdraw.obligation = obligation;
  //       await this._withdrawService.create(withdraw, transactionSession);
  //     }
  //     endTime = new Date().getTime();
  //     execTime = (endTime - startTime) / 1000;
  //     console.log(
  //       `[Withdraws]: update <${withdraws.length}>, <${execTime}> secs.`,
  //     );

  //     // update borrows
  //     startTime = new Date().getTime();
  //     for (const borrow of borrows) {
  //       let obligation = changedObligationMap.get(borrow.obligation_id);
  //       if (obligation === undefined) {
  //         obligation = await this._obligationService.findByObligation(
  //           borrow.obligation_id,
  //           transactionSession,
  //         );
  //         changedObligationMap.set(obligation.obligation_id, obligation);
  //       }
  //       borrow.obligation = obligation;
  //       await this._borrowService.create(borrow, transactionSession);
  //     }
  //     endTime = new Date().getTime();
  //     execTime = (endTime - startTime) / 1000;
  //     console.log(`[Borrows]: update <${borrows.length}>, <${execTime}> secs.`);

  //     // update repays
  //     startTime = new Date().getTime();
  //     for (const repay of repays) {
  //       let obligation = changedObligationMap.get(repay.obligation_id);
  //       if (obligation === undefined) {
  //         obligation = await this._obligationService.findByObligation(
  //           repay.obligation_id,
  //           transactionSession,
  //         );
  //         changedObligationMap.set(obligation.obligation_id, obligation);
  //       }
  //       repay.obligation = obligation;
  //       await this._repayService.create(repay, transactionSession);
  //     }
  //     endTime = new Date().getTime();
  //     execTime = (endTime - startTime) / 1000;
  //     console.log(`[Repays]: update <${repays.length}>, <${execTime}> secs.`);

  //     // update liquidates
  //     startTime = new Date().getTime();
  //     for (const liquidate of liquidates) {
  //       let obligation = changedObligationMap.get(liquidate.obligation_id);
  //       if (obligation === undefined) {
  //         obligation = await this._obligationService.findByObligation(
  //           liquidate.obligation_id,
  //           transactionSession,
  //         );
  //         changedObligationMap.set(obligation.obligation_id, obligation);
  //       }
  //       liquidate.obligation = obligation;
  //       await this._liquidateService.create(liquidate, transactionSession);
  //     }
  //     endTime = new Date().getTime();
  //     execTime = (endTime - startTime) / 1000;
  //     console.log(
  //       `[Liquidates]: update <${liquidates.length}>, <${execTime}> secs.`,
  //     );

  //     // Update obligations with collaterals and debts changed
  //     startTime = new Date().getTime();
  //     if (hasCollateralsChanged) {
  //       await this._obligationService.updateCollateralsInObligationMap(
  //         this._suiService,
  //         changedObligationMap,
  //         transactionSession,
  //       );
  //       hasCollateralsChanged = false;
  //     }
  //     endTime = new Date().getTime();
  //     execTime = (endTime - startTime) / 1000;
  //     console.log(
  //       `[Collaterals]: updateCollateralsInObligationMap, <${execTime}> secs.`,
  //     );

  //     startTime = new Date().getTime();
  //     if (hasDebtsChanged) {
  //       await this._obligationService.updateDebtsInObligationMap(
  //         this._suiService,
  //         changedObligationMap,
  //         transactionSession,
  //       );
  //       hasDebtsChanged = false;
  //     }
  //     endTime = new Date().getTime();
  //     execTime = (endTime - startTime) / 1000;
  //     console.log(`[Debts]: updateDebtsInObligationMap, <${execTime}> secs.`);

  //     // Update event states
  //     for (const eventState of changedEventStateMap.values()) {
  //       await this._eventStateService.findOneByEventTypeAndUpdateEventState(
  //         eventState.eventType,
  //         eventState,
  //         transactionSession,
  //       );
  //       console.log(
  //         `[EventState]: update <${eventState.eventType.split('::')[2]}>`,
  //       );
  //     }
  //     await transactionSession.commitTransaction();
  //   } catch (e) {
  //     await transactionSession.abortTransaction();
  //     console.error('Error caught while processLiqudatorRelatedEvents():', e);
  //   } finally {
  //     transactionSession.endSession();
  //   }
  // }

  async updateFlashloanRelatedEvents(): Promise<void> {
    try {
      // Get & update flashloan events
      const flashloanEventStateMap = new Map();
      const borrowFlashloans =
        await this._flashloanService.getBorrowFlashloansFromQueryEvent(
          this._suiService,
          flashloanEventStateMap,
        );

      const repayFlashloans =
        await this._flashloanService.getRepayFlashloansFromQueryEvent(
          this._suiService,
          flashloanEventStateMap,
        );

      const flashloanSession = await this.connection.startSession();
      flashloanSession.startTransaction();
      const startTime = new Date().getTime();
      try {
        // update borrow flashloans
        for (const borrowFlashloan of borrowFlashloans) {
          await this._flashloanService.create(
            borrowFlashloan,
            flashloanSession,
          );
        }

        // update repay flashloans
        for (const repayFlashloan of repayFlashloans) {
          await this._flashloanService.create(repayFlashloan, flashloanSession);
        }

        // Update event states
        for (const eventState of flashloanEventStateMap.values()) {
          await this._eventStateService.findOneByEventTypeAndUpdateEventState(
            eventState.eventType,
            eventState,
            flashloanSession,
          );
          console.log(
            `[EventState]: update <${eventState.eventType.split('::')[2]}>`,
          );
        }

        await flashloanSession.commitTransaction();
        const endTime = new Date().getTime();
        const execTime = (endTime - startTime) / 1000;
        console.log(
          `[FlashLoanEvent]: update Borrow<${borrowFlashloans.length}>, Repay<${repayFlashloans.length}>, <${execTime}> secs`,
        );
      } catch (e) {
        await flashloanSession.abortTransaction();
        console.error('Error caught while update Flashloan events:', e);
      } finally {
        flashloanSession.endSession();
      }
    } catch (err) {
      console.error('Error caught while updateFlashloanRelatedEvents():', err);
    }
  }

  async updateLendingRelatedEvents(): Promise<any[]> {
    try {
      // Get & update lending events
      const lendingEventStateMap = new Map();

      const mints = await this._mintService.getMintsFromQueryEvent(
        this._suiService,
        lendingEventStateMap,
      );

      const redeems = await this._redeemService.getRedeemsFromQueryEvent(
        this._suiService,
        lendingEventStateMap,
      );

      const lendingSession = await this.connection.startSession();
      lendingSession.startTransaction();

      try {
        // update mints
        let startTime = new Date().getTime();
        for (const mint of mints) {
          await this._mintService.create(mint, lendingSession);
        }
        let endTime = new Date().getTime();
        let execTime = (endTime - startTime) / 1000;
        console.log(
          `[MintEvent]: update <${mints.length}>, <${execTime}> secs`,
        );

        // update redeems
        startTime = new Date().getTime();
        for (const redeem of redeems) {
          await this._redeemService.create(redeem, lendingSession);
        }
        endTime = new Date().getTime();
        execTime = (endTime - startTime) / 1000;
        console.log(
          `[RedeemEvent]: update <${redeems.length}>, <${execTime}> secs`,
        );

        // Update event states
        for (const eventState of lendingEventStateMap.values()) {
          await this._eventStateService.findOneByEventTypeAndUpdateEventState(
            eventState.eventType,
            eventState,
            lendingSession,
          );
          console.log(
            `[EventState]: update <${eventState.eventType.split('::')[2]}>`,
          );
        }
        await lendingSession.commitTransaction();

        startTime = new Date().getTime();
        const mintSenders = [...new Set(mints.map((mint) => mint.sender))];
        const redeemSenders = [
          ...new Set(redeems.map((redeem) => redeem.sender)),
        ];
        const uniqueSenders = [...new Set([...mintSenders, ...redeemSenders])];
        return uniqueSenders;
        // console.log(`[UniqueSenders]: <${uniqueSenders.length}>`);
      } catch (e) {
        await lendingSession.abortTransaction();
        console.error('Error caught while update Lending events:', e);
      } finally {
        lendingSession.endSession();
      }
    } catch (err) {
      console.error('Error caught while updateLendingRelatedEvents():', err);
    }
  }

  async updateSupplies(uniqueSenders: any[]): Promise<void> {
    try {
      const updatingSession = await this.connection.startSession();
      try {
        const startTime = new Date().getTime();
        updatingSession.startTransaction();
        const updateSupplies = await this._statisticService.updateSupplyBalance(
          uniqueSenders,
          updatingSession,
        );
        await updatingSession.commitTransaction();

        const endTime = new Date().getTime();
        const execTime = (endTime - startTime) / 1000;
        console.log(
          `[Supply]: Unique<${uniqueSenders.length}>, Update <${updateSupplies.length}>, <${execTime}> secs`,
        );
      } catch (err) {
        console.error(`Error caught while updateSupplies() ${err}`);
        try {
          await updatingSession.abortTransaction();
        } catch (e) {
          console.error(
            `Error caught while updateSupplies->abortTransaction() ${e}`,
          );
        }
      } finally {
        updatingSession.endSession();
      }
    } catch (error) {
      console.error('Error caught while updateSupplies():', error);
    }
  }

  async loopQueryEvents(): Promise<void> {
    while (true) {
      const start = new Date().getTime();
      SuiService.resetQueryCount();

      // Get & update liquidator related events
      await this.updateLiqudatorRelatedEvents();

      // update borrow dynamics
      const marketId = await this._suiService.getMarketId();
      await this._borrowDynamicService.updateBorrowDynamics(
        this._suiService,
        marketId,
      );

      // Get & update flashloan events
      await this.updateFlashloanRelatedEvents();

      // Get & update lending events
      const uniqueSenders = await this.updateLendingRelatedEvents();
      await this.updateSupplies(uniqueSenders);

      // Get & update statistic & leaderboard (default 10 mins)
      await this._statisticService.updateMarketStatistic();

      const end = new Date().getTime();
      const execTime = (end - start) / 1000;
      console.log(
        `[<${new Date()}>]==== loopQueryEvents : <${execTime}> secs ====`,
      );

      // if (execTime < Number(process.env.QUERY_INTERVAL_SECONDS)) {
      //   await delay(
      //     (Number(process.env.QUERY_INTERVAL_SECONDS) - execTime) * 1000,
      //   );
      // }
    } //end while
  }
}
