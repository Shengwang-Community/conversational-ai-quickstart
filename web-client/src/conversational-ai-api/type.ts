export enum ETranscriptHelperMode {
  TEXT = 'text',
  WORD = 'word',
  CHUNK = 'chunk',
  UNKNOWN = 'unknown',
}

export enum EMessageType {
  USER_TRANSCRIPTION = 'user.transcription',
  AGENT_TRANSCRIPTION = 'assistant.transcription',
  MSG_INTERRUPTED = 'message.interrupt',
  MSG_METRICS = 'message.metrics',
  MSG_ERROR = 'message.error',
  IMAGE_UPLOAD = 'image.upload',
  MESSAGE_INFO = 'message.info',
  MESSAGE_SAL_STATUS = 'message.sal_status',
}

export enum ERTMEvents {
  MESSAGE = 'message',
  PRESENCE = 'presence',
  STATUS = 'status',
}

export enum ERTCEvents {
  NETWORK_QUALITY = 'network-quality',
  USER_PUBLISHED = 'user-published',
  USER_UNPUBLISHED = 'user-unpublished',
  STREAM_MESSAGE = 'stream-message',
  USER_JOINED = 'user-joined',
  USER_LEFT = 'user-left',
  CONNECTION_STATE_CHANGE = 'connection-state-change',
  AUDIO_PTS = 'audio-pts',
}

export enum EConversationalAIAPIEvents {
  AGENT_STATE_CHANGED = 'agent-state-changed',
  AGENT_INTERRUPTED = 'agent-interrupted',
  AGENT_METRICS = 'agent-metrics',
  AGENT_ERROR = 'agent-error',
  TRANSCRIPT_UPDATED = 'transcript-updated',
  DEBUG_LOG = 'debug-log',
  MESSAGE_RECEIPT_UPDATED = 'message-receipt-updated',
  MESSAGE_ERROR = 'message-error',
  MESSAGE_SAL_STATUS = 'message-sal-status',
}

export enum EModuleType {
  LLM = 'llm',
  MLLM = 'mllm',
  TTS = 'tts',
  CONTEXT = 'context',
  UNKNOWN = 'unknown',
}

export enum EAgentState {
  IDLE = 'idle',
  LISTENING = 'listening',
  THINKING = 'thinking',
  SPEAKING = 'speaking',
  SILENT = 'silent',
}

export enum ETurnStatus {
  IN_PROGRESS = 0,
  END = 1,
  INTERRUPTED = 2,
}

export enum EChatMessagePriority {
  INTERRUPTED = 'interrupted',
  APPEND = 'append',
  IGNORE = 'ignore',
}

export enum EChatMessageType {
  TEXT = 'text',
  IMAGE = 'image',
  UNKNOWN = 'unknown',
}

export interface IChatMessageText {
  messageType: EChatMessageType.TEXT
  text: string
  priority?: EChatMessagePriority
  responseInterruptable?: boolean
}

export interface IChatMessageImage {
  messageType: EChatMessageType.IMAGE
  uuid: string
  url?: string
  base64?: string
}

export type TAgentMetric = {
  type: EModuleType
  name: string
  value: number
  timestamp: number
}

export type TMessageReceipt = {
  moduleType: EModuleType
  messageType: EChatMessageType
  message: string
  turnId: number
}

export type TModuleError = {
  type: EModuleType
  code: number
  message: string
  timestamp: number
}

export type TStateChangeEvent = {
  state: EAgentState
  turnID: number
  timestamp: number
  reason: string
}

export type TDataChunkMessageWord = {
  word: string
  start_ms: number
  duration_ms: number
  stable: boolean
}

export type TTranscriptHelperObjectWord = TDataChunkMessageWord & {
  word_status?: ETurnStatus
}

export interface ITranscriptionBase {
  object: EMessageType
  text: string
  start_ms: number
  duration_ms: number
  language: string
  turn_id: number
  stream_id: number
  user_id: string
  words: TDataChunkMessageWord[] | null
}

export interface IUserTranscription extends ITranscriptionBase {
  object: EMessageType.USER_TRANSCRIPTION
  final: boolean
}

export interface IAgentTranscription extends ITranscriptionBase {
  object: EMessageType.AGENT_TRANSCRIPTION
  quiet: boolean
  turn_seq_id: number
  turn_status: ETurnStatus
}

export interface IMessageInterrupt {
  object: EMessageType.MSG_INTERRUPTED
  message_id: string
  data_type: 'message'
  turn_id: number
  start_ms: number
  send_ts: number
}

export interface IMessageMetrics {
  object: EMessageType.MSG_METRICS
  module: EModuleType
  metric_name: string
  turn_id: number
  latency_ms: number
  send_ts: number
}

export interface IMessageError {
  object: EMessageType.MSG_ERROR
  module: EModuleType
  code: number
  message: string
  turn_id: number
  send_ts: number
  [x: string]: unknown
}

export interface ITranscriptHelperItem<T> {
  uid: string
  stream_id: number
  turn_id: number
  _time: number
  text: string
  status: ETurnStatus
  metadata: T | null
}

export type TQueueItem = {
  turn_id: number
  text: string
  words: TTranscriptHelperObjectWord[]
  status: ETurnStatus
  stream_id: number
  uid: string
}

export interface IConversationalAIAPIEventHandlers {
  [EConversationalAIAPIEvents.AGENT_STATE_CHANGED]: (agentUserId: string, event: TStateChangeEvent) => void
  [EConversationalAIAPIEvents.AGENT_INTERRUPTED]: (
    agentUserId: string,
    event: { turnID: number; timestamp: number },
  ) => void
  [EConversationalAIAPIEvents.AGENT_METRICS]: (agentUserId: string, metrics: TAgentMetric) => void
  [EConversationalAIAPIEvents.AGENT_ERROR]: (agentUserId: string, error: TModuleError) => void
  [EConversationalAIAPIEvents.TRANSCRIPT_UPDATED]: (
    transcription: ITranscriptHelperItem<Partial<IUserTranscription | IAgentTranscription>>[],
  ) => void
  [EConversationalAIAPIEvents.DEBUG_LOG]: (message: string) => void
  [EConversationalAIAPIEvents.MESSAGE_RECEIPT_UPDATED]: (agentUserId: string, messageReceipt: TMessageReceipt) => void
  [EConversationalAIAPIEvents.MESSAGE_ERROR]: (
    agentUserId: string,
    error: { type: EChatMessageType; code: number; message: string; timestamp: number },
  ) => void
  [EConversationalAIAPIEvents.MESSAGE_SAL_STATUS]: (agentUserId: string, salStatus: IMessageSalStatus) => void
}

export interface IPresenceState {
  publisher: string
  timestamp: number
  stateChanged: {
    state: EAgentState
    turn_id: string
  }
}

export enum EMessageSalStatus {
  VP_DISABLED = 'VP_DISABLED',
  VP_UNREGISTER = 'VP_UNREGISTER',
  VP_REGISTERING = 'VP_REGISTERING',
  VP_REGISTER_SUCCESS = 'VP_REGISTER_SUCCESS',
  VP_REGISTER_FAIL = 'VP_REGISTER_FAIL',
  VP_REGISTER_DUPLICATE = 'VP_REGISTER_DUPLICATE',
}

export interface IMessageSalStatus {
  object: EMessageType.MESSAGE_SAL_STATUS
  status: EMessageSalStatus
  timestamp: number
  data_type: string
  message_id: string
  send_ts: number
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}
