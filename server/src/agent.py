"""
Agent

High-level API for managing Agora Conversational AI Agents.
"""
import os
import json
import time
from typing import Any, Dict
from shengwang_agent import AgentClient, Area
from shengwang_agent.agentkit import Agent as AgoraAgent
from shengwang_agent.agentkit.vendors import DeepSeekLLM, MicrosoftSTT, MiniMaxTTS


class Agent:
    """
    High-level wrapper for Agora Conversational AI Agent operations.
    
    Uses AgentSession for full lifecycle management (start/stop),
    which handles Token007 authentication automatically.
    """
    
    def __init__(self):
        self.app_id = os.getenv("APP_ID")
        self.app_certificate = os.getenv("APP_CERTIFICATE")
        
        if not self.app_id or not self.app_certificate:
            raise ValueError("APP_ID and APP_CERTIFICATE are required")
        
        self.client = AgentClient(
            area=Area.CN,
            app_id=self.app_id,
            app_certificate=self.app_certificate,
        )
        
        # Track active sessions by agent_id
        self._sessions: Dict[str, Any] = {}
    
    def start(
        self,
        channel_name: str,
        agent_uid: str,
        user_uid: str
    ) -> Dict[str, Any]:
        """Start agent with ASR, LLM, and TTS configuration."""
        if not channel_name or not str(channel_name).strip():
            raise ValueError("channel_name is required and cannot be empty")
        if not agent_uid or not str(agent_uid).strip():
            raise ValueError("agent_uid is required and cannot be empty")
        if not user_uid or not str(user_uid).strip():
            raise ValueError("user_uid is required and cannot be empty")

        # DeepSeek LLM
        llm_api_key = os.getenv("LLM_API_KEY")
        llm_url = os.getenv("LLM_URL", "https://api.deepseek.com/v1/chat/completions")
        llm_model = os.getenv("LLM_MODEL", "deepseek-chat")

        # Microsoft STT
        stt_key = os.getenv("STT_MICROSOFT_KEY")
        stt_region = os.getenv("STT_MICROSOFT_REGION", "chinaeast2")

        # MiniMax TTS
        tts_key = os.getenv("TTS_MINIMAX_KEY")
        tts_model = os.getenv("TTS_MINIMAX_MODEL", "speech-01-turbo")
        tts_voice_id = os.getenv("TTS_MINIMAX_VOICE_ID", "male-qn-qingse")
        tts_group_id = os.getenv("TTS_MINIMAX_GROUP_ID")

        name = f"agent_{channel_name}_{agent_uid}_{int(time.time())}"
        
        agora_agent = AgoraAgent(
            name=name,
            instructions="You are a helpful AI assistant.",
            greeting="Hello! I am your AI assistant. How can I help you?",
            failure_message="I'm sorry, I'm having trouble processing your request.",
            advanced_features={"enable_rtm": True},
            parameters={"data_channel": "rtm", "enable_error_message": True},
        )
        
        agora_agent = (
            agora_agent
            .with_llm(DeepSeekLLM(url=llm_url, api_key=llm_api_key, model=llm_model))
            .with_tts(MiniMaxTTS(
                key=tts_key,
                model=tts_model,
                voice_setting={"voice_id": tts_voice_id, "speed": 1.0},
                group_id=tts_group_id,
            ))
            .with_stt(MicrosoftSTT(key=stt_key, region=stt_region, language="zh-CN"))
        )
        
        session = agora_agent.create_session(
            client=self.client,
            channel=channel_name,
            agent_uid=str(agent_uid),
            remote_uids=["*"],
            enable_string_uid=True,
            idle_timeout=120,
        )

        # Debug: print the request body that will be sent to Agora cloud
        props = agora_agent.to_properties(
            channel=channel_name,
            agent_uid=str(agent_uid),
            remote_uids=["*"],
            idle_timeout=120,
            enable_string_uid=True,
            app_id=self.app_id,
            app_certificate=self.app_certificate,
        )
        props_dict = props.model_dump(mode="json", exclude_none=True)
        print("\n===== Request Body to Agora Cloud =====")
        print(json.dumps(props_dict, indent=2, ensure_ascii=False))
        print("=======================================\n")

        agent_id = session.start()
        
        # Save session for later stop
        self._sessions[agent_id] = session
        
        return {
            "agent_id": agent_id,
            "channel_name": channel_name,
            "status": "started",
        }
    
    def stop(self, agent_id: str) -> None:
        """Stop a running agent via its session."""
        if not agent_id or not str(agent_id).strip():
            raise ValueError("agent_id is required and cannot be empty")
        
        session = self._sessions.pop(agent_id, None)
        if session:
            session.stop()
        else:
            raise ValueError(f"No active session found for agent_id: {agent_id}")
