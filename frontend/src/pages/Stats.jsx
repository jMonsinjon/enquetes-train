import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Users } from 'lucide-react';
import { api } from '../api/index.js';

const SCORE_MAX = 3;

const PIE_COLORS = {
  CONFORME:     '#22c55e',
  PARTIEL:      '#f59e0b',
  NON_CONFORME: '#ef4444',
  NON_EVALUE:   '#d1d5db',
};

const PIE_LABELS = {
  CONFORME:     'Conforme',
  PARTIEL:      'Partiel',
  NON_CONFORME: 'Non conforme',
  NON_EVALUE:   'Non évalué',
};

function ScoreBar({ score }) {
  const pct = ((score - 1) / (SCORE_MAX - 1)) * 100;
  const color = pct >= 66 ? 'bg-green-500' : pct >= 33 ? 'bg-amber-400' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-700 w-8 text-right">
        {score.toFixed(1)}
      </span>
    </div>
  );
}

function CriterionCard({ rank, criterion, variant }) {
  const isWorst = variant === 'worst';
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start gap-3">
        <span
          className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold ${
            isWorst ? 'bg-red-500' : 'bg-green-500'
          }`}
        >
          {rank}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 leading-tight">{criterion.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {criterion.eval_count} évaluation{criterion.eval_count > 1 ? 's' : ''}
          </p>
          <ScoreBar score={Number(criterion.avg_score)} />
        </div>
      </div>
    </div>
  );
}

export default function Stats() {
  const [topCriteria, setTopCriteria] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [selectedCollab, setSelectedCollab] = useState('');
  const [collabStats, setCollabStats] = useState(null);
  const [loadingTop, setLoadingTop] = useState(true);
  const [loadingPie, setLoadingPie] = useState(false);
  const [errorTop, setErrorTop] = useState(null);
  const [errorPie, setErrorPie] = useState(null);

  useEffect(() => {
    setLoadingTop(true);
    Promise.all([api.getTopCriteria(), api.getCollaborators()])
      .then(([top, collabs]) => {
        setTopCriteria(top);
        setCollaborators(collabs);
      })
      .catch((err) => setErrorTop(err.message))
      .finally(() => setLoadingTop(false));
  }, []);

  useEffect(() => {
    if (!selectedCollab) {
      setCollabStats(null);
      return;
    }
    setLoadingPie(true);
    setErrorPie(null);
    api.getCollaboratorStats(selectedCollab)
      .then(setCollabStats)
      .catch((err) => setErrorPie(err.message))
      .finally(() => setLoadingPie(false));
  }, [selectedCollab]);

  const pieData = collabStats
    ? Object.entries(collabStats)
        .filter(([, count]) => count > 0)
        .map(([key, count]) => ({
          name: PIE_LABELS[key],
          value: count,
          color: PIE_COLORS[key],
        }))
    : [];

  const totalPie = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Statistiques</h1>

      {/* TOP CRITÈRES */}
      {loadingTop && (
        <p className="text-gray-400 text-sm text-center py-8">Chargement…</p>
      )}
      {errorTop && (
        <p className="text-red-500 text-sm text-center py-4">{errorTop}</p>
      )}

      {topCriteria && (
        <>
          {/* TOP 3 pires */}
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown size={18} className="text-red-500" />
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                TOP 3 — Critères les plus faibles
              </h2>
            </div>
            {topCriteria.worst.length === 0 ? (
              <p className="text-gray-400 text-sm">Aucune donnée disponible.</p>
            ) : (
              <div className="space-y-3">
                {topCriteria.worst.map((c, i) => (
                  <CriterionCard key={c.id} rank={i + 1} criterion={c} variant="worst" />
                ))}
              </div>
            )}
          </section>

          {/* TOP 3 meilleurs */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={18} className="text-green-500" />
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                TOP 3 — Critères les plus solides
              </h2>
            </div>
            {topCriteria.best.length === 0 ? (
              <p className="text-gray-400 text-sm">Aucune donnée disponible.</p>
            ) : (
              <div className="space-y-3">
                {topCriteria.best.map((c, i) => (
                  <CriterionCard key={c.id} rank={i + 1} criterion={c} variant="best" />
                ))}
              </div>
            )}
          </section>

          <hr className="border-gray-200 mb-8" />
        </>
      )}

      {/* PIE CHART PAR COLLABORATEUR */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-blue-500" />
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Répartition par collaborateur
          </h2>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sélectionner un collaborateur
          </label>
          <select
            value={selectedCollab}
            onChange={(e) => setSelectedCollab(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Choisir —</option>
            {collaborators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {loadingPie && (
          <p className="text-gray-400 text-sm text-center py-4">Chargement…</p>
        )}
        {errorPie && (
          <p className="text-red-500 text-sm text-center py-2">{errorPie}</p>
        )}

        {collabStats && !loadingPie && (
          totalPie === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">
              Aucune évaluation trouvée pour ce collaborateur.
            </p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value} critère${value > 1 ? 's' : ''}`, name]}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={10}
                    formatter={(value) => (
                      <span className="text-xs text-gray-700">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )
        )}
      </section>
    </div>
  );
}
