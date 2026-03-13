import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { CreateAgentPayload, Agent } from '../types';
import { api } from '../api/client';
import AgentForm from '../components/AgentForm';
import { useTheme } from '../theme';

export default function AgentCreate() {
  const { theme } = useTheme();
  const { colors, pixelCard, pixelHeading, labels } = theme;
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const templateIdFromUrl = searchParams.get('template') || undefined;
  const [initial, setInitial] = useState<Partial<CreateAgentPayload> | undefined>();
  const [loading, setLoading] = useState(!!id);
  const isEdit = !!id;

  useEffect(() => {
    if (id) {
      api.getAgent(id)
        .then((agent: Agent) => {
          setInitial({
            name: agent.name,
            slug: agent.slug,
            slack_bot_token: agent.slack_bot_token || '',
            slack_app_token: agent.slack_app_token || '',
            slack_enabled: agent.slack_enabled,
            llm_provider: agent.llm_provider,
            llm_api_key: agent.llm_api_key || '',
            llm_model: agent.llm_model || '',
            system_prompt: agent.system_prompt || '',
            soul_prompt: agent.soul_prompt || '',
            agents_prompt: agent.agents_prompt || '',
            user_prompt: agent.user_prompt || '',
            tools_prompt: agent.tools_prompt || '',
            openclaw_config: agent.openclaw_config,
            skills: agent.skills,
            memory_limit: agent.memory_limit,
            cpu_limit: agent.cpu_limit,
            template_id: agent.template_id || '',
          });
          setLoading(false);
        })
        .catch(() => {
          navigate('/agents');
        });
    }
  }, [id, navigate]);

  const handleSubmit = async (data: CreateAgentPayload) => {
    try {
      if (isEdit && id) {
        await api.updateAgent(id, data);
        navigate(`/agents/${id}`);
      } else {
        const agent = await api.createAgent(data);
        navigate(`/agents/${agent.id}`);
      }
    } catch (e: any) {
      alert(`Failed: ${e.message}`);
    }
  };

  if (loading) return (
    <div style={{
      ...pixelCard(),
      textAlign: 'center',
      fontFamily: theme.fonts.heading,
      fontSize: 10,
      color: colors.textLight,
    }}>
      Loading...
    </div>
  );

  return (
    <div>
      <h1 style={{ ...pixelHeading(), fontSize: 14, marginBottom: 24 }}>
        {isEdit ? labels.pageHeadings.agentEdit : labels.pageHeadings.agentCreate}
      </h1>
      <AgentForm
        initial={initial}
        onSubmit={handleSubmit}
        submitLabel={isEdit ? labels.pageHeadings.agentEdit : labels.pageHeadings.agentCreate}
        agentId={isEdit ? id : undefined}
        initialTemplateId={isEdit ? undefined : templateIdFromUrl}
      />
    </div>
  );
}
