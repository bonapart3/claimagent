// src/lib/hooks/useClaims.ts
// Claims data hook

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ClaimData } from '@/lib/types/claim';

interface UseClaimsOptions {
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
}

interface UseClaimsResult {
  claims: ClaimData[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  page: number;
  totalPages: number;
  refetch: () => void;
  setPage: (page: number) => void;
  setStatus: (status: string) => void;
  setSearch: (search: string) => void;
}

export function useClaims(options: UseClaimsOptions = {}): UseClaimsResult {
  const [claims, setClaims] = useState<ClaimData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(options.page || 1);
  const [status, setStatus] = useState(options.status || '');
  const [search, setSearch] = useState(options.search || '');
  const limit = options.limit || 10;

  const fetchClaims = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (status) params.set('status', status);
      if (search) params.set('search', search);

      const response = await fetch(`/api/claims?${params}`);
      const data = await response.json();

      if (data.success) {
        setClaims(data.data.claims);
        setTotalCount(data.data.total);
      } else {
        setError(data.error || 'Failed to fetch claims');
      }
    } catch (err) {
      setError('Failed to fetch claims');
      console.error('useClaims error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, status, search]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  const totalPages = Math.ceil(totalCount / limit);

  return {
    claims,
    isLoading,
    error,
    totalCount,
    page,
    totalPages,
    refetch: fetchClaims,
    setPage,
    setStatus,
    setSearch,
  };
}

// Single claim hook
interface UseClaimResult {
  claim: ClaimData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  updateClaim: (updates: Partial<ClaimData>) => Promise<boolean>;
}

export function useClaim(claimId: string): UseClaimResult {
  const [claim, setClaim] = useState<ClaimData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClaim = useCallback(async () => {
    if (!claimId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/claims/${claimId}`);
      const data = await response.json();

      if (data.success) {
        setClaim(data.data);
      } else {
        setError(data.error || 'Failed to fetch claim');
      }
    } catch (err) {
      setError('Failed to fetch claim');
      console.error('useClaim error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    fetchClaim();
  }, [fetchClaim]);

  const updateClaim = async (updates: Partial<ClaimData>): Promise<boolean> => {
    try {
      const response = await fetch(`/api/claims/${claimId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (data.success) {
        setClaim(data.data);
        return true;
      } else {
        setError(data.error || 'Failed to update claim');
        return false;
      }
    } catch (err) {
      setError('Failed to update claim');
      console.error('updateClaim error:', err);
      return false;
    }
  };

  return {
    claim,
    isLoading,
    error,
    refetch: fetchClaim,
    updateClaim,
  };
}

// Claims stats hook
interface ClaimStats {
  total: number;
  submitted: number;
  underReview: number;
  approved: number;
  rejected: number;
  paid: number;
  avgProcessingTime: number;
  totalPaidAmount: number;
}

interface UseClaimStatsResult {
  stats: ClaimStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useClaimStats(): UseClaimStatsResult {
  const [stats, setStats] = useState<ClaimStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/claims/stats');
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.error || 'Failed to fetch stats');
      }
    } catch (err) {
      setError('Failed to fetch stats');
      console.error('useClaimStats error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats,
  };
}

