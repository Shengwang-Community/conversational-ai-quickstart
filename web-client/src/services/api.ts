const API_BASE_URL = '/api'

export interface GetConfigResponse {
  app_id: string
  token: string
  uid: string
  channel_name: string
  agent_uid: string
}

export async function getConfig(): Promise<GetConfigResponse> {
  const response = await fetch(`${API_BASE_URL}/get_config`, {
    method: 'GET',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  const result = await response.json()
  if (result.code !== 0 || !result.data) {
    throw new Error(result.msg || 'Failed to get configuration')
  }
  return result.data
}

export async function startAgent(channelName: string, rtcUid: string, userUid: string): Promise<string> {
  const payload = { channelName, rtcUid, userUid }

  // Debug: Log the request payload
  console.log('🔍 startAgent Request:', {
    url: `${API_BASE_URL}/v2/startAgent`,
    method: 'POST',
    payload: payload,
    curl: `curl -X POST ${window.location.origin}${API_BASE_URL}/v2/startAgent \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload, null, 2)}'`,
  })

  const response = await fetch(`${API_BASE_URL}/v2/startAgent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  const result = await response.json()
  if (result.code !== 0 || !result.data?.agent_id) {
    throw new Error(result.msg || 'Failed to start agent')
  }
  return result.data.agent_id
}

export async function stopAgent(channelName: string, agentId: string): Promise<void> {
  if (!agentId) return

  const response = await fetch(`${API_BASE_URL}/v2/stopAgent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channelName, agentId }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || `HTTP ${response.status}`)
  }
}
