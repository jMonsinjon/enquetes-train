import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/index.js';

const QUEUE_KEY = 'sync_queue';

function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// Fusionne le payload avec l'entrée existante pour la même évaluation
function addToQueue(item) {
  const queue = getQueue();
  const existingIdx = queue.findIndex(
    (q) => q.surveyId === item.surveyId && q.evaluationId === item.evaluationId
  );
  if (existingIdx >= 0) {
    queue[existingIdx] = { ...queue[existingIdx], ...item, timestamp: Date.now() };
  } else {
    queue.push({ ...item, timestamp: Date.now() });
  }
  saveQueue(queue);
}

function removeFromQueue(surveyId, evaluationId) {
  saveQueue(
    getQueue().filter(
      (q) => !(q.surveyId === surveyId && q.evaluationId === evaluationId)
    )
  );
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(getQueue().length);
  const isSyncing = useRef(false);

  const updatePendingCount = useCallback(() => {
    setPendingCount(getQueue().length);
  }, []);

  const processQueue = useCallback(async () => {
    if (isSyncing.current || !navigator.onLine) return;

    const queue = getQueue();
    if (queue.length === 0) return;

    isSyncing.current = true;

    for (const item of [...queue]) {
      try {
        const payload = {};
        if (item.value !== undefined) payload.value = item.value;
        if (item.comment !== undefined) payload.comment = item.comment;
        await api.updateEvaluation(item.surveyId, item.evaluationId, payload);
        removeFromQueue(item.surveyId, item.evaluationId);
        updatePendingCount();
      } catch {
        break;
      }
    }

    isSyncing.current = false;
    updatePendingCount();
  }, [updatePendingCount]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      if (navigator.onLine && getQueue().length > 0) {
        processQueue();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [processQueue]);

  /**
   * Synchronise un changement (value et/ou comment) vers le serveur.
   * payload: { value?, comment? }
   * Sauvegarde locale immédiate, envoi réseau en arrière-plan.
   */
  const syncUpdate = useCallback(async (surveyId, evaluationId, payload) => {
    addToQueue({ surveyId, evaluationId, ...payload });
    updatePendingCount();

    try {
      await api.updateEvaluation(surveyId, evaluationId, payload);
      removeFromQueue(surveyId, evaluationId);
      updatePendingCount();
    } catch {
      // Échec réseau : restera dans la file et sera retentée à la reconnexion
    }
  }, [updatePendingCount]);

  return { isOnline, pendingCount, syncUpdate };
}
