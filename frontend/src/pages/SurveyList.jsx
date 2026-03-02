import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { api } from '../api/index.js';

const ROLE_LABELS = {
  TITULAIRE: 'Titulaire',
  AGENT_B: 'Agent B',
  RENFORT: 'Renfort',
  EA: 'EA',
};

const STATUS_CONFIG = {
  EN_COURS: { label: 'En cours', icon: Clock, color: 'text-blue-600 bg-blue-50' },
  FINALISEE: { label: 'Finalisée', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
};

const FILTERS = [
  { value: 'ALL', label: 'Toutes' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'FINALISEE', label: 'Finalisées' },
];

export default function SurveyList() {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getSurveys()
      .then(setSurveys)
      .catch(() => setError('Impossible de charger les enquêtes'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = surveys.filter((s) => filter === 'ALL' || s.status === filter);

  return (
    <div className="max-w-2xl mx-auto">
      {/* En-tête sticky */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 pt-4 pb-3 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900">Enquêtes</h1>
          <button
            onClick={() => navigate('/surveys/new')}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium active:bg-blue-700"
          >
            <Plus size={18} />
            Nouvelle
          </button>
        </div>
        <div className="flex gap-2">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3">
        {loading && (
          <div className="text-center py-16 text-gray-400">Chargement...</div>
        )}
        {error && (
          <div className="flex items-center justify-center gap-2 py-16 text-red-500">
            <AlertCircle size={18} />
            {error}
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-base font-medium">Aucune enquête</p>
            <p className="text-sm mt-1">
              {filter === 'ALL' ? 'Créez votre première enquête' : `Aucune enquête ${filter === 'EN_COURS' ? 'en cours' : 'finalisée'}`}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {filtered.map((survey) => {
            const status = STATUS_CONFIG[survey.status];
            const StatusIcon = status.icon;
            const progress =
              survey.total_criteria > 0
                ? Math.round((survey.evaluated_criteria / survey.total_criteria) * 100)
                : 0;

            return (
              <div
                key={survey.id}
                onClick={() => navigate(`/surveys/${survey.id}/evaluate`)}
                className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 active:bg-gray-50 cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-gray-900 truncate">
                      {survey.last_name} {survey.first_name}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full shrink-0">
                      {ROLE_LABELS[survey.role]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{new Date(survey.date).toLocaleDateString('fr-FR')}</span>
                    {survey.reference && <span>· {survey.reference}</span>}
                    {survey.evaluator && <span>· {survey.evaluator}</span>}
                  </div>
                  {survey.total_criteria > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            survey.status === 'FINALISEE' ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">
                        {survey.evaluated_criteria}/{survey.total_criteria}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${status.color}`}>
                    <StatusIcon size={12} />
                    {status.label}
                  </span>
                  <ChevronRight size={18} className="text-gray-300" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
