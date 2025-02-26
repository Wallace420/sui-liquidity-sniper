import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TradingStrategy, tradingStrategy, buyAction, sellAction, TradingInfo } from '../trader/tradeStrategy.js';
import { SUI } from '../chain/config.js';
import { checkPoolSecurity } from '../security/pool_security.js';

// Mock-Abhängigkeiten
vi.mock('../chain/config.js', () => ({
  SUI: {
    client: {
      signAndExecuteTransaction: vi.fn(),
      getTransactionBlock: vi.fn(),
      waitForTransaction: vi.fn(),
      getObject: vi.fn()
    }
  }
}));

vi.mock('../security/pool_security.js', () => ({
  checkPoolSecurity: vi.fn()
}));

vi.mock('../db/trade.js', () => ({
  upsertTrade: vi.fn(),
  getOpenTrades: vi.fn(),
  updateTrade: vi.fn()
}));

vi.mock('../telegram/index.js', () => ({
  sendBuyMessage: vi.fn(),
  sendSellMessage: vi.fn(),
  sendErrorMessage: vi.fn(),
  sendUpdateMessage: vi.fn()
}));

describe('TradingStrategy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('sollte eine Singleton-Instanz zurückgeben', () => {
    const instance1 = tradingStrategy;
    const instance2 = TradingStrategy.getInstance();
    
    expect(instance1).toBe(instance2);
  });

  it('sollte aktive Trades verwalten können', () => {
    const trades = tradingStrategy.getActiveTrades();
    expect(trades).toBeDefined();
    expect(trades instanceof Map).toBe(true);
  });

  it('sollte Autopilot-Status umschalten können', async () => {
    const tradeId = 'test-trade-id';
    
    // Manuell einen Trade hinzufügen
    const activeTrades = tradingStrategy.getActiveTrades();
    activeTrades.set(tradeId, { isAutoPilot: false });
    
    await tradingStrategy.toggleAutoPilot(tradeId, true);
    
    const trade = activeTrades.get(tradeId);
    expect(trade.isAutoPilot).toBe(true);
  });
});

describe('buyAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock für getTransactionBlock
    SUI.client.getTransactionBlock.mockResolvedValue({
      balanceChanges: [
        { coinType: '0x2::sui::SUI', amount: '-1000000' },
        { coinType: '0xabcdef::coin::COIN', amount: '1000' }
      ]
    });
  });

  it('sollte einen Trade erfolgreich verarbeiten', async () => {
    const result = await buyAction('test-digest', {
      poolId: 'test-pool',
      dex: 'Cetus',
      amountA: '1000',
      amountB: '1000',
      coinA: '0x2::sui::SUI',
      coinB: '0xabcdef::coin::COIN',
      liquidity: '2000'
    });
    
    expect(SUI.client.getTransactionBlock).toHaveBeenCalledWith({
      digest: 'test-digest',
      options: { showBalanceChanges: true }
    });
  });
});

describe('sellAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock für waitForTransaction
    SUI.client.waitForTransaction.mockResolvedValue({
      balanceChanges: [
        { coinType: '0x2::sui::SUI', amount: '1500000' }
      ]
    });
  });

  it('sollte einen Verkauf für Cetus erfolgreich durchführen', async () => {
    const tradingInfo: TradingInfo = {
      initialSolAmount: '1000000',
      currentAmount: '1200000',
      tokenToSell: '0xabcdef::coin::COIN',
      tokenOnWallet: '1000',
      poolAddress: 'test-pool',
      dex: 'Cetus',
      suiIsA: true,
      scamProbability: 10
    };
    
    // Mock für sellDirectCetus
    vi.mock('../trader/dex/cetus.js', () => ({
      sellDirectCetus: vi.fn().mockResolvedValue('sell-tx-digest'),
      createCetusBuyTransaction: vi.fn(),
      createCetusSellTransaction: vi.fn()
    }));
    
    await expect(sellAction(tradingInfo)).resolves.not.toThrow();
  });
}); 