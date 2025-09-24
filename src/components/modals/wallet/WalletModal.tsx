import React, { useState } from 'react';
import { 
  X, 
  Send, 
  Download, 
  Plus, 
  Coins,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { Modal } from '@/components/ui/layout';
import { Button, Input } from '@/components/ui/base';
import { cashuService, type CashuBalance, type CashuMint } from '@/services/cashuService';
import { getEncodedToken, type HistoryEntry } from 'coco-cashu-core';

// Themed Input with Border Label Component
interface InputWithLabelProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  theme: 'matrix' | 'material';
  type?: 'text' | 'number' | 'url';
  multiline?: boolean;
  rows?: number;
  readOnly?: boolean;
  className?: string;
}

const InputWithLabel: React.FC<InputWithLabelProps> = ({
  label,
  value,
  onChange,
  placeholder,
  theme,
  type = 'text',
  multiline = false,
  rows = 4,
  readOnly = false,
  className = ''
}) => {
  const styles = theme === 'matrix' ? {
    container: 'border border-green-400',
    label: 'bg-gray-900 text-green-400 px-2',
    input: 'rounded-lg bg-gray-900 text-green-400 placeholder-green-400/50 border-0 outline-none',
    focus: 'focus:border-green-400'
  } : {
    container: 'border border-gray-300',
    label: 'bg-white text-gray-700 px-2',
    input: 'bg-white text-gray-900 placeholder-gray-500 border-0 outline-none',
    focus: 'focus:border-blue-500'
  };

  const InputComponent = multiline ? 'textarea' : 'input';

  return (
    <div className={`relative ${className}`}>
      <fieldset className={`rounded-lg ${styles.container} ${styles.focus} transition-colors`}>
        <legend className={`text-sm font-medium ${styles.label} ml-3`}>
          {label}
        </legend>
        <InputComponent
          type={multiline ? undefined : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          readOnly={readOnly}
          rows={multiline ? rows : undefined}
          className={`w-full p-3 ${styles.input} ${
            multiline ? 'resize-none font-mono text-xs break-all' : ''
          }`}
        />
      </fieldset>
    </div>
  );
};

// Custom hooks for data management
const useBalances = () => {
  const [balances, setBalances] = useState<CashuBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBalances = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await cashuService.getBalances();
      setBalances(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load balances');
      setBalances([]);
    } finally {
      setIsLoading(false);
    }
  };

  const totalBalance = Array.isArray(balances) ? balances.reduce((sum, balance) => sum + balance.balance, 0) : 0;

  return { balances, totalBalance, isLoading, error, loadBalances };
};

const useTransactions = () => {
  const [transactions, setTransactions] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await cashuService.getTransactions();
      setTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  return { transactions, isLoading, error, loadTransactions };
};

const useMints = () => {
  const [mints, setMints] = useState<CashuMint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMints = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await cashuService.getMints();
      setMints(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mints');
      setMints([]);
    } finally {
      setIsLoading(false);
    }
  };

  const addMint = async (url: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await cashuService.addMint(url);
      loadMints();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add mint');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const removeMint = async (mintUrl: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await cashuService.removeMint(mintUrl);
      loadMints();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove mint');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mints, isLoading, error, loadMints, addMint, removeMint };
};

const useWalletOperations = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (mintUrl: string, amount: number): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await cashuService.send(mintUrl, amount);
      return typeof token === 'string' ? token : JSON.stringify(token);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const receive = async (token: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await cashuService.receive(token);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to receive token';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { send, receive, isLoading, error };
};

// Centralized theme styles
const THEME_STYLES = {
  matrix: {
    container: 'bg-gray-900/95 border border-green-400',
    text: 'text-green-400',
    textSecondary: 'text-green-400/70',
    border: 'border-green-400/20',
    hover: 'hover:bg-green-400/10',
    input: 'bg-gray-900 border-green-400 text-green-400 placeholder-green-400/50 focus:outline-none focus:ring-0 focus:border-green-400',
    button: 'bg-green-400/20 border-green-400/50 text-green-400 hover:bg-green-400/30',
    tab: 'text-green-400/70 hover:text-green-400 hover:bg-green-400/10',
    tabActive: 'text-green-400 bg-green-400/10 border-b-2 border-green-400',
    accent: 'text-green-400',
    accentBg: 'bg-green-400/20',
    accentHover: 'hover:bg-green-400/30',
    spinner: 'border-green-400',
    balanceBorder: 'border-green-400'
  },
  material: {
    container: 'bg-white/95 border border-gray-200',
    text: 'text-gray-900',
    textSecondary: 'text-gray-600',
    border: 'border-gray-200',
    hover: 'hover:bg-gray-50',
    input: 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0 focus:border-blue-500',
    button: 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600',
    tab: 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
    tabActive: 'text-blue-600 bg-blue-50 border-b-2 border-blue-600',
    accent: 'text-blue-600',
    accentBg: 'bg-blue-500/20',
    accentHover: 'hover:bg-blue-600/30',
    spinner: 'border-blue-500',
    balanceBorder: 'border-blue-500'
  }
} as const;

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'matrix' | 'material';
}

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'matrix' | 'material';
  mints: CashuMint[];
  onSend: (mintUrl: string, amount: number) => Promise<string>;
  onSendComplete: () => void;
  isLoading: boolean;
}

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'matrix' | 'material';
  onReceive: (token: string) => Promise<void>;
  onReceiveComplete: () => void;
  isLoading: boolean;
}

interface MintsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'matrix' | 'material';
  mints: CashuMint[];
  onAddMint: (url: string, name?: string) => Promise<void>;
  onRemoveMint: (url: string) => Promise<void>;
  isLoading: boolean;
}

interface TokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'matrix' | 'material';
  token: string;
}

// Send Modal Component
const SendModal: React.FC<SendModalProps> = ({ 
  isOpen, 
  onClose, 
  theme, 
  mints, 
  onSend, 
  onSendComplete,
  isLoading 
}) => {
  const [amount, setAmount] = useState('');
  const [mintUrl, setMintUrl] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const styles = THEME_STYLES[theme];

  const handleSend = async () => {
    if (!amount || !mintUrl) return;
    
    try {
      const amountNum = parseInt(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Invalid amount');
      }

      const token = await onSend(mintUrl, amountNum);
      setGeneratedToken(getEncodedToken(JSON.parse(token)));
      setAmount('');
      onSendComplete();
    } catch (err) {
      console.error('Send failed:', err);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleClose = () => {
    setGeneratedToken('');
    setAmount('');
    setMintUrl('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} theme={theme} title="Send Cashu" size="md">
      <div className="space-y-4">
        <div>
          <InputWithLabel
            label="Amount (sats)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            theme={theme}
            type="number"
          />
        </div>

        <div>
          <label className={`block text-sm font-medium ${styles.text} mb-2`}>
            Mint URL
          </label>
          <select
            value={mintUrl}
            onChange={(e) => setMintUrl(e.target.value)}
            className={`w-full p-3 rounded-lg border ${styles.input}`}
          >
            <option value="">Select a mint</option>
            {Array.isArray(mints) && mints.map((mint) => (
              <option key={mint.url} value={mint.url}>
                {mint.name || mint.url}
              </option>
            ))}
          </select>
        </div>

        <Button
          onClick={handleSend}
          disabled={!amount || !mintUrl || isLoading}
          theme={theme}
          className="w-full"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </Button>

        {generatedToken && (
          <div className="mt-4">
            <div className="relative">
              <InputWithLabel
                label="Generated Token"
                value={generatedToken}
                onChange={() => {}} // Read-only
                theme={theme}
                multiline={true}
                rows={6}
                readOnly={true}
              />
              <button
                onClick={() => copyToClipboard(generatedToken, 'Token')}
                className={`absolute top-2 right-2 p-2 rounded-lg ${styles.accentBg} ${styles.accentHover} transition-colors`}
              >
                {copiedText === 'Token' ? (
                  <Check className={`w-4 h-4 ${styles.accent}`} />
                ) : (
                  <Copy className={`w-4 h-4 ${styles.accent}`} />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

// Receive Modal Component
const ReceiveModal: React.FC<ReceiveModalProps> = ({ 
  isOpen, 
  onClose, 
  theme, 
  onReceive, 
  onReceiveComplete,
  isLoading 
}) => {
  const [token, setToken] = useState('');
  const styles = THEME_STYLES[theme];

  const handleReceive = async () => {
    if (!token) return;
    
    try {
      await onReceive(token);
      setToken('');
      onReceiveComplete();
      onClose();
    } catch (err) {
      console.error('Receive failed:', err);
    }
  };

  const handleClose = () => {
    setToken('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} theme={theme} title="Receive Cashu" size="md">
      <div className="space-y-4">
        <div>
          <InputWithLabel
            label="Token to Receive"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste Cashu token here..."
            theme={theme}
            multiline={true}
            rows={6}
          />
        </div>

        <Button
          onClick={handleReceive}
          disabled={!token || isLoading}
          theme={theme}
          className="w-full"
        >
          {isLoading ? 'Receiving...' : 'Receive Token'}
        </Button>
      </div>
    </Modal>
  );
};

// Mints Modal Component
const MintsModal: React.FC<MintsModalProps> = ({ 
  isOpen, 
  onClose, 
  theme, 
  mints, 
  onAddMint, 
  onRemoveMint, 
  isLoading 
}) => {
  const [newMintUrl, setNewMintUrl] = useState('');
  const [newMintName, setNewMintName] = useState('');
  const styles = THEME_STYLES[theme];

  const handleAddMint = async () => {
    if (!newMintUrl) return;
    
    try {
      await onAddMint(newMintUrl, newMintName || undefined);
      setNewMintUrl('');
      setNewMintName('');
    } catch (err) {
      console.error('Add mint failed:', err);
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    if (!timestamp || isNaN(timestamp)) {
      return 'Unknown date';
    }
    
    // Check if timestamp is in milliseconds (13 digits) or seconds (10 digits)
    const date = timestamp > 1e12 ? new Date(timestamp) : new Date(timestamp * 1000);
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    return date.toLocaleString();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} theme={theme} title="Manage Mints" size="lg">
      <div className="max-h-[60vh] overflow-y-auto space-y-6">
        {/* Add New Mint */}
        <div className="space-y-4">
          <h4 className={`font-semibold ${styles.text}`}>Add New Mint</h4>
          <div>
            <InputWithLabel
              label="Mint URL"
              value={newMintUrl}
              onChange={(e) => setNewMintUrl(e.target.value)}
              placeholder="https://mint.example.com"
              theme={theme}
              type="url"
            />
          </div>
          <Button
            onClick={handleAddMint}
            disabled={!newMintUrl || isLoading}
            theme={theme}
            className="w-full"
          >
            {isLoading ? 'Adding...' : 'Add Mint'}
          </Button>
        </div>

        {/* Existing Mints */}
        <div className="space-y-4">
          <h4 className={`font-semibold ${styles.text}`}>Your Mints</h4>
          {Array.isArray(mints) && mints.length > 0 ? (
            <div className="space-y-3">
              {mints.map((mint) => (
                <div
                  key={mint.url}
                  className={`p-4 rounded-lg border ${styles.border} ${styles.hover}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className={`font-medium ${styles.text}`}>
                        {mint.name || 'Unnamed Mint'}
                      </div>
                      <div className={`text-xs ${styles.textSecondary} font-mono mt-1`}>
                        {mint.url}
                      </div>
                      <div className={`text-xs ${styles.textSecondary} mt-1`}>
                        Added {formatTimestamp(mint.createdAt)}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <a
                        href={mint.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`p-2 rounded-lg ${styles.hover} transition-colors`}
                        title="Open mint website"
                      >
                        <ExternalLink className={`w-4 h-4 ${styles.accent}`} />
                      </a>
                      <button
                        onClick={() => onRemoveMint(mint.url)}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                        title="Remove mint"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className={`text-lg ${styles.textSecondary}`}>
                No mints added yet
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

// Token Modal Component
const TokenModal: React.FC<TokenModalProps> = ({ 
  isOpen, 
  onClose, 
  theme, 
  token 
}) => {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const styles = THEME_STYLES[theme];

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} theme={theme} title="Token Details" size="lg">
      <div className="space-y-4">
        <div>
          <div className="relative">
            <InputWithLabel
              label="Token Data"
              value={token}
              onChange={() => {}} // Read-only
              placeholder="No token data available"
              theme={theme}
              multiline={true}
              rows={8}
              readOnly={true}
            />
            <button
              onClick={() => copyToClipboard(token, 'Token')}
              className={`absolute top-2 right-2 p-2 rounded-lg ${styles.accentBg} ${styles.accentHover} transition-colors`}
              disabled={!token}
            >
              {copiedText === 'Token' ? (
                <Check className={`w-4 h-4 ${styles.accent}`} />
              ) : (
                <Copy className={`w-4 h-4 ${styles.accent}`} />
              )}
            </button>
          </div>
        </div>
        
        <div className="text-center">
          <Button
            onClick={onClose}
            theme={theme}
            className="px-6"
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Main Wallet Modal Component
export const WalletModal: React.FC<WalletModalProps> = ({ 
  isOpen, 
  onClose, 
  theme 
}) => {
  // Use custom hooks for data management
  const balanceHook = useBalances();
  const transactionHook = useTransactions();
  const mintHook = useMints();
  const operationsHook = useWalletOperations();
  
  // Modal state
  const [activeModal, setActiveModal] = useState<{
    type: 'send' | 'receive' | 'mints' | 'token' | null;
    data?: any;
  }>({ type: null });

  const styles = THEME_STYLES[theme];

  // Load all data when modal opens
  React.useEffect(() => {
    if (isOpen) {
      loadAllData();
    }
  }, [isOpen]);

  const loadAllData = async () => {
    // Check service health first
    try {
      const isHealthy = await cashuService.isHealthy();
      if (!isHealthy) {
        // Set error state but don't throw - let individual hooks handle their own errors
        console.warn('Cashu service is not healthy');
      }
    } catch (err) {
      console.warn('Failed to check service health:', err);
    }

    // Load data with individual error handling
    await Promise.allSettled([
      balanceHook.loadBalances(),
      transactionHook.loadTransactions(),
      Promise.resolve(mintHook.loadMints()) // loadMints is synchronous
    ]);
  };

  const handleSend = async (mintUrl: string, amount: number): Promise<string> => {
    const result = await operationsHook.send(mintUrl, amount);
    return result;
  };

  const handleReceive = async (token: string): Promise<void> => {
    await operationsHook.receive(token);
  };

  const handleSendComplete = () => {
    balanceHook.loadBalances();
    transactionHook.loadTransactions();
  };

  const handleReceiveComplete = () => {
    balanceHook.loadBalances();
    transactionHook.loadTransactions();
  };

  const handleHistoryItemClick = (entry: HistoryEntry) => {
    try {
      const token = (entry as any).token || (entry as any).data?.token;
      const tokenData = token ? getEncodedToken(token) : 'No token data available for this transaction';
      setActiveModal({ type: 'token', data: tokenData });
    } catch (err) {
      console.error('Error handling history item click:', err);
      setActiveModal({ type: 'token', data: 'Error loading token data' });
    }
  };

  const closeActiveModal = () => {
    setActiveModal({ type: null });
  };

  const formatAmount = (amount: number): string => {
    return amount.toLocaleString();
  };

  const getTransactionDescription = (entry: HistoryEntry): string => {
    const descriptions = {
      mint: 'Lightning payment received',
      melt: 'Lightning payment sent',
      send: 'Ecash sent',
      receive: 'Ecash received'
    };
    return descriptions[entry.type] || '';
  };

  const getTransactionTime = (entry: HistoryEntry): string => {
    const now = new Date();
    const entryTime = new Date(entry.createdAt);
    const diffMs = now.getTime() - entryTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const isLoading = balanceHook.isLoading || transactionHook.isLoading || mintHook.isLoading;
  const error = balanceHook.error || transactionHook.error || mintHook.error || operationsHook.error;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} theme={theme} title="Cashu Wallet" size="xl">
        <div className="space-y-6 pb-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${styles.spinner}`}></div>
            </div>
          )}

          {!isLoading && (
            <>
              {/* Total Balance */}
              <div className="text-center py-6">
                <div className={`text-lg font-bold uppercase tracking-wider ${styles.text} mb-4`}>
                  Total Balance
                </div>
                <div className={`inline-block p-6 rounded-lg border-2 ${styles.balanceBorder} ${styles.container}`}>
                  <div className={`text-4xl font-mono font-bold ${styles.text} flex items-center justify-center gap-2`}>
                    <span className="text-4xl">₿</span>
                    {formatAmount(balanceHook.totalBalance)}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 justify-center">
                <Button
                  onClick={() => setActiveModal({ type: 'send' })}
                  theme={theme}
                  className="flex items-center space-x-2 px-6 py-3"
                >
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </Button>
                <Button
                  onClick={() => setActiveModal({ type: 'receive' })}
                  theme={theme}
                  className="flex items-center space-x-2 px-6 py-3"
                >
                  <Download className="w-4 h-4" />
                  <span>Receive</span>
                </Button>
              </div>

              {/* By Mint Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className={`font-semibold ${styles.text}`}>By Mint</h3>
                  <button
                    onClick={() => setActiveModal({ type: 'mints' })}
                    className={`p-2 rounded-lg ${styles.hover} transition-colors`}
                    title="Manage mints"
                  >
                    <Plus className={`w-4 h-4 ${styles.accent}`} />
                  </button>
                </div>

                {Array.isArray(balanceHook.balances) && balanceHook.balances.length > 0 ? (
                  <div className="space-y-3">
                    {balanceHook.balances.map((balance) => (
                      <div
                        key={balance.mintUrl}
                        className={`p-4 rounded-lg border ${styles.border} ${styles.hover}`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className={`font-medium ${styles.text}`}>
                              {balance.mintName || 'Unknown Mint'}
                            </div>
                            <div className={`text-xs ${styles.textSecondary} font-mono`}>
                              {balance.mintUrl}
                            </div>
                          </div>
                          <div className={`text-lg font-mono font-bold ${styles.text}`}>
                            {formatAmount(balance.balance)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className={`text-lg ${styles.textSecondary}`}>
                      No mints added yet
                    </div>
                    <div className={`text-sm ${styles.textSecondary} mt-2`}>
                      Click the + button to add a mint
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Transactions */}
              {Array.isArray(transactionHook.transactions) && transactionHook.transactions.length > 0 && (
                <div className="space-y-4">
                  <h3 className={`text-lg font-bold uppercase tracking-wider text-start ${styles.text}`}>
                    Recent Transactions
                  </h3>
                  <div className="space-y-3">
                    {transactionHook.transactions.slice(0, 5).map((entry) => (
                      <div
                        key={entry.id || `transaction-${Math.random()}`}
                        onClick={() => handleHistoryItemClick(entry)}
                        className={`p-4 rounded-lg ${theme === 'matrix' ? 'bg-gray-800/50 border border-gray-700' : 'bg-gray-100 border border-gray-300'} cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:opacity-80`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className={`text-sm font-medium ${styles.text}`}>
                              {getTransactionDescription(entry)}
                            </div>
                            <div className={`text-xs ${styles.textSecondary} mt-1`}>
                              {getTransactionTime(entry)}
                            </div>
                          </div>
                          <div className={`text-lg font-mono font-bold flex items-center gap-1 ${
                            entry.type === 'send' || entry.type === 'melt' ? 'text-red-400' : 'text-green-400'
                          }`}>
                            {entry.type === 'send' || entry.type === 'melt' ? '-' : '+'}
                            <span className="text-xl">₿</span>
                            {formatAmount(entry.amount || 0)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-center">
                    <button className={`text-sm ${styles.text} hover:opacity-80 transition-opacity`}>
                      All Transactions
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      {/* Sub-modals */}
      <SendModal
        isOpen={activeModal.type === 'send'}
        onClose={closeActiveModal}
        theme={theme}
        mints={mintHook.mints}
        onSend={handleSend}
        onSendComplete={handleSendComplete}
        isLoading={operationsHook.isLoading}
      />

      <ReceiveModal
        isOpen={activeModal.type === 'receive'}
        onClose={closeActiveModal}
        theme={theme}
        onReceive={handleReceive}
        onReceiveComplete={handleReceiveComplete}
        isLoading={operationsHook.isLoading}
      />

      <MintsModal
        isOpen={activeModal.type === 'mints'}
        onClose={closeActiveModal}
        theme={theme}
        mints={mintHook.mints}
        onAddMint={mintHook.addMint}
        onRemoveMint={mintHook.removeMint}
        isLoading={mintHook.isLoading}
      />

      <TokenModal
        isOpen={activeModal.type === 'token'}
        onClose={closeActiveModal}
        theme={theme}
        token={activeModal.data || ''}
      />
    </>
  );
};