import { Manager, ConsoleLogger } from 'coco-cashu-core';
import { IndexedDbRepositories } from 'coco-cashu-indexeddb';
import type { Mint, Keyset, Token, MintQuoteResponse, MeltQuoteResponse, MintInfo, HistoryEntry } from 'coco-cashu-core';

export interface CashuBalance {
  mintUrl: string;
  balance: number;
  mintName?: string;
}

class CashuService {
  private manager: Manager | null = null;
  private isInitialized = false;

  private async initializeManager() {
    if (this.isInitialized && this.manager) {
      return this.manager;
    }

    try {
      const seedGetter = await this.createSeedGetter();
      const repositories = new IndexedDbRepositories({});
      await repositories.init(); // Initialize the database
      const logger = new ConsoleLogger('cashu-wallet', { level: 'info' });
      
      this.manager = new Manager(
        repositories,
        seedGetter,
        logger
      );

      await this.manager.enableMintQuoteWatcher({ watchExistingPendingOnStart: true });
      await this.manager.enableProofStateWatcher();

      this.isInitialized = true;
      return this.manager;
    } catch (error) {
      console.error('Failed to initialize Cashu Manager:', error);
      throw new Error('Unable to initialize Cashu wallet. Please refresh the page and try again.');
    }
  }

  private async createSeedGetter(): Promise<() => Promise<Uint8Array>> {
    return async (): Promise<Uint8Array> => {
      const stored = localStorage.getItem('cashu_seed');
      if (stored) {
        const seedArray = JSON.parse(stored);
        const seed = new Uint8Array(seedArray);
        
        // Validate seed length as required by SeedService
        if (seed.length !== 64) {
          console.warn('Invalid seed length found in storage, generating new seed');
          localStorage.removeItem('cashu_seed');
          return this.generateAndStoreSeed();
        }
        return seed;
      }
      
      return this.generateAndStoreSeed();
    };
  }

  private generateAndStoreSeed(): Uint8Array {
    const seed = crypto.getRandomValues(new Uint8Array(64));
    localStorage.setItem('cashu_seed', JSON.stringify(Array.from(seed)));
    return seed;
  }

  // Mint operations - delegate to library
  async addMint(mintUrl: string): Promise<{ mint: Mint; keysets: Keyset[] }> {
    const manager = await this.initializeManager();
    return await manager.mint.addMint(mintUrl);
  }

  async getAllMints(): Promise<Mint[]> {
    const manager = await this.initializeManager();
    return await manager.mint.getAllMints();
  }

  // Alias for backward compatibility
  async getMints(): Promise<Mint[]> {
    return await this.getAllMints();
  }

  async isKnownMint(mintUrl: string): Promise<boolean> {
    const manager = await this.initializeManager();
    return await manager.mint.isKnownMint(mintUrl);
  }

  async getMintInfo(mintUrl: string): Promise<MintInfo> {
    const manager = await this.initializeManager();
    return await manager.mint.getMintInfo(mintUrl);
  }

  // Wallet operations - delegate to library
  async getBalances(): Promise<CashuBalance[]> {
    const manager = await this.initializeManager();
    const balances = await manager.wallet.getBalances();
    
    // Fetch mint info for each mint to get the name
    const balancePromises = Object.entries(balances).map(async ([mintUrl, balance]) => {
      try {
        const mintInfo = await manager.mint.getMintInfo(mintUrl);
        return {
          mintUrl,
          balance,
          mintName: mintInfo.name || undefined
        };
      } catch (error) {
        console.warn(`Failed to fetch mint info for ${mintUrl}:`, error);
        return {
          mintUrl,
          balance,
          mintName: undefined
        };
      }
    });
    
    return Promise.all(balancePromises);
  }

  async send(mintUrl: string, amount: number): Promise<Token> {
    const manager = await this.initializeManager();
    return await manager.wallet.send(mintUrl, amount);
  }

  async receive(token: string | Token): Promise<void> {
    const manager = await this.initializeManager();
    await manager.wallet.receive(token);
  }

  async restore(mintUrl: string): Promise<void> {
    const manager = await this.initializeManager();
    await manager.wallet.restore(mintUrl);
  }

  // Quote operations - delegate to library
  async createMintQuote(mintUrl: string, amount: number): Promise<MintQuoteResponse> {
    const manager = await this.initializeManager();
    return await manager.quotes.createMintQuote(mintUrl, amount);
  }

  async redeemMintQuote(mintUrl: string, quoteId: string): Promise<void> {
    const manager = await this.initializeManager();
    await manager.quotes.redeemMintQuote(mintUrl, quoteId);
  }

  async createMeltQuote(mintUrl: string, invoice: string): Promise<MeltQuoteResponse> {
    const manager = await this.initializeManager();
    return await manager.quotes.createMeltQuote(mintUrl, invoice);
  }

  async payMeltQuote(mintUrl: string, quoteId: string): Promise<void> {
    const manager = await this.initializeManager();
    await manager.quotes.payMeltQuote(mintUrl, quoteId);
  }

  // History operations - delegate to library
  async getTransactions(offset?: number, limit?: number): Promise<HistoryEntry[]> {
    const manager = await this.initializeManager();
    return await manager.history.getPaginatedHistory(offset, limit);
  }

  // Subscription operations - delegate to library
  async awaitMintQuotePaid(mintUrl: string, quoteId: string): Promise<unknown> {
    const manager = await this.initializeManager();
    return await manager.subscription.awaitMintQuotePaid(mintUrl, quoteId);
  }

  async awaitMeltQuotePaid(mintUrl: string, quoteId: string): Promise<unknown> {
    const manager = await this.initializeManager();
    return await manager.subscription.awaitMeltQuotePaid(mintUrl, quoteId);
  }

  // Event operations - delegate to library
  async on(event: string, callback: (...args: any[]) => void) {
    const manager = await this.initializeManager();
    return manager.on(event as any, callback);
  }

  async off(event: string, callback: (...args: any[]) => void) {
    const manager = await this.initializeManager();
    manager.off(event as any, callback);
  }

  async once(event: string, callback: (...args: any[]) => void) {
    const manager = await this.initializeManager();
    return manager.once(event as any, callback);
  }

  // Utility methods
  async dispose() {
    if (this.manager) {
      await this.manager.dispose();
      this.manager = null;
      this.isInitialized = false;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.initializeManager();
      return true;
    } catch {
      return false;
    }
  }
}

// Export a singleton instance
export const cashuService = new CashuService();