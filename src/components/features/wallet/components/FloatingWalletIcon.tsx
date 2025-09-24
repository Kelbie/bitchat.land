import React, { useState, useEffect } from 'react';
import { Wallet, Coins } from 'lucide-react';
import { cashuService, type CashuBalance } from '@/services/cashuService';

interface FloatingWalletIconProps {
  theme: 'matrix' | 'material';
  onClick: () => void;
}

export const FloatingWalletIcon: React.FC<FloatingWalletIconProps> = ({ 
  theme, 
  onClick 
}) => {
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadBalance = async () => {
      try {
        setIsLoading(true);
        
        // Check if service is healthy first
        const isHealthy = await cashuService.isHealthy();
        if (!isHealthy) {
          console.warn('Cashu service is not healthy, showing 0 balance');
          setTotalBalance(0);
          return;
        }
        
        const balances = await cashuService.getBalances();
        const total = balances.reduce((sum, balance) => sum + balance.balance, 0);
        setTotalBalance(total);
      } catch (error) {
        console.error('Failed to load wallet balance:', error);
        setTotalBalance(0);
      } finally {
        setIsLoading(false);
      }
    };

    loadBalance();

    // Listen for balance changes using the library's event system
    const unsubscribeCounter = cashuService.on('counter:updated', () => {
      loadBalance();
    });

    const unsubscribeProofs = cashuService.on('proofs:saved', () => {
      loadBalance();
    });

    // Refresh balance every 30 seconds as fallback
    const interval = setInterval(loadBalance, 30000);
    
    return () => {
      clearInterval(interval);
      unsubscribeCounter();
      unsubscribeProofs();
    };
  }, []);

  const formatBalance = (balance: number): string => {
    if (balance === 0) return '0';
    if (balance < 1000) return balance.toString();
    if (balance < 1000000) return `${(balance / 1000).toFixed(1)}k`;
    return `${(balance / 1000000).toFixed(1)}M`;
  };

  const getThemeClasses = () => {
    if (theme === 'matrix') {
      return {
        container: 'bg-gray-900 border border-green-400/30 hover:border-green-400/60',
        icon: 'text-green-400',
        balance: 'text-green-400/80',
        glow: 'shadow-[0_0_20px_rgba(0,255,0,0.3)] hover:shadow-[0_0_30px_rgba(0,255,0,0.5)]'
      };
    } else {
      return {
        container: 'bg-white/90 border border-blue-200 hover:border-blue-400',
        icon: 'text-blue-600',
        balance: 'text-blue-600/80',
        glow: 'shadow-lg hover:shadow-xl'
      };
    }
  };

  const themeClasses = getThemeClasses();

  return (
    <button
      onClick={onClick}
      className={`
        fixed bottom-6 right-6 z-50
        w-16 h-16 rounded-full
        flex flex-col items-center justify-center
        transition-all duration-300 ease-in-out
        hover:scale-110 active:scale-95
        ${themeClasses.container}
        ${themeClasses.glow}
        backdrop-blur-sm
      `}
      title={`Cashu Wallet - ${isLoading ? 'Loading...' : `${formatBalance(totalBalance)} sats`}`}
    >
      <div className="relative">
        <Wallet 
          size={24} 
          className={`${themeClasses.icon} transition-colors duration-200`}
        />
        {/* {!isLoading && totalBalance > 0 && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        )} */}
      </div>
      
      {/* {!isLoading && (
        <div className={`text-xs font-mono mt-1 ${themeClasses.balance}`}>
          {formatBalance(totalBalance)}
        </div>
      )} */}
      
      {/* {isLoading && (
        <div className={`text-xs font-mono mt-1 ${themeClasses.balance} animate-pulse`}>
          ...
        </div>
      )} */}
    </button>
  );
};
