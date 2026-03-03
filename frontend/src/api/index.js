const BASE = '/api';

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Groupes
  getGroups: () => request('GET', '/groups'),
  createGroup: (data) => request('POST', '/groups', data),
  updateGroup: (id, data) => request('PUT', `/groups/${id}`, data),
  deleteGroup: (id) => request('DELETE', `/groups/${id}`),

  // Critères
  getCriteria: () => request('GET', '/criteria'),
  createCriterion: (data) => request('POST', '/criteria', data),
  updateCriterion: (id, data) => request('PUT', `/criteria/${id}`, data),
  deleteCriterion: (id) => request('DELETE', `/criteria/${id}`),
  getCriteriaCountForRole: (role) => request('GET', `/criteria/count-for-role/${role}`),

  // Équipes
  getTeams: () => request('GET', '/teams'),
  createTeam: (data) => request('POST', '/teams', data),
  updateTeam: (id, data) => request('PUT', `/teams/${id}`, data),
  deleteTeam: (id) => request('DELETE', `/teams/${id}`),

  // Collaborateurs
  getCollaborators: () => request('GET', '/collaborators'),
  createCollaborator: (data) => request('POST', '/collaborators', data),
  updateCollaborator: (id, data) => request('PUT', `/collaborators/${id}`, data),
  deleteCollaborator: (id) => request('DELETE', `/collaborators/${id}`),

  // Enquêtes
  getSurveys: () => request('GET', '/surveys'),
  getSurvey: (id) => request('GET', `/surveys/${id}`),
  createSurvey: (data) => request('POST', '/surveys', data),
  updateSurvey: (id, data) => request('PUT', `/surveys/${id}`, data),
  finalizeSurvey: (id) => request('POST', `/surveys/${id}/finalize`),
  deleteSurvey: (id) => request('DELETE', `/surveys/${id}`),
  updateEvaluation: (surveyId, evaluationId, payload) =>
    request('PATCH', `/surveys/${surveyId}/evaluations/${evaluationId}`, payload),

  // Statistiques
  getTopCriteria: () => request('GET', '/stats/top-criteria'),
  getCollaboratorStats: (id) => request('GET', `/stats/collaborator/${id}`),
};
