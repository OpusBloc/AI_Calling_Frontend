import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_CONFIG } from '@/constant';

export type TransactionType =
    | 'TRANSFER_SUBFLAT' | 'Public_Sale_Subflat' | 'Private_Sale_Subflat' | 'Buy_NFT_Subflat'
    | 'Cancel_Sale_Subflat' | 'AUCTION_SALE_SUBFLAT' | 'mortage_requested_subflat'
    | 'mortage_accepted_subflat' | 'mortage_rejected_subflat' | 'TRANSFER_FLAT'
    | 'Public_Sale_Flat' | 'Private_Sale_Flat' | 'Buy_NFT_Flat' | 'Cancel_Sale_Flat'
    | 'AUCTION_SALE_FLAT' | 'mortage_requested_flat' | 'mortage_accepted_flat'
    | 'mortage_rejected_flat' | 'FLAT_CONSOLIDATION' | 'MORTGAGE_RELEASE_APPROVED'
    | 'Public_Sale' | 'mortage_requested' | 'Gift_Created' | 'NFT_MINT' | 'TRANSFER' | 'MINT';

export interface Transaction {
    _id: string;
    type: TransactionType | string;
    transactionHash: string;
    gasUsed: string;
    from: string;
    to: string;
    tokenId: number;
    blockNumber: number;
    tokenName: string;
    districtName: string;
    price: string;
    sizeSqft: string;
    ownedBy: string;
    currentListingPrice: string;
    contractAddress: string;
    propertyType: string;
    createdAt: string;
    updatedAt: string;
    __v: number;
    buyerAddress: string;

    // Optional fields that might not be present in all transactions
    delegatee?: string;
    isSaleCancelled?: boolean;
    isNFTBought?: boolean;
    message?: string;
    isRevoked?: boolean;
    isTransferred?: boolean;
    isRequested?: boolean;
    isAccepted?: boolean;
    isRejected?: boolean;
    isRepay?: boolean;
    isLiquidate?: boolean;
    mortageId?: number;
    lenderAddress?: string;
    loanAmount?: number;
    interestAmount?: number;
    durationDays?: number;
    rejector?: string;
    receiver?: string;
    toAddress?: string;
}

interface UseContractTransactionsProps {
    transactionType?: TransactionType | '';
}

export function useContractTransactions({
    transactionType = ''
}: UseContractTransactionsProps = {}) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get<{
                data: {
                    page: number;
                    pageSize: number;
                    totalPages: number;
                    totalCount: number;
                    data: Transaction[];
                }
            }>(
                `${API_CONFIG.BASE_URL}/nft/getAllTransactionSummaries`,
                {
                    params: {
                        page: currentPage,
                        ...(transactionType && { type: transactionType })
                    }
                }
            );

            const responseData = response.data?.data;
            const transactions = responseData?.data || [];

            setTotalItems(responseData?.totalCount || 0);
            setTotalPages(responseData?.totalPages || 1);
            setTransactions(transactions);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch transactions'));
        } finally {
            setLoading(false);
        }
    }, [currentPage, transactionType]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return {
        transactions,
        loading,
        error,
        currentPage,
        totalPages,
        totalItems,
        goToPage,
        refresh: fetchTransactions
    };
}