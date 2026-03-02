import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { api } from '../api/index.js';

const ROLES = [
  { value: 'TITULAIRE', label: 'Titulaire' },
  { value: 'AGENT_B', label: 'Agent B' },
  { value: 'RENFORT', label: 'Renfort' },
  { value: 'EA', label: 'EA' },
];

export default function SurveyForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [form, setForm] = useState({
    reference: '',
    date: new Date().toISOString().split('T')[0],
    collaborator_id: '',
    role: 'TITULAIRE',
    evaluator: '',
  });
  const [collaborators, setCollaborators] = useState([]);
  const [criteriaCount, setCriteriaCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getCollaborators().then(setCollaborators);
    if (isEditing) {
      api.getSurvey(id).then((survey) => {
        setForm({
          reference: survey.reference || '',
          date: survey.date,
          collaborator_id: String(survey.collaborator_id),
          role: survey.role,
          evaluator: survey.evaluator || '',
        });
      });
    }
  }, [id, isEditing]);

  useEffect(() => {
    if (form.role) {
      api.getCriteriaCountForRole(form.role)
        .then((data) => setCriteriaCount(data.count))
        .catch(() => setCriteriaCount(null));
    }
  }, [form.role]);

  // Grouper les collaborateurs par équipe pour le <select>
  const collaboratorsByTeam = collaborators.reduce((acc, col) => {
    const team = col.team_name || 'Sans équipe';
    if (!acc[team]) acc[team] = [];
    acc[team].push(col);
    return acc;
  }, {});

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.collaborator_id || !form.date || !form.role) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = {
        ...form,
        collaborator_id: Number(form.collaborator_id),
        reference: form.reference.trim() || null,
        evaluator: form.evaluator.trim() || null,
      };

      let survey;
      if (isEditing) {
        survey = await api.updateSurvey(id, data);
      } else {
        survey = await api.createSurvey(data);
      }

      navigate(`/surveys/${survey.id}/evaluate`);
    } catch (err) {
      setError(err.message || 'Une erreur est survenue');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* En-tête */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-1 rounded-lg text-gray-500 hover:bg-gray-100"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">
          {isEditing ? "Modifier l'enquête" : 'Nouvelle enquête'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-5">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-3 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Référence */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Référence</label>
          <input
            type="text"
            value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
            placeholder="Ex : ENQ-2024-001 (optionnel)"
            className="w-full border border-gray-300 rounded-xl px-3 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Collaborateur */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Collaborateur <span className="text-red-500">*</span>
          </label>
          <select
            value={form.collaborator_id}
            onChange={(e) => setForm({ ...form, collaborator_id: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-3 py-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Sélectionner un collaborateur</option>
            {Object.entries(collaboratorsByTeam).map(([team, cols]) => (
              <optgroup key={team} label={team}>
                {cols.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.last_name} {col.first_name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {collaborators.length === 0 && (
            <p className="mt-1.5 text-xs text-amber-600">
              Aucun collaborateur disponible. Ajoutez-en dans l'onglet Équipes.
            </p>
          )}
        </div>

        {/* Évaluateur */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Évaluateur</label>
          <input
            type="text"
            value={form.evaluator}
            onChange={(e) => setForm({ ...form, evaluator: e.target.value })}
            placeholder="Nom de l'évaluateur (optionnel)"
            className="w-full border border-gray-300 rounded-xl px-3 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Rôle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rôle <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {ROLES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm({ ...form, role: value })}
                className={`py-3.5 rounded-xl font-medium text-sm border-2 transition-all ${
                  form.role === value
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 bg-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {criteriaCount !== null && (
            <p className="mt-2 text-sm text-gray-500">
              {criteriaCount === 0
                ? 'Aucun critère défini pour ce rôle'
                : `${criteriaCount} critère${criteriaCount !== 1 ? 's' : ''} à évaluer pour ce rôle`}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold text-base active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {loading ? 'Enregistrement...' : isEditing ? 'Enregistrer' : "Créer l'enquête"}
        </button>
      </form>
    </div>
  );
}
