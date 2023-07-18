import { Inject, Injectable } from '@nestjs/common';
import { delay } from './common/utils/time';
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

  constructor(
    @InjectConnection() private readonly connection: mongoose.Connection,
  ) {}

  async updateLiqudatorRelatedEvents(
    hasCollateralsChanged = false,
    hasDebtsChanged = false,
  ): Promise<void> {
    const changedEventStateMap = new Map();

    const obligations =
      await this._obligationService.getObligationsFromQueryEvent(
        this._suiService,
        changedEventStateMap,
      );
    if (obligations.length > 0) {
      hasCollateralsChanged = true;
      hasDebtsChanged = true;
    }

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

    const liquidates = await this._liquidateService.getLiquidatesFromQueryEvent(
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
      // update obligations
      const changedObligationMap = new Map();
      for (const obligation of obligations) {
        const updatedObligation =
          await this._obligationService.findOneAndUpdateObligation(
            obligation.obligation_id,
            obligation,
            transactionSession,
          );
        changedObligationMap.set(
          updatedObligation.obligation_id,
          updatedObligation,
        );
        // console.debug(`[Obligations]: update <${obligation.obligation_id}>`);
      }
      console.log(`[Obligations]: update <${obligations.length}> enents`);

      // update deposits
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
      console.log(`[Deposits]: update <${deposits.length}>`);

      // update withdraws
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
      console.log(`[Withdraws]: update <${withdraws.length}>`);

      // update borrows
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
      console.log(`[Borrows]: update <${borrows.length}>`);

      // update repays
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
      console.log(`[Repays]: update <${repays.length}>`);

      // update liquidates
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
      console.log(`[Liquidates]: update <${liquidates.length}>`);

      // Update obligations with collaterals and debts changed
      if (hasCollateralsChanged) {
        await this._obligationService.updateCollateralsInObligationMap(
          this._suiService,
          changedObligationMap,
          transactionSession,
        );
        hasCollateralsChanged = false;
      }

      if (hasDebtsChanged) {
        await this._obligationService.updateDebtsInObligationMap(
          this._suiService,
          changedObligationMap,
          transactionSession,
        );
        hasDebtsChanged = false;
      }

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
  }

  async updateFlashloanRelatedEvents(): Promise<void> {
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
    try {
      // update borrow flashloans
      for (const borrowFlashloan of borrowFlashloans) {
        await this._flashloanService.create(borrowFlashloan, flashloanSession);
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
      console.log(
        `[BorrowFlashLoanEvent]: update <${borrowFlashloans.length}>`,
      );
      console.log(`[RepayFlashLoanEvent]: update <${repayFlashloans.length}>`);
    } catch (e) {
      await flashloanSession.abortTransaction();
      console.error('Error caught while update Flashloan events:', e);
    } finally {
      flashloanSession.endSession();
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

      // Get & update leaderboard
      await this._statisticService.updateLatestLeaderboard();

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
