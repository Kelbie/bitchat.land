import { useState } from 'react';

interface CashuTokenData {
  version: string;
  fullToken: string;
  cleanToken: string;
  mint: string;
  unit: string;
  memo?: string;
  proofCount: number;
  totalAmount: number;
  decodedData?: Record<string, unknown> | null;
}

interface CashuTokenProps {
  data: CashuTokenData;
  theme: "matrix" | "material";
}

export function CashuToken({ data, theme }: CashuTokenProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(data.fullToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.warn('Failed to copy token:', error);
    }
  };

  const handleRedeem = () => {
    // This could be extended to integrate with a Cashu wallet
    console.log('Redeem token:', data.fullToken);
    // For now, just copy the token
    handleCopy();
  };

  const formatMint = (mintUrl: string) => {
    try {
      const url = new URL(mintUrl);
      return url.hostname;
    } catch {
      return mintUrl.replace(/^https?:\/\//, '').split('/')[0];
    }
  };

  const baseClasses = theme === 'matrix' 
    ? 'bg-gray-900 border-green-500/30 text-green-400' 
    : 'bg-white border-gray-300 text-gray-800';
    
  const headerClasses = theme === 'matrix'
    ? 'bg-green-500/10 border-green-500/20'
    : 'bg-gray-50 border-gray-200';

  const buttonClasses = theme === 'matrix'
    ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border-green-500/40'
    : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200';

  const accentClasses = theme === 'matrix'
    ? 'text-green-300'
    : 'text-blue-600';

  return (
    <div className={`inline-block max-w-md border rounded-lg shadow-sm my-2 ${baseClasses}`}>
      {/* Header */}
      <div className={`px-3 py-2 border-b rounded-t-lg ${headerClasses}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🥜</span>
            <div>
              <div className="font-semibold text-sm">Cashu Token</div>
              <div className="text-xs opacity-70">{data.version.toUpperCase()}</div>
            </div>
          </div>
          <div className="text-right">
            <div className={`font-bold ${accentClasses}`}>
              {data.totalAmount > 0 ? `${data.totalAmount} ${data.unit}` : 'Unknown amount'}
            </div>
            {data.proofCount > 0 && (
              <div className="text-xs opacity-70">
                {data.proofCount} proof{data.proofCount !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 py-2">
        <div className="space-y-2">
          {/* Mint info */}
          <div className="flex items-center justify-between text-sm">
            <span className="opacity-70">Mint:</span>
            <span className="font-mono text-xs">{formatMint(data.mint)}</span>
          </div>

          {/* Memo if present */}
          {data.memo && (
            <div className="text-sm">
              <span className="opacity-70">Memo:</span>
              <div className="mt-1 italic">&ldquo;{data.memo}&rdquo;</div>
            </div>
          )}

          {/* Token preview */}
          <div className="text-xs">
            <span className="opacity-70">Token:</span>
            <div className={`mt-1 font-mono p-2 rounded break-all ${
              theme === 'matrix' 
                ? 'bg-gray-800 border border-gray-700' 
                : 'bg-gray-100 border border-gray-300'
            }`}>
              {isExpanded 
                ? data.fullToken 
                : `${data.fullToken.slice(0, 50)}...${data.fullToken.slice(-20)}`
              }
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleRedeem}
              className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${buttonClasses}`}
            >
              {copied ? '✓ Copied!' : '🥜 Copy Token'}
            </button>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`px-3 py-1 rounded text-xs border transition-colors opacity-70 hover:opacity-100 ${
                theme === 'matrix' 
                  ? 'border-green-500/30 hover:bg-green-500/10' 
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              {isExpanded ? 'Show Less' : 'Show Full'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
