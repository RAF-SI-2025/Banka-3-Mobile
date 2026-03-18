import { useReducer, useCallback, useMemo } from 'react';
import { Client } from '../../../shared/types/models';
import { container } from '../../../core/di/container';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: Client | null;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
  error: null,
};

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; user: Client }
  | { type: 'LOGIN_ERROR'; error: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true, error: null };
    case 'LOGIN_SUCCESS':
      return { isAuthenticated: true, isLoading: false, user: action.user, error: null };
    case 'LOGIN_ERROR':
      return { ...state, isLoading: false, error: action.error };
    case 'LOGOUT':
      return initialState;
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

export function useAuthViewModel() {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const repo = container.authRepository;

  const login = useCallback(async (email: string, password: string) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const result = await repo.login({ email, password });
      dispatch({ type: 'LOGIN_SUCCESS', user: result.user });
      return true;
    } catch (err: any) {
      dispatch({ type: 'LOGIN_ERROR', error: err.message || 'Greška pri prijavi' });
      return false;
    }
  }, [repo]);

  const logout = useCallback(async () => {
    await repo.logout();
    container.reset();
    dispatch({ type: 'LOGOUT' });
  }, [repo]);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  return useMemo(() => ({
    state,
    actions: { login, logout, clearError },
  }), [state, login, logout, clearError]);
}
