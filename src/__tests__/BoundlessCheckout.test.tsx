import React from 'react';
import {render} from '@testing-library/react';
import {setBasicProps, showCheckout} from '../redux/reducers/app';

jest.mock('body-scroll-lock', () => ({
  disableBodyScroll: jest.fn(),
  clearAllBodyScrollLocks: jest.fn(),
}));

jest.mock('../redux/store', () => ({
  store: {
    dispatch: jest.fn(),
    getState: () => ({app: {show: true}}),
    subscribe: jest.fn(() => jest.fn()),
  },
}));

jest.mock('react-redux', () => ({
  Provider: ({children}: {children: React.ReactNode}) => <>{children}</>,
  useSelector: jest.fn((selector: any) => selector({app: {show: true}})),
}));

jest.mock('../StepRenderer', () => () => <div data-testid="step-renderer" />);

const mockQueryClientConstructor = jest.fn();
jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    QueryClient: jest.fn().mockImplementation((...args: any[]) => {
      mockQueryClientConstructor(...args);
      return new actual.QueryClient(...args);
    }),
    QueryClientProvider: actual.QueryClientProvider,
  };
});

import BoundlessCheckout from '../BoundlessCheckout';

const bodyScrollLock = jest.requireMock('body-scroll-lock') as {
  disableBodyScroll: jest.Mock;
  clearAllBodyScrollLocks: jest.Mock;
};
const mockStore = jest.requireMock('../redux/store').store as {
  dispatch: jest.Mock;
};

const defaultProps = {
  onHide: jest.fn(),
  onThankYouPage: jest.fn(),
};

describe('BoundlessCheckout', () => {
  beforeEach(() => {
    mockStore.dispatch.mockClear();
    bodyScrollLock.disableBodyScroll.mockClear();
    bodyScrollLock.clearAllBodyScrollLocks.mockClear();
  });

  test('appends a portal div to document.body on mount', () => {
    const childrenBefore = document.body.children.length;
    const {unmount} = render(<BoundlessCheckout {...defaultProps} />);
    expect(document.body.children.length).toBeGreaterThan(childrenBefore);
    unmount();
  });

  test('removes the portal div from document.body on unmount', () => {
    const {unmount} = render(<BoundlessCheckout {...defaultProps} />);
    const childrenAfterMount = document.body.children.length;
    unmount();
    expect(document.body.children.length).toBeLessThan(childrenAfterMount);
  });

  test('calls disableBodyScroll on mount', () => {
    const {unmount} = render(<BoundlessCheckout {...defaultProps} />);
    expect(bodyScrollLock.disableBodyScroll).toHaveBeenCalledTimes(1);
    unmount();
  });

  test('calls clearAllBodyScrollLocks on unmount', () => {
    const {unmount} = render(<BoundlessCheckout {...defaultProps} />);
    expect(bodyScrollLock.clearAllBodyScrollLocks).not.toHaveBeenCalled();
    unmount();
    expect(bodyScrollLock.clearAllBodyScrollLocks).toHaveBeenCalledTimes(1);
  });

  test('dispatches setBasicProps and showCheckout on mount', () => {
    const setBasicPropsType = setBasicProps({} as any).type;
    const showCheckoutType = showCheckout().type;
    render(<BoundlessCheckout {...defaultProps} />);
    const dispatchedTypes = mockStore.dispatch.mock.calls.map((call) => call[0].type);
    expect(dispatchedTypes).toContain(setBasicPropsType);
    expect(dispatchedTypes).toContain(showCheckoutType);
  });

  test('QueryClient is not recreated across re-renders', () => {
    mockQueryClientConstructor.mockClear();
    const {rerender, unmount} = render(<BoundlessCheckout {...defaultProps} />);
    rerender(<BoundlessCheckout {...defaultProps} cartId="cart-1" />);
    rerender(<BoundlessCheckout {...defaultProps} cartId="cart-2" />);
    expect(mockQueryClientConstructor).toHaveBeenCalledTimes(1);
    unmount();
  });
});
