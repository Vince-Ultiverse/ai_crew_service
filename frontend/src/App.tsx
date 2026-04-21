import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AgentList from './pages/AgentList';
import AgentCreate from './pages/AgentCreate';
import AgentDetail from './pages/AgentDetail';
import Templates from './pages/Templates';
import ProjectList from './pages/ProjectList';
import ProjectCreate from './pages/ProjectCreate';
import ProjectDetail from './pages/ProjectDetail';
import CharacterList from './pages/CharacterList';
import CharacterChat from './pages/CharacterChat';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/agents" element={<AgentList />} />
        <Route path="/agents/new" element={<AgentCreate />} />
        <Route path="/agents/:id/edit" element={<AgentCreate />} />
        <Route path="/agents/:id" element={<AgentDetail />} />
        <Route path="/projects" element={<ProjectList />} />
        <Route path="/projects/new" element={<ProjectCreate />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/characters" element={<CharacterList />} />
        <Route path="/characters/:slug" element={<CharacterChat />} />
      </Routes>
    </Layout>
  );
}
