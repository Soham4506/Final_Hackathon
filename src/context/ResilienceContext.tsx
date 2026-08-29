import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  isBlackoutActive,
  getSimState,
  triggerBlackoutWipe,
  triggerBitRotCorruption,
  resetDisasterSimulation,
  executeAutonomousRecovery,
  getInFlightOutbox,
  getShadowLedger,
  getReconciliationHistory,
  DisasterReconciliationReport,
  checkpointToShadowLedger,
} from '../services/disasterRecoveryService';
import { useCivic } from './CivicContext';

interface ResilienceContextType {
  isBlackout: boolean;
  isWiped: boolean;
  isCorrupted: boolean;
  inFlightCount: number;
  shadowDocCount: number;
  recoveryLoading: boolean;
  lastReport: DisasterReconciliationReport | null;
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  triggerBlackout: () => void;
  triggerCorruption: () => void;
  resetSystem: () => void;
  runRecovery: () => Promise<DisasterReconciliationReport>;
  refreshState: () => void;
}

const ResilienceContext = createContext<ResilienceContextType | null>(null);

export const ResilienceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { issues } = useCivic();
  const [simState, setSimState] = useState(getSimState());
  const [inFlightCount, setInFlightCount] = useState(0);
  const [shadowDocCount, setShadowDocCount] = useState(0);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [lastReport, setLastReport] = useState<DisasterReconciliationReport | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Initial checkpoint of seed issues if shadow ledger is empty
  useEffect(() => {
    if (issues && issues.length > 0) {
      checkpointToShadowLedger(issues);
    }
  }, [issues]);

  const refreshState = useCallback(() => {
    const currentSim = getSimState();
    setSimState(currentSim);
    const outbox = getInFlightOutbox();
    setInFlightCount(outbox.length);
    const shadow = getShadowLedger();
    setShadowDocCount(shadow.issues?.length || 0);
    const history = getReconciliationHistory();
    if (history.length > 0) setLastReport(history[0]);
  }, []);

  useEffect(() => {
    refreshState();
    const interval = setInterval(refreshState, 2000);
    return () => clearInterval(interval);
  }, [refreshState]);

  const triggerBlackout = useCallback(() => {
    triggerBlackoutWipe();
    refreshState();
  }, [refreshState]);

  const triggerCorruption = useCallback(() => {
    triggerBitRotCorruption();
    refreshState();
  }, [refreshState]);

  const resetSystem = useCallback(() => {
    resetDisasterSimulation();
    refreshState();
  }, [refreshState]);

  const runRecovery = useCallback(async () => {
    setRecoveryLoading(true);
    try {
      const report = await executeAutonomousRecovery();
      setLastReport(report);
      resetDisasterSimulation();
      refreshState();
      return report;
    } finally {
      setRecoveryLoading(false);
    }
  }, [refreshState]);

  const value: ResilienceContextType = {
    isBlackout: simState.active,
    isWiped: simState.wiped,
    isCorrupted: simState.corrupted,
    inFlightCount,
    shadowDocCount,
    recoveryLoading,
    lastReport,
    modalOpen,
    setModalOpen,
    triggerBlackout,
    triggerCorruption,
    resetSystem,
    runRecovery,
    refreshState,
  };

  return <ResilienceContext.Provider value={value}>{children}</ResilienceContext.Provider>;
};

export const useResilience = (): ResilienceContextType => {
  const context = useContext(ResilienceContext);
  if (!context) {
    throw new Error('useResilience must be used within a ResilienceProvider');
  }
  return context;
};
