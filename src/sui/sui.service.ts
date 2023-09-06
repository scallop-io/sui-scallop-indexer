import { PaginatedEvents } from '@mysten/sui.js';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SuiKit } from '@scallop-io/sui-kit';
import { ScallopClient } from '@scallop-io/sui-scallop-sdk';
import axios from 'axios';
import { ConfigInterface } from 'src/app.config';
import { BorrowDynamic } from 'src/borrow-dynamic/borrow-dynamic.schema';
import { delay } from 'src/utils/common';
import { EventState } from 'src/eventstate/eventstate.schema';
import { EventStateService } from 'src/eventstate/eventstate.service';
import { Collateral, Debt } from 'src/obligation/obligation.schema';

@Injectable()
export class SuiService {
  private readonly configNetwork: ConfigInterface['network'];
  private readonly configScallopApi: ConfigInterface['scallopApi'];
  private readonly configProgram: ConfigInterface['program'];
  private readonly configSui: ConfigInterface['sui'];

  private static _queryCount = 0;

  private _addresses = undefined;
  private _protocolId = undefined;
  private _marketId = undefined;

  // event id
  private _obligationCreatedEventId = undefined;
  private _collateralDepositEventId = undefined;
  private _collateralWithdrawEventId = undefined;
  private _borrowEventId = undefined;
  private _repayEventId = undefined;
  private _liquidateEventId = undefined;
  private _flashloanBorrowEventId = undefined;
  private _flashloanRepayEventId = undefined;

  private _mintEventId = undefined;
  private _redeemEventId = undefined;

  constructor(
    private configService: ConfigService<ConfigInterface>,
    private scallopClient: ScallopClient,
    private suiKit: SuiKit,
  ) {
    this.configNetwork = this.configService.get('network', { infer: true });
    this.configScallopApi = this.configService.get('scallopApi', {
      infer: true,
    });
    this.configProgram = this.configService.get('program', { infer: true });
    this.configSui = this.configService.get('sui', { infer: true });
  }

  private async fetchAddressesFromAPI() {
    let addresses = undefined;
    try {
      const response = await axios.get(
        this.configScallopApi.url +
          'addresses/' +
          this.configScallopApi.addressesId,
        {
          headers: {
            'api-key': this.configScallopApi.key,
          },
        },
      );
      addresses = response.data;

      console.log('[Addresses]: fetchAddressesFromAPI() success');
    } catch (e) {
      console.error('Error caught while fetchAddressesFromAPI() ', e);
    }
    return addresses;
  }

  private async getAddresses() {
    if (!this._addresses) {
      this._addresses = await this.fetchAddressesFromAPI();
    }
    return this._addresses;
  }

  public async getMarketId() {
    if (!this._marketId) {
      if (this.configProgram.marketId) {
        this._marketId = this.configProgram.marketId;
      } else {
        const address = await this.getAddresses();
        if (this._addresses) {
          this._marketId =
            address[this.configNetwork.cluster]['core']['market'];
        }
      }
      console.log(`[Market-Id]: ${this._marketId}`);
    }
    return this._marketId;
  }

  private async getProtocolIdFromAPI() {
    if (!this._protocolId) {
      if (this.configProgram.protocolId) {
        this._protocolId = this.configProgram.protocolId;
      } else {
        const address = await this.getAddresses();
        if (this._addresses) {
          this._protocolId =
            address[this.configNetwork.cluster]['core']['packages']['protocol'][
              'id'
            ];
        }
      }
      console.log(`[Protocol-Id]: ${this._protocolId}`);
    }
    return this._protocolId;
  }

  private async getProtocolId() {
    if (!this._protocolId) {
      if (this.configProgram.protocolId) {
        this._protocolId = this.configProgram.protocolId;
      } else {
        // set default protocol id to INIT_PROTOCOL_ID
        this._protocolId = this.configProgram.protocolObjectId;
      }
      console.log(`[Protocol-Id]: ${this._protocolId}`);
    }
    return this._protocolId;
  }

  public async getObligationCreatedEventId() {
    if (!this._obligationCreatedEventId) {
      const protocol = await this.getProtocolId();
      this._obligationCreatedEventId = `${protocol}::open_obligation::ObligationCreatedEvent`;
    }
    return this._obligationCreatedEventId;
  }

  public async getCollateralDepositEventId() {
    if (!this._collateralDepositEventId) {
      const protocol = await this.getProtocolId();
      this._collateralDepositEventId = `${protocol}::deposit_collateral::CollateralDepositEvent`;
    }
    return this._collateralDepositEventId;
  }

  public async getCollateralWithdrawEventId() {
    if (!this._collateralWithdrawEventId) {
      const protocol = await this.getProtocolId();
      this._collateralWithdrawEventId = `${protocol}::withdraw_collateral::CollateralWithdrawEvent`;
    }
    return this._collateralWithdrawEventId;
  }

  public async getBorrowEventId() {
    if (!this._borrowEventId) {
      const protocol = await this.getProtocolId();
      this._borrowEventId = `${protocol}::borrow::BorrowEvent`;
    }
    return this._borrowEventId;
  }

  public async getRepayEventId() {
    if (!this._repayEventId) {
      const protocol = await this.getProtocolId();
      this._repayEventId = `${protocol}::repay::RepayEvent`;
    }
    return this._repayEventId;
  }

  public async getLiquidateEventId() {
    if (!this._liquidateEventId) {
      const protocol = await this.getProtocolId();
      this._liquidateEventId = `${protocol}::liquidate::LiquidateEvent`;
    }
    return this._liquidateEventId;
  }

  public async getFlashloanBorrowEventId() {
    if (!this._flashloanBorrowEventId) {
      const protocol = await this.getProtocolId();
      this._flashloanBorrowEventId = `${protocol}::flash_loan::BorrowFlashLoanEvent`;
    }
    return this._flashloanBorrowEventId;
  }

  public async getFlashloanRepayEventId() {
    if (!this._flashloanRepayEventId) {
      const protocol = await this.getProtocolId();
      this._flashloanRepayEventId = `${protocol}::flash_loan::RepayFlashLoanEvent`;
    }
    return this._flashloanRepayEventId;
  }

  public async getMintEventId() {
    if (!this._mintEventId) {
      const protocol = await this.getProtocolId();
      this._mintEventId = `${protocol}::mint::MintEvent`;
    }
    return this._mintEventId;
  }

  public async getRedeemEventId() {
    if (!this._redeemEventId) {
      const protocol = await this.getProtocolId();
      this._redeemEventId = `${protocol}::redeem::RedeemEvent`;
    }
    return this._redeemEventId;
  }

  @Inject(EventStateService)
  private readonly _eventStateService: EventStateService;

  static resetQueryCount() {
    SuiService._queryCount = 0;
  }

  async checkRPCLimit() {
    SuiService._queryCount++;
    if (SuiService._queryCount >= this.configNetwork.qps) {
      // Delay 1 sec to avoid query limit
      console.debug(`Delay ${this.configNetwork.ds} sec to avoid query limit`);
      await delay(this.configNetwork.ds * 1000);
      SuiService._queryCount = 0;
    }
  }

  async getCollaterals(parentId: string): Promise<Collateral[]> {
    const collaterals: Collateral[] = [];
    try {
      const dynamicFields = await this.suiKit
        .provider()
        .getDynamicFields({ parentId: parentId });
      await this.checkRPCLimit();
      for (const item of dynamicFields.data) {
        const fieldObjs = await this.suiKit.provider().getDynamicFieldObject({
          parentId: parentId,
          name: {
            type: item.name.type,
            value: item.name.value,
          },
        });
        await this.checkRPCLimit();

        let amount = '';
        if ('fields' in fieldObjs.data.content) {
          amount = fieldObjs.data.content.fields.value.fields.amount;
        }

        const collateral = {
          asset: item.name.value.name,
          amount: amount,
        } as Collateral;
        collaterals.push(collateral);
      }
    } catch (e) {
      console.error('Error caught while getCollaterals():', e);
      throw e;
    }
    return collaterals;
  }

  async getDebts(parentId: string): Promise<Debt[]> {
    const debts: Debt[] = [];
    try {
      const dynamicFields = await this.suiKit
        .provider()
        .getDynamicFields({ parentId: parentId });
      await this.checkRPCLimit();
      for (const item of dynamicFields.data) {
        const fieldObjs = await this.suiKit.provider().getDynamicFieldObject({
          parentId: parentId,
          name: {
            type: item.name.type,
            value: item.name.value,
          },
        });
        await this.checkRPCLimit();

        let amount = '';
        let borrowIdx = '';
        if ('fields' in fieldObjs.data.content) {
          amount = fieldObjs.data.content.fields.value.fields.amount;
          borrowIdx = fieldObjs.data.content.fields.value.fields.borrow_index;
        }
        const debt = {
          asset: item.name.value.name,
          amount: amount,
          borrowIndex: borrowIdx,
        } as Debt;

        debts.push(debt);
      }
    } catch (e) {
      console.error('Error caught while getDebts():', e);
      throw e;
    }
    return debts;
  }

  async getBorrowDynamics(market: string): Promise<Map<string, BorrowDynamic>> {
    const borrowDynamics = new Map<string, BorrowDynamic>();
    try {
      const objs = await this.suiKit.getObjects([market]);
      await this.checkRPCLimit();
      const marketObj = objs[0];
      for (const content of marketObj.objectFields.borrow_dynamics.fields.keys
        .fields.contents) {
        const dynamicObjects = await this.suiKit
          .provider()
          .getDynamicFieldObject({
            parentId:
              marketObj.objectFields.borrow_dynamics.fields.table.fields.id.id,
            name: {
              type: '0x1::type_name::TypeName',
              value: content.fields.name,
            },
          });
        await this.checkRPCLimit();

        if ('fields' in dynamicObjects.data.content) {
          borrowDynamics.set(content.fields.name, {
            coinType: content.fields.name,
            borrowIndex:
              dynamicObjects.data.content.fields.value.fields.borrow_index,
            interestRateScale:
              dynamicObjects.data.content.fields.value.fields
                .interest_rate_scale,
            interestRate:
              dynamicObjects.data.content.fields.value.fields.interest_rate
                .fields.value,
            lastUpdated:
              dynamicObjects.data.content.fields.value.fields.last_updated,
          });
        }
      }
    } catch (e) {
      console.error('Error caught while getBorrowDynamics():', e);
      throw e;
    }
    return borrowDynamics;
  }

  async getEventsFromQueryByPages(
    eventType: string,
    eventStateMap: Map<string, EventState>,
    createCallback: (item: any) => Promise<any>,
    pageLimit = this.configSui.pageLimit,
  ): Promise<[any[], boolean]> {
    let hasNextPage = true;
    const eventObjects = [];
    const eventName = eventType.split('::')[2];
    try {
      const startTime = new Date().getTime();
      // Find if there is cursor stored in DB
      const eventState = await this._eventStateService.findByEventType(
        eventType,
      );

      let cursorTxDigest = undefined;
      let cursorEventSeq = undefined;
      if (eventState !== null) {
        cursorTxDigest = eventState.nextCursorTxDigest;
        cursorEventSeq = eventState.nextCursorEventSeq;
      }

      let latestEvent: PaginatedEvents;
      const eventData = [];
      let pageCount = 0;
      while (hasNextPage) {
        if (cursorTxDigest === undefined || cursorEventSeq === undefined) {
          latestEvent = await this.suiKit.provider().queryEvents({
            query: {
              MoveEventType: eventType,
            },
            limit: this.configSui.queryLimit,
            order: 'ascending',
          });
          console.debug(`[${eventName}]: query from <start>.`);
        } else {
          latestEvent = await this.suiKit.provider().queryEvents({
            query: {
              MoveEventType: eventType,
            },
            cursor: {
              txDigest: cursorTxDigest,
              eventSeq: cursorEventSeq,
            },
            limit: this.configSui.queryLimit,
            order: 'ascending',
          });
          console.debug(
            `[${eventName}]: query from cursor <${cursorTxDigest}>, seq<${cursorEventSeq}>`,
          );
        }
        await this.checkRPCLimit();

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

        pageCount++;
        if (pageCount >= pageLimit) {
          break;
        }
      } //end of while

      // Prase data
      for (const item of eventData) {
        const newEvent = await createCallback(item);
        eventObjects.push(newEvent);
        // console.log(`[${eventName}]: create <${newEvent.obligation_id}>`);
      }

      const endTime = new Date().getTime();
      const execTime = (endTime - startTime) / 1000;

      // Check parse data number match
      if (eventObjects.length === eventData.length) {
        console.log(
          `[${eventName}]: create <${eventObjects.length}> events, <${execTime}> sec.`,
        );

        // Save Next Cursor data
        if (eventObjects.length > 0) {
          const lastEventState: EventState = {
            eventType: eventType,
            nextCursorTxDigest: latestEvent.nextCursor.txDigest,
            nextCursorEventSeq: latestEvent.nextCursor.eventSeq,
          };
          eventStateMap.set(eventType, lastEventState);
        }
      } else {
        eventObjects.length = 0;
        hasNextPage = true;
        console.error(
          `[${eventName}]: Parse <${eventObjects.length}> events didn't match, <${execTime}> sec.`,
        );
      }
    } catch (err) {
      await delay(this.configNetwork.ds * 1000);
      console.error(
        `Delay ${this.configNetwork.ds} sec when error caught at getEventsFromQueryByPages() for ${eventName}: ${err}`,
      );
    }
    return [eventObjects, hasNextPage];
  }

  async getEventsFromQuery(
    eventType: string,
    eventStateMap: Map<string, EventState>,
    createCallback: (item: any) => Promise<any>,
    pageLimit = this.configSui.pageLimit,
  ): Promise<any[]> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [eventObjects, hasNextPage] = await this.getEventsFromQueryByPages(
      eventType,
      eventStateMap,
      createCallback,
      pageLimit,
    );
    return eventObjects;
  }

  // async getObligationVersion(obligation_id: string): Promise<string> {
  //   const obj = await this.suiKit
  //     .provider()
  //     .getObject({
  //       id: obligation_id,
  //       options: {
  //         showContent: true,
  //         showBcs: true,
  //         showOwner: true,
  //       },
  //     });
  //   await this.checkRPCLimit();
  //   // console.log(obj.data.owner);
  //   const version = obj.data.owner['Shared']['initial_shared_version'];

  //   return version;
  // }

  // Set multiple obligation version and parent ids
  async setObligationVersionAndParentIds(obligationsMap: Map<string, any>) {
    try {
      const keys = [...obligationsMap.keys()];
      while (keys.length) {
        // Get the first batch(50 keys), and update 'keys' to contain the remaining keys
        const currentBatchOfKeys = keys.splice(
          0,
          Math.min(this.configSui.queryLimit, keys.length),
        );

        const obligationObjs = await this.suiKit.getObjects(currentBatchOfKeys);
        await this.checkRPCLimit();
        for (const obj of obligationObjs) {
          if (obligationsMap.has(obj.objectId)) {
            // set obligation version
            obligationsMap.get(obj.objectId).version =
              obj.objectVersion.toString();
            // set collaterals parent id
            obligationsMap.get(obj.objectId).collaterals_parent_id =
              obj.objectFields['collaterals'].fields.table.fields.id.id;
            // set debts parent id
            obligationsMap.get(obj.objectId).debts_parent_id =
              obj.objectFields['debts'].fields.table.fields.id.id;
          }
        }
      } //end while
    } catch (e) {
      console.error(
        'Error caught while setObligationVersionAndParentIds():',
        e,
      );
      throw e;
    }
  }

  async getSuiName(address: string): Promise<string> {
    let suiName = address;
    try {
      // get default suiNS
      const suiNameObj = await this.suiKit.provider().resolveNameServiceNames({
        address: address,
      });

      if (suiNameObj.data.length > 0) {
        suiName = suiNameObj.data[0];
      } else {
        let packageId =
          '0xd22b24490e0bae52676651b4f56660a5ff8022a2576e0089f79b3c88d44e08f0';
        if (this.configNetwork.cluster === 'testnet') {
          packageId =
            '0x701b8ca1c40f11288a1ed2de0a9a2713e972524fbab748a7e6c137225361653f';
        }
        const suinsRegistration = await this.suiKit.provider().getOwnedObjects({
          owner: address,
          filter: {
            StructType: packageId + '::suins_registration::SuinsRegistration',
          },
          options: {
            showContent: true,
            showDisplay: true,
          },
        });
        if (suinsRegistration.data.length > 0) {
          // set 1st suiNS as default
          suiName = suinsRegistration.data[0].data.display.data['name'];
        }
      }
    } catch (e) {
      console.error('Error caught while getSuiName():', e);
      // throw e;
    }

    return suiName;
  }
}
