import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Lock, Edit, ChevronDown, ChevronRight, MessageSquare } from 'lucide-react';
import { api } from '../api/index.js';
import { useOfflineSync } from '../hooks/useOfflineSync.js';
import SyncIndicator from '../components/SyncIndicator.jsx';

const EVAL_VALUES = [
  { value: 'CONFORME',     label: 'Conforme',     activeClass: 'bg-green-500 text-white',  inactiveClass: 'bg-white text-gray-500 hover:bg-green-50' },
  { value: 'PARTIEL',      label: 'Partiel',      activeClass: 'bg-amber-400 text-white',  inactiveClass: 'bg-white text-gray-500 hover:bg-amber-50' },
  { value: 'NON_CONFORME', label: 'Non conforme', activeClass: 'bg-red-500 text-white',    inactiveClass: 'bg-white text-gray-500 hover:bg-red-50' },
  { value: 'NON_EVALUE',   label: 'Non évalué',   activeClass: 'bg-gray-200 text-gray-600', inactiveClass: 'bg-white text-gray-400 hover:bg-gray-50' },
];

const VALUE_BADGE = {
  CONFORME:     { label: 'Conforme',     cls: 'bg-green-100 text-green-700' },
  PARTIEL:      { label: 'Partiel',      cls: 'bg-amber-100 text-amber-700' },
  NON_CONFORME: { label: 'Non conforme', cls: 'bg-red-100 text-red-700' },
  NON_EVALUE:   null,
};

const ROLE_LABELS = { TITULAIRE: 'Titulaire', AGENT_B: 'Agent B', RENFORT: 'Renfort', EA: 'EA' };
const CACHE_KEY = (id) => `survey_eval_${id}`;

export default function SurveyEvaluation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isOnline, pendingCount, syncUpdate } = useOfflineSync();

  const [survey, setSurvey] = useState(null);
  const [evaluations, setEvaluations] = useState({});  // { evaluationId: value }
  const [comments, setComments] = useState({});          // { evaluationId: comment }
  const [expandedEvalId, setExpandedEvalId] = useState(null);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const commentDebounces = useRef({});

  useEffect(() => {
    api.getSurvey(id)
      .then((data) => {
        setSurvey(data);

        const evalMap = {};
        const commentMap = {};
        data.groups.forEach((g) => {
          g.criteria.forEach((c) => {
            evalMap[c.evaluation_id] = c.value;
            commentMap[c.evaluation_id] = c.comment || '';
          });
        });

        // Appliquer les modifications en attente (value et comment)
        try {
          const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
          queue
            .filter((q) => q.surveyId === Number(id))
            .forEach((q) => {
              if (q.value !== undefined) evalMap[q.evaluationId] = q.value;
              if (q.comment !== undefined) commentMap[q.evaluationId] = q.comment;
            });
        } catch { /* ignore */ }

        setEvaluations(evalMap);
        setComments(commentMap);
        localStorage.setItem(CACHE_KEY(id), JSON.stringify({ survey: data, evalMap, commentMap }));
      })
      .catch(() => {
        try {
          const cached = localStorage.getItem(CACHE_KEY(id));
          if (cached) {
            const { survey: s, evalMap, commentMap } = JSON.parse(cached);
            setSurvey(s);
            setEvaluations(evalMap);
            setComments(commentMap || {});
          }
        } catch { /* ignore */ }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const updateCache = useCallback((nextEvalMap, nextCommentMap) => {
    try {
      const cached = localStorage.getItem(CACHE_KEY(id));
      if (cached) {
        const parsed = JSON.parse(cached);
        if (nextEvalMap) parsed.evalMap = nextEvalMap;
        if (nextCommentMap) parsed.commentMap = nextCommentMap;
        localStorage.setItem(CACHE_KEY(id), JSON.stringify(parsed));
      }
    } catch { /* ignore */ }
  }, [id]);

  const handleEvalChange = useCallback((evaluationId, value) => {
    setEvaluations((prev) => {
      const next = { ...prev, [evaluationId]: value };
      updateCache(next, null);
      return next;
    });
    syncUpdate(Number(id), evaluationId, { value });
  }, [id, syncUpdate, updateCache]);

  const handleCommentChange = useCallback((evaluationId, comment) => {
    setComments((prev) => {
      const next = { ...prev, [evaluationId]: comment };
      updateCache(null, next);
      return next;
    });
    // Debounce : attendre 800ms après la dernière frappe avant d'envoyer
    if (commentDebounces.current[evaluationId]) {
      clearTimeout(commentDebounces.current[evaluationId]);
    }
    commentDebounces.current[evaluationId] = setTimeout(() => {
      syncUpdate(Number(id), evaluationId, { comment });
    }, 800);
  }, [id, syncUpdate, updateCache]);

  const handleFinalize = async () => {
    setFinalizing(true);
    try {
      await api.finalizeSurvey(id);
      localStorage.removeItem(CACHE_KEY(id));
      navigate('/');
    } catch {
      setFinalizing(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-gray-400">Chargement...</div>;
  }
  if (!survey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
        <p className="text-gray-500">Enquête introuvable ou hors ligne.</p>
        <button onClick={() => navigate('/')} className="text-blue-600 font-medium">Retour</button>
      </div>
    );
  }

  const groups = survey.groups || [];
  const isFinalized = survey.status === 'FINALISEE';
  const totalCriteria = groups.reduce((acc, g) => acc + g.criteria.length, 0);
  const evaluatedCriteria = Object.values(evaluations).filter((v) => v !== 'NON_EVALUE').length;
  const progress = totalCriteria > 0 ? Math.round((evaluatedCriteria / totalCriteria) * 100) : 0;
  const activeGroup = groups[activeGroupIndex] || null;

  return (
    <div className="max-w-2xl mx-auto flex flex-col" style={{ minHeight: 'calc(100vh - 56px)' }}>
      {/* En-tête sticky */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-start gap-2 mb-2">
            <button
              onClick={() => navigate('/')}
              className="p-1.5 -ml-1 rounded-lg text-gray-500 hover:bg-gray-100 mt-0.5 shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-gray-900 truncate">
                  {survey.last_name} {survey.first_name}
                </span>
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full shrink-0">
                  {ROLE_LABELS[survey.role]}
                </span>
                {survey.reference && (
                  <span className="text-xs text-gray-400 shrink-0">#{survey.reference}</span>
                )}
                {survey.evaluator && (
                  <span className="text-xs text-gray-500 shrink-0">· par {survey.evaluator}</span>
                )}
                {isFinalized ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium shrink-0">
                    <Lock size={11} />
                    Finalisée
                  </span>
                ) : (
                  <button
                    onClick={() => navigate(`/surveys/${id}/edit`)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 shrink-0"
                  >
                    <Edit size={11} />
                    Modifier
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${isFinalized ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 shrink-0">{evaluatedCriteria}/{totalCriteria}</span>
                <SyncIndicator isOnline={isOnline} pendingCount={pendingCount} />
              </div>
            </div>
          </div>
        </div>

        {/* Onglets groupes */}
        {groups.length > 0 && (
          <div className="flex overflow-x-auto scrollbar-hide px-4 pb-2.5 gap-2">
            {groups.map((group, idx) => {
              const groupEvaluated = group.criteria.filter(
                (c) => evaluations[c.evaluation_id] !== 'NON_EVALUE'
              ).length;
              const isComplete = groupEvaluated === group.criteria.length && group.criteria.length > 0;
              const isActive = activeGroupIndex === idx;
              return (
                <button
                  key={group.id}
                  onClick={() => { setActiveGroupIndex(idx); setExpandedEvalId(null); }}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {group.name}
                  {isComplete && (
                    <CheckCircle size={14} className={isActive ? 'text-blue-200' : 'text-green-500'} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Liste des critères en accordéon */}
      <div className="flex-1 px-4 py-3 space-y-2">
        {groups.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            Aucun critère applicable pour ce rôle.
          </div>
        )}

        {activeGroup && activeGroup.criteria.map((criterion) => {
          const currentValue = evaluations[criterion.evaluation_id] || 'NON_EVALUE';
          const currentComment = comments[criterion.evaluation_id] || '';
          const isExpanded = expandedEvalId === criterion.evaluation_id;
          const badge = VALUE_BADGE[currentValue];
          const hasComment = currentComment.trim().length > 0;

          return (
            <div
              key={criterion.criteria_id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              {/* En-tête du critère — cliquable pour ouvrir/fermer */}
              <div
                className="flex items-center px-4 py-3.5 cursor-pointer select-none gap-3"
                onClick={() => setExpandedEvalId(isExpanded ? null : criterion.evaluation_id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 leading-snug">{criterion.name}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Icône commentaire si un commentaire existe */}
                  {hasComment && (
                    <MessageSquare size={14} className="text-blue-400" />
                  )}
                  {/* Badge valeur (masqué si NON_EVALUE) */}
                  {badge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                  )}
                  {isExpanded
                    ? <ChevronDown size={18} className="text-gray-400" />
                    : <ChevronRight size={18} className="text-gray-400" />
                  }
                </div>
              </div>

              {/* Contenu dépliable */}
              {isExpanded && (
                <div className="border-t border-gray-100">
                  {/* Description si présente */}
                  {criterion.description && (
                    <p className="px-4 pt-3 text-sm text-gray-500">{criterion.description}</p>
                  )}

                  {/* Boutons d'évaluation — grille 2×2 */}
                  <div className="grid grid-cols-2 gap-px bg-gray-100 mt-3">
                    {EVAL_VALUES.map(({ value, label, activeClass, inactiveClass }) => (
                      <button
                        key={value}
                        disabled={isFinalized}
                        onClick={() => !isFinalized && handleEvalChange(criterion.evaluation_id, value)}
                        className={`py-3.5 text-sm font-medium transition-all active:scale-95 ${
                          currentValue === value ? activeClass : inactiveClass
                        } ${isFinalized ? 'cursor-default' : ''}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Commentaire libre */}
                  <div className="px-4 pb-4 pt-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      Commentaire
                    </label>
                    <textarea
                      value={currentComment}
                      onChange={(e) => handleCommentChange(criterion.evaluation_id, e.target.value)}
                      disabled={isFinalized}
                      rows={3}
                      placeholder={isFinalized ? '' : 'Observation libre...'}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bouton de finalisation */}
      {!isFinalized && (
        <div className="px-4 py-3 bg-white border-t border-gray-100">
          {showFinalizeConfirm ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 text-center">
                Finaliser définitivement cette enquête ?<br />
                <span className="text-gray-400">Cette action est irréversible.</span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFinalizeConfirm(false)}
                  className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium active:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleFinalize}
                  disabled={finalizing}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold active:bg-green-700 disabled:opacity-50"
                >
                  {finalizing ? 'En cours...' : 'Confirmer'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowFinalizeConfirm(true)}
              className="w-full py-3.5 bg-green-600 text-white rounded-xl font-semibold active:bg-green-700 flex items-center justify-center gap-2"
            >
              <CheckCircle size={20} />
              Finaliser l'enquête
            </button>
          )}
        </div>
      )}
    </div>
  );
}
