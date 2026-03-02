import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { api } from '../../api/index.js';
import Modal from '../../components/Modal.jsx';

export default function CollaboratorsAdmin() {
  const [teams, setTeams] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [expandedTeams, setExpandedTeams] = useState({});
  const [modal, setModal] = useState(null); // null | { type: 'team'|'collaborator', data?, teamId? }
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const load = () => {
    Promise.all([api.getTeams(), api.getCollaborators()]).then(([t, c]) => {
      setTeams(t);
      setCollaborators(c);
    });
  };

  useEffect(() => { load(); }, []);

  const toggleTeam = (id) => {
    setExpandedTeams((prev) => ({ ...prev, [id]: prev[id] === false ? true : false }));
  };

  const isTeamExpanded = (id) => expandedTeams[id] !== false;

  const openTeamModal = (team = null) => {
    setFormError(null);
    setForm(team ? { name: team.name, manager: team.manager || '' } : { name: '', manager: '' });
    setModal({ type: 'team', data: team });
  };

  const openCollaboratorModal = (collaborator = null, teamId = null) => {
    setFormError(null);
    setForm(
      collaborator
        ? {
            first_name: collaborator.first_name,
            last_name: collaborator.last_name,
            team_id: collaborator.team_id,
          }
        : { first_name: '', last_name: '', team_id: teamId }
    );
    setModal({ type: 'collaborator', data: collaborator, teamId });
  };

  const handleSave = async () => {
    if (modal.type === 'team' && !form.name?.trim()) {
      setFormError("Le nom de l'équipe est requis");
      return;
    }
    if (modal.type === 'collaborator' && (!form.first_name?.trim() || !form.last_name?.trim())) {
      setFormError('Le prénom et le nom sont requis');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (modal.type === 'team') {
        if (modal.data) {
          await api.updateTeam(modal.data.id, form);
        } else {
          await api.createTeam(form);
        }
      } else {
        if (modal.data) {
          await api.updateCollaborator(modal.data.id, form);
        } else {
          await api.createCollaborator(form);
        }
      }
      load();
      setModal(null);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async (team) => {
    const teamCollaborators = collaborators.filter((c) => c.team_id === team.id);
    const msg =
      teamCollaborators.length > 0
        ? `Supprimer l'équipe "${team.name}" et ses ${teamCollaborators.length} collaborateur(s) ?`
        : `Supprimer l'équipe "${team.name}" ?`;
    if (!window.confirm(msg)) return;
    try {
      await api.deleteTeam(team.id);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteCollaborator = async (collaborator) => {
    if (!window.confirm(`Supprimer ${collaborator.first_name} ${collaborator.last_name} ?`)) return;
    try {
      await api.deleteCollaborator(collaborator.id);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const getCollaboratorsForTeam = (teamId) =>
    collaborators.filter((c) => c.team_id === teamId);

  return (
    <div className="max-w-2xl mx-auto">
      {/* En-tête */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
        <h1 className="text-xl font-bold text-gray-900">Équipes & Collaborateurs</h1>
        <button
          onClick={() => openTeamModal()}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium active:bg-blue-700"
        >
          <Plus size={18} />
          Équipe
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        {teams.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="font-medium">Aucune équipe</p>
            <p className="text-sm mt-1">Commencez par créer une équipe</p>
          </div>
        )}

        {teams.map((team) => {
          const teamCollaborators = getCollaboratorsForTeam(team.id);
          const expanded = isTeamExpanded(team.id);

          return (
            <div key={team.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* En-tête de l'équipe */}
              <div
                className="flex items-center px-4 py-3.5 cursor-pointer select-none"
                onClick={() => toggleTeam(team.id)}
              >
                {expanded
                  ? <ChevronDown size={18} className="text-gray-400 shrink-0" />
                  : <ChevronRight size={18} className="text-gray-400 shrink-0" />
                }
                <div className="ml-2 flex-1 min-w-0">
                  <span className="font-semibold text-gray-900">{team.name}</span>
                  {team.manager && (
                    <span className="ml-2 text-sm text-gray-500">· {team.manager}</span>
                  )}
                </div>
                <span className="text-sm text-gray-400 mr-3 shrink-0">
                  {teamCollaborators.length} collaborateur{teamCollaborators.length !== 1 ? 's' : ''}
                </span>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openCollaboratorModal(null, team.id)}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                    title="Ajouter un collaborateur"
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    onClick={() => openTeamModal(team)}
                    className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg"
                    title="Modifier l'équipe"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => handleDeleteTeam(team)}
                    className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                    title="Supprimer l'équipe"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Liste des collaborateurs */}
              {expanded && (
                <div className="border-t border-gray-100">
                  {teamCollaborators.length === 0 && (
                    <div className="px-4 py-4 text-sm text-gray-400 text-center">
                      Aucun collaborateur —{' '}
                      <button
                        onClick={() => openCollaboratorModal(null, team.id)}
                        className="text-blue-500 font-medium"
                      >
                        Ajouter
                      </button>
                    </div>
                  )}
                  {teamCollaborators.map((col, idx) => (
                    <div
                      key={col.id}
                      className={`flex items-center px-4 py-3 ${
                        idx < teamCollaborators.length - 1 ? 'border-b border-gray-100' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {col.last_name} {col.first_name}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => openCollaboratorModal(col)}
                          className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteCollaborator(col)}
                          className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal création/édition */}
      {modal && (
        <Modal
          title={
            modal.type === 'team'
              ? modal.data ? "Modifier l'équipe" : 'Nouvelle équipe'
              : modal.data ? 'Modifier le collaborateur' : 'Nouveau collaborateur'
          }
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            {formError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                <AlertCircle size={14} />
                {formError}
              </div>
            )}

            {modal.type === 'team' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nom de l'équipe *
                  </label>
                  <input
                    type="text"
                    value={form.name || ''}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Manager</label>
                  <input
                    type="text"
                    value={form.manager || ''}
                    onChange={(e) => setForm({ ...form, manager: e.target.value })}
                    placeholder="Nom du manager (optionnel)"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom *</label>
                  <input
                    type="text"
                    value={form.last_name || ''}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    placeholder="Nom de famille"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Prénom *</label>
                  <input
                    type="text"
                    value={form.first_name || ''}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Prénom"
                  />
                </div>
                {/* Changement d'équipe si édition */}
                {modal.data && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Équipe</label>
                    <select
                      value={form.team_id || ''}
                      onChange={(e) => setForm({ ...form, team_id: Number(e.target.value) })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 active:bg-blue-700"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
