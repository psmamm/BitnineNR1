import { useState, useEffect, useRef } from 'react';

export interface USDebtData {
  // Main debt figures
  nationalDebt: number;
  debtPerCitizen: number;
  debtPerTaxpayer: number;
  debtPerChild: number;
  
  // Time-based increases
  debtIncreasePerSecond: number;
  debtIncreasePerMinute: number;
  debtIncreasePerHour: number;
  debtIncreasePerDay: number;
  debtIncreasePerYear: number;
  
  // Interest costs
  interestPerSecond: number;
  interestPerDay: number;
  interestPerYear: number;
  
  // Economic ratios
  debtToGDPRatio: number;
  interestToRevenueRatio: number;
  
  // Comparison metrics
  debtSincePageLoad: number;
  interestSincePageLoad: number;
  
  // Meta
  lastUpdated: Date;
  pageLoadTime: Date;
}

export function useUSDebt() {
  const [debtData, setDebtData] = useState<USDebtData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pageLoadTimeRef = useRef<Date>(new Date());

  // Updated accurate 2025 data based on latest Treasury reports
  const baseDebtAmount = 36.8e12; // $36.8 trillion as of January 2025
  const baseTime = new Date('2025-01-01T00:00:00Z'); // Reference point
  
  // More accurate calculations based on recent trends
  const annualDebtIncrease = 2.1e12; // $2.1 trillion per year (updated estimate)
  const annualInterestPayments = 1.2e12; // $1.2 trillion per year in interest
  
  // Population data (2025 estimates)
  const totalPopulation = 340.5e6; // 340.5 million
  const taxpayers = 160.2e6; // 160.2 million taxpayers
  const children = 73.1e6; // 73.1 million children under 18
  
  // Economic data
  const annualGDP = 28.7e12; // $28.7 trillion GDP
  const federalRevenue = 5.2e12; // $5.2 trillion federal revenue
  
  // Per-second calculations
  const debtIncreasePerSecond = annualDebtIncrease / (365.25 * 24 * 60 * 60);
  const interestPerSecond = annualInterestPayments / (365.25 * 24 * 60 * 60);

  const calculateCurrentDebt = (): USDebtData => {
    const now = new Date();
    const secondsSinceBase = (now.getTime() - baseTime.getTime()) / 1000;
    const secondsSincePageLoad = (now.getTime() - pageLoadTimeRef.current.getTime()) / 1000;
    
    const currentDebt = baseDebtAmount + (debtIncreasePerSecond * secondsSinceBase);
    const currentInterest = interestPerSecond * secondsSincePageLoad;
    const currentDebtIncrease = debtIncreasePerSecond * secondsSincePageLoad;
    
    return {
      // Main debt figures
      nationalDebt: currentDebt,
      debtPerCitizen: currentDebt / totalPopulation,
      debtPerTaxpayer: currentDebt / taxpayers,
      debtPerChild: currentDebt / children,
      
      // Time-based increases
      debtIncreasePerSecond: debtIncreasePerSecond,
      debtIncreasePerMinute: debtIncreasePerSecond * 60,
      debtIncreasePerHour: debtIncreasePerSecond * 3600,
      debtIncreasePerDay: debtIncreasePerSecond * 86400,
      debtIncreasePerYear: annualDebtIncrease,
      
      // Interest costs
      interestPerSecond: interestPerSecond,
      interestPerDay: interestPerSecond * 86400,
      interestPerYear: annualInterestPayments,
      
      // Economic ratios
      debtToGDPRatio: (currentDebt / annualGDP) * 100,
      interestToRevenueRatio: (annualInterestPayments / federalRevenue) * 100,
      
      // Comparison metrics
      debtSincePageLoad: currentDebtIncrease,
      interestSincePageLoad: currentInterest,
      
      // Meta
      lastUpdated: now,
      pageLoadTime: pageLoadTimeRef.current,
    };
  };

  useEffect(() => {
    const updateDebt = () => {
      try {
        const data = calculateCurrentDebt();
        setDebtData(data);
        setLoading(false);
        setError(null);
      } catch (err) {
        setError('Failed to calculate debt data');
        setLoading(false);
      }
    };

    // Initial update
    updateDebt();

    // Update every 50ms for smooth real-time effect (20 FPS)
    intervalRef.current = setInterval(updateDebt, 50);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const refetch = () => {
    setLoading(true);
    setError(null);
    pageLoadTimeRef.current = new Date(); // Reset page load time
    const data = calculateCurrentDebt();
    setDebtData(data);
    setLoading(false);
  };

  return { debtData, loading, error, refetch };
}
