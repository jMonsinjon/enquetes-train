import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { api } from '../../api/index.js';
import Modal from '../../components/Modal.jsx';

const ROLE_OPTIONS = [
  { value: 'TOUS', label: 'Tous les rôles' },
  { value: 'TITULAIRE', label: 'Titulaire' },
  { value: 'AGENT_B', label: 'Agent B' },
  { value: 'RENFORT', label: 'Renfort' },
  { value: 'EA', label: 'EA' },
];

const ROLE_BADGE_COLORS = {
  TOUS: 'bg-blue-50 text-blue-600',
  TITULAIRE: 'bg-purple-50 text-purple-600',
  AGENT_B: 'bg-green-50 text-green-600',
  RENFORT: 'bg-amber-50 text-amber-600',
  EA: 'bg-red-50 text-red-600',
};

export default function CriteriaAdmin() {
  const [groups, setGroups] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [modal, setModal] = useState(null); // null | { type: 'group'|'criterion', data?, groupId? }
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const load = () => {
    Promise.all([api.getGroups(), api.getCriteria()]).then(([g, c]) => {
      setGroups(g);
      setCriteria(c);
    });
  };

  useEffect(() => { load(); }, []);

  const toggleGroup = (id) => {
    setExpandedGroups((prev) => ({ ...prev, [id]: prev[id] === false ? true : false }));
  };

  const isGroupExpanded = (id) => expandedGroups[id] !== false; // ouvert par défaut

  const openGroupModal = (group = null) => {
    setFormError(null);
    setForm(group ? { name: group.name, sort_order: group.sort_order } : { name: '', sort_order: 0 });
    setModal({ type: 'group', data: group });
  };

  const openCriterionModal = (criterion = null, groupId = null) => {
    setFormError(null);
    setForm(
      criterion
        ? {
            name: criterion.name,
            description: criterion.description || '',
            roles: criterion.roles,
            sort_order: criterion.sort_order,
            group_id: criterion.group_id,
          }
        : { name: '', description: '', roles: 'TOUS', sort_order: 0, group_id: groupId }
    );
    setModal({ type: 'criterion', data: criterion, groupId });
  };

  const handleSave = async () => {
    if (!form.name?.trim()) {
      setFormError('Le nom est requis');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (modal.type === 'group') {
        if (modal.data) {
          await api.updateGroup(modal.data.id, form);
        } else {
          await api.createGroup(form);
        }
      } else {
        if (modal.data) {
          await api.updateCriterion(modal.data.id, form);
        } else {
          await api.createCriterion(form);
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

  const handleDeleteGroup = async (group) => {
    const groupCriteria = criteria.filter((c) => c.group_id === group.id);
    const msg =
      groupCriteria.length > 0
        ? `Supprimer le groupe "${group.name}" et ses ${groupCriteria.length} critère(s) ?`
        : `Supprimer le groupe "${group.name}" ?`;
    if (!window.confirm(msg)) return;
    try {
      await api.deleteGroup(group.id);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteCriterion = async (criterion) => {
    if (!window.confirm(`Supprimer le critère "${criterion.name}" ?`)) return;
    try {
      await api.deleteCriterion(criterion.id);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const getCriteriaForGroup = (groupId) => criteria.filter((c) => c.group_id === groupId);

  return (
    <div className="max-w-2xl mx-auto">
      {/* En-tête */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
        <h1 className="text-xl font-bold text-gray-900">Groupes & Critères</h1>
        <button
          onClick={() => openGroupModal()}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium active:bg-blue-700"
        >
          <Plus size={18} />
          Groupe
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        {groups.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="font-medium">Aucun groupe de critères</p>
            <p className="text-sm mt-1">Commencez par créer un groupe</p>
          </div>
        )}

        {groups.map((group) => {
          const groupCriteria = getCriteriaForGroup(group.id);
          const expanded = isGroupExpanded(group.id);

          return (
            <div key={group.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* En-tête du groupe */}
              <div
                className="flex items-center px-4 py-3.5 cursor-pointer select-none"
                onClick={() => toggleGroup(group.id)}
              >
                {expanded
                  ? <ChevronDown size={18} className="text-gray-400 shrink-0" />
                  : <ChevronRight size={18} className="text-gray-400 shrink-0" />
                }
                <span className="ml-2 font-semibold text-gray-900 flex-1">{group.name}</span>
                <span className="text-sm text-gray-400 mr-3">
                  {groupCriteria.length} critère{groupCriteria.length !== 1 ? 's' : ''}
                </span>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openCriterionModal(null, group.id)}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                    title="Ajouter un critère"
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    onClick={() => openGroupModal(group)}
                    className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg"
                    title="Modifier le groupe"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(group)}
                    className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                    title="Supprimer le groupe"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Liste des critères */}
              {expanded && (
                <div className="border-t border-gray-100">
                  {groupCriteria.length === 0 && (
                    <div className="px-4 py-4 text-sm text-gray-400 text-center">
                      Aucun critère —{' '}
                      <button
                        onClick={() => openCriterionModal(null, group.id)}
                        className="text-blue-500 font-medium"
                      >
                        Ajouter
                      </button>
                    </div>
                  )}
                  {groupCriteria.map((criterion, idx) => (
                    <div
                      key={criterion.id}
                      className={`flex items-center px-4 py-3 ${
                        idx < groupCriteria.length - 1 ? 'border-b border-gray-100' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{criterion.name}</p>
                        {criterion.description && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{criterion.description}</p>
                        )}
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full mr-2 shrink-0 font-medium ${
                          ROLE_BADGE_COLORS[criterion.roles] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {ROLE_OPTIONS.find((r) => r.value === criterion.roles)?.label || criterion.roles}
                      </span>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => openCriterionModal(criterion)}
                          className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteCriterion(criterion)}
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
            modal.type === 'group'
              ? modal.data ? 'Modifier le groupe' : 'Nouveau groupe'
              : modal.data ? 'Modifier le critère' : 'Nouveau critère'
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom *</label>
              <input
                type="text"
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            {modal.type === 'criterion' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                  <textarea
                    value={form.description || ''}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Description optionnelle du critère..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rôle associé</label>
                  <div className="space-y-2">
                    {ROLE_OPTIONS.map(({ value, label }) => (
                      <label key={value} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="roles"
                          value={value}
                          checked={form.roles === value}
                          onChange={() => setForm({ ...form, roles: value })}
                          className="text-blue-600 w-4 h-4"
                        />
                        <span className="text-sm text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {modal.type === 'group' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Ordre d'affichage
                </label>
                <input
                  type="number"
                  value={form.sort_order ?? 0}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Les groupes sont triés par ordre croissant, puis alphabétiquement.</p>
              </div>
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
