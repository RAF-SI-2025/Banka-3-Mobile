/**
 * FEATURE HOOKS (ViewModels)
 * Each hook manages state for one feature using useReducer.
 * Screens call these hooks and get { state, actions }.
 */

import { useReducer, useCallback, useEffect } from 'react';
import { container } from '../../core/di/container';
import { Account, Transaction, VerificationRequest, Card, Loan, ExchangeRate, PaymentRecipient, AccountLimitUpdate, LoanRequest } from '../types/models';

// ═══════════════════════════════════════════════════════
// Generic async state helper
// ═══════════════════════════════════════════════════════
interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function asyncReducer<T>(state: AsyncState<T>, action: 
  | { type: 'LOADING' }
  | { type: 'SUCCESS'; data: T }
  | { type: 'ERROR'; error: string }
  | { type: 'UPDATE'; data: T }
): AsyncState<T> {
  switch (action.type) {
    case 'LOADING': return { ...state, loading: true, error: null };
    case 'SUCCESS': return { data: action.data, loading: false, error: null };
    case 'ERROR': return { ...state, loading: false, error: action.error };
    case 'UPDATE': return { ...state, data: action.data };
    default: return state;
  }
}

const initialAsync = <T,>(): AsyncState<T> => ({ data: null, loading: false, error: null });

// ═══════════════════════════════════════════════════════
// useAccounts
// ═══════════════════════════════════════════════════════
export function useAccounts() {
  const [state, dispatch] = useReducer(asyncReducer<Account[]>, initialAsync<Account[]>());
  const repo = container.accountRepository;

  const fetch = useCallback(async () => {
    dispatch({ type: 'LOADING' });
    try {
      const data = await repo.getAccounts();
      dispatch({ type: 'SUCCESS', data });
    } catch (e: any) { dispatch({ type: 'ERROR', error: e.message }); }
  }, [repo]);

  const renameAccount = useCallback(async (accountNumber: string, name: string) => {
    await repo.updateAccountName(accountNumber, name);
    fetch();
  }, [repo, fetch]);

  const updateAccountLimits = useCallback(async (accountNumber: string, updates: AccountLimitUpdate) => {
    await repo.updateAccountLimits(accountNumber, updates);
    fetch();
  }, [repo, fetch]);

  useEffect(() => { fetch(); }, [fetch]);

  return { state, refresh: fetch, actions: { renameAccount, updateAccountLimits, refresh: fetch } };
}

export function useTransactions(accountId: number) {
  const [state, dispatch] = useReducer(asyncReducer<Transaction[]>, initialAsync<Transaction[]>());
  const repo = container.accountRepository;

  const fetch = useCallback(async () => {
    dispatch({ type: 'LOADING' });
    try {
      const data = await repo.getTransactions(accountId);
      dispatch({ type: 'SUCCESS', data });
    } catch (e: any) { dispatch({ type: 'ERROR', error: e.message }); }
  }, [repo, accountId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { state, refresh: fetch };
}

// ═══════════════════════════════════════════════════════
// useVerification
// ═══════════════════════════════════════════════════════
export function useVerification() {
  const [historyState, historyDispatch] = useReducer(asyncReducer<VerificationRequest[]>, initialAsync<VerificationRequest[]>());
  const [pendingState, pendingDispatch] = useReducer(asyncReducer<VerificationRequest | null>, initialAsync<VerificationRequest | null>());
  const repo = container.verificationRepository;

  const fetchHistory = useCallback(async () => {
    historyDispatch({ type: 'LOADING' });
    try {
      const data = await repo.getHistory();
      historyDispatch({ type: 'SUCCESS', data });
    } catch (e: any) { historyDispatch({ type: 'ERROR', error: e.message }); }
  }, [repo]);

  const fetchPending = useCallback(async () => {
    pendingDispatch({ type: 'LOADING' });
    try {
      const data = await repo.getPending();
      pendingDispatch({ type: 'SUCCESS', data });
    } catch (e: any) { pendingDispatch({ type: 'ERROR', error: e.message }); }
  }, [repo]);

  const confirm = useCallback(async (id: number) => {
    await repo.confirm(id);
    pendingDispatch({ type: 'SUCCESS', data: null });
    fetchPending();
    fetchHistory();
  }, [repo, fetchHistory, fetchPending]);

  const reject = useCallback(async (id: number) => {
    await repo.reject(id);
    pendingDispatch({ type: 'SUCCESS', data: null });
    fetchPending();
    fetchHistory();
  }, [repo, fetchHistory, fetchPending]);

  useEffect(() => { fetchHistory(); fetchPending(); }, [fetchHistory, fetchPending]);

  return { history: historyState, pending: pendingState, actions: { confirm, reject, fetchPending, fetchHistory } };
}

// ═══════════════════════════════════════════════════════
// useCards
// ═══════════════════════════════════════════════════════
export function useCards() {
  const [state, dispatch] = useReducer(asyncReducer<Card[]>, initialAsync<Card[]>());
  const repo = container.cardRepository;

  const fetch = useCallback(async () => {
    dispatch({ type: 'LOADING' });
    try {
      const data = await repo.getCards();
      dispatch({ type: 'SUCCESS', data });
    } catch (e: any) { dispatch({ type: 'ERROR', error: e.message }); }
  }, [repo]);

  const blockCard = useCallback(async (cardNumber: string) => {
    await repo.blockCard(cardNumber);
    fetch();
  }, [repo, fetch]);

  const requestCard = useCallback(async (request: Parameters<typeof repo.requestCard>[0]) => {
    const result = await repo.requestCard(request);
    fetch();
    return result;
  }, [repo, fetch]);

  const confirmCard = useCallback(async (token: string) => {
    await repo.confirmCard(token);
    fetch();
  }, [repo, fetch]);

  useEffect(() => { fetch(); }, [fetch]);

  return { state, actions: { blockCard, requestCard, confirmCard, refresh: fetch } };
}

// ═══════════════════════════════════════════════════════
// useLoans
// ═══════════════════════════════════════════════════════
export function useLoans() {
  const [state, dispatch] = useReducer(asyncReducer<Loan[]>, initialAsync<Loan[]>());
  const repo = container.loanRepository;

  const fetch = useCallback(async () => {
    dispatch({ type: 'LOADING' });
    try {
      const data = await repo.getLoans();
      dispatch({ type: 'SUCCESS', data });
    } catch (e: any) { dispatch({ type: 'ERROR', error: e.message }); }
  }, [repo]);

  const apply = useCallback(async (application: Parameters<typeof repo.applyForLoan>[0]) => {
    return repo.applyForLoan(application);
  }, [repo]);

  useEffect(() => { fetch(); }, [fetch]);

  return { state, actions: { apply, refresh: fetch } };
}

// ═══════════════════════════════════════════════════════
// useLoanRequests
// ═══════════════════════════════════════════════════════
export function useLoanRequests() {
  const [state, dispatch] = useReducer(asyncReducer<LoanRequest[]>, initialAsync<LoanRequest[]>());
  const repo = container.loanRepository;

  const fetch = useCallback(async () => {
    dispatch({ type: 'LOADING' });
    try {
      const data = await repo.getLoanRequests();
      dispatch({ type: 'SUCCESS', data });
    } catch (e: any) { dispatch({ type: 'ERROR', error: e.message }); }
  }, [repo]);

  const approve = useCallback(async (id: number) => {
    await repo.approveLoanRequest(id);
    fetch();
  }, [repo, fetch]);

  const reject = useCallback(async (id: number) => {
    await repo.rejectLoanRequest(id);
    fetch();
  }, [repo, fetch]);

  useEffect(() => { fetch(); }, [fetch]);

  return { state, actions: { approve, reject, refresh: fetch } };
}

// ═══════════════════════════════════════════════════════
// useExchangeRates
// ═══════════════════════════════════════════════════════
export function useExchangeRates() {
  const [state, dispatch] = useReducer(asyncReducer<ExchangeRate[]>, initialAsync<ExchangeRate[]>());
  const repo = container.exchangeRepository;

  const fetch = useCallback(async () => {
    dispatch({ type: 'LOADING' });
    try {
      const data = await repo.getRates();
      dispatch({ type: 'SUCCESS', data });
    } catch (e: any) { dispatch({ type: 'ERROR', error: e.message }); }
  }, [repo]);

  useEffect(() => { fetch(); }, [fetch]);

  return { state, refresh: fetch };
}

// ═══════════════════════════════════════════════════════
// useRecipients
// ═══════════════════════════════════════════════════════
export function useRecipients() {
  const [state, dispatch] = useReducer(asyncReducer<PaymentRecipient[]>, initialAsync<PaymentRecipient[]>());
  const repo = container.paymentRepository;

  const fetch = useCallback(async () => {
    dispatch({ type: 'LOADING' });
    try {
      const data = await repo.getRecipients();
      dispatch({ type: 'SUCCESS', data });
    } catch (e: any) { dispatch({ type: 'ERROR', error: e.message }); }
  }, [repo]);

  const add = useCallback(async (name: string, account: string) => {
    await repo.addRecipient(name, account);
    fetch();
  }, [repo, fetch]);

  const update = useCallback(async (id: number, name: string, account: string) => {
    await repo.updateRecipient(id, name, account);
    fetch();
  }, [repo, fetch]);

  const remove = useCallback(async (id: number) => {
    await repo.deleteRecipient(id);
    fetch();
  }, [repo, fetch]);

  useEffect(() => { fetch(); }, [fetch]);

  return { state, actions: { add, update, remove, refresh: fetch } };
}

// ═══════════════════════════════════════════════════════
// usePaymentHistory
// ═══════════════════════════════════════════════════════
export function usePaymentHistory() {
  const [state, dispatch] = useReducer(asyncReducer<Transaction[]>, initialAsync<Transaction[]>());
  const repo = container.paymentRepository;

  const fetch = useCallback(async () => {
    dispatch({ type: 'LOADING' });
    try {
      const data = await repo.getPaymentHistory();
      dispatch({ type: 'SUCCESS', data });
    } catch (e: any) { dispatch({ type: 'ERROR', error: e.message }); }
  }, [repo]);

  useEffect(() => { fetch(); }, [fetch]);

  return { state, refresh: fetch };
}
