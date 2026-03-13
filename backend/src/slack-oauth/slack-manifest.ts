export function buildSlackManifest(
  agentName: string,
  redirectUri: string,
): Record<string, any> {
  const displayName = `AI Crew - ${agentName}`.substring(0, 35);
  const botName = agentName.substring(0, 80);

  return {
    display_information: {
      name: displayName,
      description: 'OpenClaw AI Agent managed by AI Crew',
    },
    features: {
      bot_user: {
        display_name: botName,
        always_online: true,
      },
    },
    oauth_config: {
      scopes: {
        bot: [
          'app_mentions:read',
          'channels:history',
          'channels:read',
          'chat:write',
          'groups:history',
          'groups:read',
          'im:history',
          'im:read',
          'im:write',
          'mpim:history',
          'mpim:read',
          'reactions:write',
          'users:read',
        ],
      },
      redirect_urls: [redirectUri],
    },
    settings: {
      event_subscriptions: {
        bot_events: ['app_mention', 'message.im'],
      },
      interactivity: {
        is_enabled: false,
      },
      org_deploy_enabled: false,
      socket_mode_enabled: true,
      token_rotation_enabled: false,
    },
  };
}
