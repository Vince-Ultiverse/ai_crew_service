import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AgentList from './pages/AgentList';
import AgentCreate from './pages/AgentCreate';
import AgentDetail from './pages/AgentDetail';
import Templates from './pages/Templates';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/agents" element={<AgentList />} />
        <Route path="/agents/new" element={<AgentCreate />} />
        <Route path="/agents/:id/edit" element={<AgentCreate />} />
        <Route path="/agents/:id" element={<AgentDetail />} />
        <Route path="/templates" element={<Templates />} />
      </Routes>
    </Layout>
  );
}
