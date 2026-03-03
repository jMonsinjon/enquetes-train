import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import SurveyList from './pages/SurveyList.jsx';
import SurveyForm from './pages/SurveyForm.jsx';
import SurveyEvaluation from './pages/SurveyEvaluation.jsx';
import CriteriaAdmin from './pages/admin/CriteriaAdmin.jsx';
import CollaboratorsAdmin from './pages/admin/CollaboratorsAdmin.jsx';
import Stats from './pages/Stats.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<SurveyList />} />
          <Route path="surveys/new" element={<SurveyForm />} />
          <Route path="surveys/:id/edit" element={<SurveyForm />} />
          <Route path="surveys/:id/evaluate" element={<SurveyEvaluation />} />
          <Route path="admin/criteria" element={<CriteriaAdmin />} />
          <Route path="admin/collaborators" element={<CollaboratorsAdmin />} />
          <Route path="stats" element={<Stats />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
