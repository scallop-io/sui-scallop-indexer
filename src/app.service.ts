import { Inject, Injectable } from '@nestjs/common';
import { delay } from './common/utils/time';
import { ObligationService } from './obligation/obligation.service';
import { DepositService } from './deposit/deposit.service';
import { SuiService } from './sui/sui.service';
import { WithdrawService } from './withdraw/withdraw.service';
import { BorrowService } from './borrow/borrow.service';
import { RepayService } from './repay/repay.service';
import { CollateralService } from './collateral/collateral.service';
import { DebtService } from './debt/debt.service';

@Injectable()
export class AppService {
  @Inject(SuiService)
  private readonly _suiService: SuiService;

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

  @Inject(CollateralService)
  private readonly _collateralService: CollateralService;

  @Inject(DebtService)
  private readonly _debtService: DebtService;

  async loopQueryEvents(): Promise<void> {
    let hasCollateralsChanged = false;
    let hasDebtsChanged = false;
    while (true) {
      const start = new Date().getTime();

      const changedObligationMap = new Map();
      const obligationData =
        await this._obligationService.updateObligationsFromEventData(
          this._suiService,
          changedObligationMap,
        );
      if (obligationData.length > 0) {
        hasCollateralsChanged = true;
        hasDebtsChanged = true;
      }
      console.log(`changedObligationMap.size[${changedObligationMap.size}].`);

      const depositData =
        await this._depositService.updateDepositsFromEventData(
          this._suiService,
          this._obligationService,
          changedObligationMap,
        );
      if (depositData.length > 0) {
        hasCollateralsChanged = true;
      }
      console.log(`depositData.length[${depositData.length}].`);

      const withdrawData =
        await this._withdrawService.updateWithdrawsFromEventData(
          this._suiService,
          this._obligationService,
          changedObligationMap,
        );
      if (withdrawData.length > 0) {
        hasCollateralsChanged = true;
      }
      console.log(`withdrawData.length[${withdrawData.length}].`);

      const borrowData = await this._borrowService.updateBorrowsFromEventData(
        this._suiService,
        this._obligationService,
        changedObligationMap,
      );
      if (borrowData.length > 0) {
        hasDebtsChanged = true;
      }
      console.log(`borrowData.length[${borrowData.length}].`);

      const repayData = await this._repayService.updateRepaysFromEventData(
        this._suiService,
        this._obligationService,
        changedObligationMap,
      );
      if (repayData.length > 0) {
        hasDebtsChanged = true;
      }
      console.log(`repayData.length[${repayData.length}].`);

      if (hasCollateralsChanged) {
        await this._collateralService.updateCollateralsFromObligationMap(
          this._suiService,
          changedObligationMap,
        );
        hasCollateralsChanged = false;
      }
      if (hasDebtsChanged) {
        await this._debtService.updateDebtsFromObligationMap(
          this._suiService,
          changedObligationMap,
        );
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
    } //end while
  }
}
