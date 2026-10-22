import React, { useEffect } from 'react';
import toast from 'react-hot-toast';

interface UseTransactionNotificationProps {
  hash?: string;
  isConfirmed?: boolean;
  error?: Error | null;
  transactionName?: string;
  hideTxLink?: boolean; // when true, do not render a "View Transaction" link
}

// Custom notification component
const CustomNotification = ({ 
  type, 
  title, 
  description, 
  onDismiss, 
  txHash, 
  hideTxLink
}: {
  type: 'loading' | 'success' | 'error';
  title: string;
  description: string;
  onDismiss: () => void;
  txHash?: string;
  hideTxLink?: boolean;
}) => {
  const getStyles = () => {
    switch (type) {
      case 'loading':
        return {
          bg: 'bg-blue-500',
          icon: (
            <svg className="w-5 h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )
        };
      case 'success':
        return {
          bg: 'bg-green-500',
          icon: (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        };
      case 'error':
        return {
          bg: 'bg-red-500',
          icon: (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        };
    }
  };

  const styles = getStyles();

  return (
    <div className={`${styles.bg} rounded-lg p-4 shadow-lg min-w-[320px] max-w-sm`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {styles.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">
              {title}
            </p>
            <p className="text-xs text-white/90 mt-1">
              {description}
            </p>
            {txHash && !hideTxLink && (
              <a
                href={`https://testnet.bscscan.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/80 hover:text-white underline inline-block mt-1"
              >
                View Transaction
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-white/70">now</span>
          <button
            onClick={onDismiss}
            className="text-white/70 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export const useTransactionNotification = ({
  hash,
  isConfirmed,
  error,
  transactionName = 'Transaction',
  hideTxLink,
}: UseTransactionNotificationProps) => {
  
  useEffect(() => {
    if (isConfirmed && hash) {
      // Transaction confirmed successfully
      toast.custom(
        (t) => (
          <CustomNotification
            type="success"
            title={`${transactionName} Successful`}
            description="Your transaction has been confirmed successfully."
            onDismiss={() => toast.remove(t.id)}
            txHash={hash}
            hideTxLink={hideTxLink}
          />
        ),
        {
          id: hash,
          duration: 2000,
        }
      );
    }
  }, [isConfirmed, hash, transactionName, hideTxLink]);

  useEffect(() => {
    if (error && hash) {
      // Transaction failed
      toast.custom(
        (t) => (
          <CustomNotification
            type="error"
            title={`${transactionName} Failed`}
            description="Your transaction could not be completed."
            onDismiss={() => toast.remove(t.id)}
            txHash={hash}
            hideTxLink={hideTxLink}
          />
        ),
        {
          id: hash,
          duration: 3000,
        }
      );
    } else if (error && !hash) {
      // Error before transaction was submitted
      toast.custom(
        (t) => (
          <CustomNotification
            type="error"
            title={`${transactionName} Failed`}
            description="Transaction could not be submitted."
            onDismiss={() => toast.remove(t.id)}
            hideTxLink={hideTxLink}
          />
        ),
        {
          duration: 3000,
        }
      );
    }
  }, [error, hash, transactionName, hideTxLink]);
};

// Helper function for simple success notifications
export const showSuccessNotification = (message: string, txHash?: string, options?: { hideTxLink?: boolean; title?: string }) => {
  toast.custom(
    (t) => (
      <CustomNotification
        type="success"
        title={options?.title || 'Success'}
        description={message}
        onDismiss={() => toast.remove(t.id)}
        txHash={txHash}
        hideTxLink={options?.hideTxLink}
      />
    ),
    { duration: 3000 }
  );
};

// Helper function for simple error notifications
export const showErrorNotification = (message: string, txHash?: string, options?: { hideTxLink?: boolean; title?: string }) => {
  toast.custom(
    (t) => (
      <CustomNotification
        type="error"
        title={options?.title || 'Error'}
        description={message}
        onDismiss={() => toast.remove(t.id)}
        txHash={txHash}
        hideTxLink={options?.hideTxLink}
      />
    ),
    { duration: 3000 }
  );
};