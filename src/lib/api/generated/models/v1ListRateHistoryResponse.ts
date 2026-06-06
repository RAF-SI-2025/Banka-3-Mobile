/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { bankaExchangeV1Currency } from './bankaExchangeV1Currency';
import type { v1RateHistoryPoint } from './v1RateHistoryPoint';
export type v1ListRateHistoryResponse = {
    from?: bankaExchangeV1Currency;
    to?: bankaExchangeV1Currency;
    /**
     * points are ordered newest first.
     */
    points?: Array<v1RateHistoryPoint>;
};

