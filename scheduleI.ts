import { test, expect } from '@playwright/test';
import { RequestBuilder } from '../builders/requestBuilder';
import { ApiHelper } from '../helpers/apiHelper';
import { TokenHelper } from '../helpers/tokenHelper';
import { Logger } from '../helpers/logger';
import { EnvManager } from '../utils/envManager';
import { Utility } from '../utils/utility';
import { JsonPath } from '../data/JsonPath';

let accessToken: string;
let baseURL = EnvManager.getBaseURL();
let persona = 'gbodade';
let state = `.auth/${persona}_${process.env.ENV}.json`;

let clientId: number;
let projectId: number;
let taxFormId: number;
let scenarioVersionId: number;
let fgId: number[];
let entityId: number[];

let grossIncome_SubF: any;
let effectivelyIncome_SubF: any;
let subpartIncome_SubF: any;

test.describe('Schedule I-1 Data Validation Suite', () => {
  test.beforeAll(async () => {
    accessToken = await TokenHelper.getAccessToken(state);
    expect(accessToken).toBeTruthy();

    switch (process.env.ENV) {
      case 'GRC':
        clientId = 528;
        projectId = 8068;
        taxFormId = 8068;
        scenarioVersionId = 8068;
        fgId = [105005];
        entityId = [147873];
        break;
      case 'GQA':
        clientId = 30313;
        projectId = 20413;
        taxFormId = 218;
        scenarioVersionId = 17229;
        fgId = [122384];
        entityId = [148039];
        break;
    }
  });

  test('POST - GetCfcSourcingPostSub', async () => {
    const queryParams = `clientId=${clientId}&projectId=${projectId}&scenarioVersionId=${scenarioVersionId}&taxFormId=${taxFormId}&nocache=${Date.now()}`;
    const payload = {
      globalFilter: {
        fgId,
        entityId,
        selections: {
          entityId,
          fgId
        }
      },
      isCFCView: true
    };

    const builder = new RequestBuilder()
      .withMethod('POST')
      .withURL(`/workpapers/International/api/CFCPostSub/GetCfcSourcingPostSub?${queryParams}`)
      .withToken(accessToken)
      .withPayload(payload);

    const response = await ApiHelper.sendRequest(baseURL, builder);
    expect(response.status()).toBe(200);
    Logger.logResponse('/GetCfcSourcingPostSub', response);

    const responseBody = await response.json();

    grossIncome_SubF = await Utility.extractValueFromPath(responseBody, JsonPath.gIncome_SubF);
    effectivelyIncome_SubF = await Utility.extractValueFromPath(responseBody, JsonPath.eIncome_SubF);
    subpartIncome_SubF = await Utility.extractValueFromPath(responseBody, JsonPath.sIncome_SubF);

    // Divide all values by 2 for comparison
    grossIncome_SubF = Utility.mathValue('divide-by-2', grossIncome_SubF);
    effectivelyIncome_SubF = Utility.mathValue('divide-by-2', effectivelyIncome_SubF);
    subpartIncome_SubF = Utility.mathValue('divide-by-2', subpartIncome_SubF);
  });

  test('POST - GetScheduleI1', async () => {
    const queryParams = `clientId=${clientId}&projectId=${projectId}&scenarioVersionId=${scenarioVersionId}&taxFormId=${taxFormId}&nocache=${Date.now()}`;
    const payload = {
      entityId,
      fgId,
      ftId: [-1]
    };

    const builder = new RequestBuilder()
      .withMethod('POST')
      .withURL(`/workpapers/International/api/Form5471/GetScheduleI1?${queryParams}`)
      .withToken(accessToken)
      .withPayload(payload);

    const response = await ApiHelper.sendRequest(baseURL, builder);
    expect(response.status()).toBe(200);
    Logger.logResponse('/GetScheduleI1', response);

    const responseBody = await response.json();

    const grossIncome_scheI1 = await Utility.extractValueFromPath(responseBody, JsonPath.gIncome_scheI1);
    const subPartIncome_scheI1 = await Utility.extractValueFromPath(responseBody, JsonPath.sIncome_scheI1);
    const testedIncome_scheI1 = await Utility.extractValueFromPath(responseBody, JsonPath.tIncome_scheI1);

    Utility.expectedValues(grossIncome_scheI1, grossIncome_scheI1, 'value matched GrossIncome');
    Utility.expectedValues(subPartIncome_scheI1, effectivelyIncome_SubF, 'value matched SubPartIncome');
    Utility.expectedValues(testedIncome_scheI1, subpartIncome_SubF, 'value matched TestedIncome');
  });
});
