import {
  type EAgentState,
  EChatMessageType,
  type EConversationalAIAPIEvents,
  EMessageType,
  EModuleType,
  ETranscriptHelperMode,
  ETurnStatus,
  type IAgentTranscription,
  type IConversationalAIAPIEventHandlers,
  type IMessageError,
  type IMessageInterrupt,
  type IMessageMetrics,
  type IMessageSalStatus,
  type IPresenceState,
  type ITranscriptHelperItem,
  type ITranscriptionBase,
  type IUserTranscription,
  type TDataChunkMessageWord,
  type TQueueItem,
  type TTranscriptHelperObjectWord,
} from '@/conversational-ai-api/type'
import { factoryFormatLog } from '@/conversational-ai-api/utils'
import { ELoggerType, logger } from '@/lib/logger'
import _ from 'lodash'

const TAG = 'CovSubRenderController'
const SELF_USER_ID = 0
const VERSION = '1.8.0'
const DEFAULT_INTERVAL = 200
const DEFAULT_CHUNK_INTERVAL = 100

const formatLog = factoryFormatLog({ tag: TAG })

export class CovSubRenderController {
  private static NAME = TAG
  private static VERSION = VERSION
  private callMessagePrint: (type: ELoggerType, ...args: unknown[]) => void
  public static self_uid = SELF_USER_ID

  private _mode: ETranscriptHelperMode = ETranscriptHelperMode.UNKNOWN
  private _queue: TQueueItem[] = []
  private _interval: number
  private _intervalRef: ReturnType<typeof setInterval> | null = null
  private _pts = 0
  private _lastPoppedQueueItem: TQueueItem | null | undefined = null
  private _isRunning = false
  private _agentMessageState: { state: EAgentState; turn_id: string | number; timestamp: number } | null = null
  private _transcriptChunk: { index: number; data: IAgentTranscription; uid: string } | null = null

  public chatHistory: ITranscriptHelperItem<Partial<IUserTranscription | IAgentTranscription>>[] = []
  public onChatHistoryUpdated: IConversationalAIAPIEventHandlers[EConversationalAIAPIEvents.TRANSCRIPT_UPDATED] | null =
    null
  public onAgentStateChanged: IConversationalAIAPIEventHandlers[EConversationalAIAPIEvents.AGENT_STATE_CHANGED] | null =
    null
  public onAgentInterrupted: IConversationalAIAPIEventHandlers[EConversationalAIAPIEvents.AGENT_INTERRUPTED] | null =
    null
  public onDebugLog: IConversationalAIAPIEventHandlers[EConversationalAIAPIEvents.DEBUG_LOG] | null = null
  public onAgentMetrics: IConversationalAIAPIEventHandlers[EConversationalAIAPIEvents.AGENT_METRICS] | null = null
  public onAgentError: IConversationalAIAPIEventHandlers[EConversationalAIAPIEvents.AGENT_ERROR] | null = null
  public onMessageReceipt:
    | IConversationalAIAPIEventHandlers[EConversationalAIAPIEvents.MESSAGE_RECEIPT_UPDATED]
    | null = null
  public onMessageError: IConversationalAIAPIEventHandlers[EConversationalAIAPIEvents.MESSAGE_ERROR] | null = null
  public onMessageSalStatus: IConversationalAIAPIEventHandlers[EConversationalAIAPIEvents.MESSAGE_SAL_STATUS] | null =
    null

  constructor(
    options: {
      interval?: number
      onChatHistoryUpdated?: IConversationalAIAPIEventHandlers[EConversationalAIAPIEvents.TRANSCRIPT_UPDATED]
      onAgentStateChanged?: IConversationalAIAPIEventHandlers[EConversationalAIAPIEvents.AGENT_STATE_CHANGED]
      onAgentInterrupted?: IConversationalAIAPIEventHandlers[EConversationalAIAPIEvents.AGENT_INTERRUPTED]
      onDebugLog?: IConversationalAIAPIEventHandlers[EConversationalAIAPIEvents.DEBUG_LOG]
      onAgentMetrics?: IConversationalAIAPIEventHandlers[EConversationalAIAPIEvents.AGENT_METRICS]
      onAgentError?: IConversationalAIAPIEventHandlers[EConversationalAIAPIEvents.AGENT_ERROR]
      onMessageReceipt?: IConversationalAIAPIEventHandlers[EConversationalAIAPIEvents.MESSAGE_RECEIPT_UPDATED]
      onMessageError?: IConversationalAIAPIEventHandlers[EConversationalAIAPIEvents.MESSAGE_ERROR]
      onMessageSalStatus?: IConversationalAIAPIEventHandlers[EConversationalAIAPIEvents.MESSAGE_SAL_STATUS]
    } = {},
  ) {
    this.callMessagePrint = (type: ELoggerType = ELoggerType.debug, ...args: unknown[]) => {
      logger[type](formatLog(...args))
      this.onDebugLog?.(`[${type}] ${formatLog(...args)}`)
    }
    this.callMessagePrint(
      ELoggerType.debug,
      `${CovSubRenderController.NAME} initialized, version: ${CovSubRenderController.VERSION}`,
    )
    this._interval = options.interval ?? DEFAULT_INTERVAL
    this.onChatHistoryUpdated = options.onChatHistoryUpdated ?? null
    this.onAgentStateChanged = options.onAgentStateChanged ?? null
    this.onAgentInterrupted = options.onAgentInterrupted ?? null
    this.onDebugLog = options.onDebugLog ?? null
    this.onAgentMetrics = options.onAgentMetrics ?? null
    this.onAgentError = options.onAgentError ?? null
    this.onMessageReceipt = options.onMessageReceipt ?? null
    this.onMessageError = options.onMessageError ?? null
    this.onMessageSalStatus = options.onMessageSalStatus ?? null
  }

  private _setupIntervalForWords(options?: { isForce?: boolean }) {
    if (!this._isRunning) return
    if (options?.isForce) {
      if (this._intervalRef) clearInterval(this._intervalRef)
      this._intervalRef = setInterval(this._handleQueue.bind(this), this._interval)
      return
    }
    if (!this._intervalRef) {
      this._intervalRef = setInterval(this._handleQueue.bind(this), this._interval)
    }
  }

  private _handleQueue() {
    const queueLength = this._queue.length
    if (queueLength === 0) return
    const curPTS = this._pts
    if (queueLength === 1) {
      this._handleTurnObj(this._queue[0], curPTS)
      this._mutateChatHistory()
      return
    }
    if (queueLength > 1) {
      this._queue = this._queue.sort((a, b) => a.turn_id - b.turn_id)
      const nextItem = this._queue[this._queue.length - 1]
      const lastItem = this._queue[this._queue.length - 2]
      const firstWordOfNextItem = nextItem.words[0]
      if (firstWordOfNextItem.start_ms > curPTS) {
        this._handleTurnObj(lastItem, curPTS)
        this._mutateChatHistory()
        return
      }
      const lastItemCorresponding = this.chatHistory.find(
        (item) => item.turn_id === lastItem.turn_id && item.stream_id === lastItem.stream_id,
      )
      if (lastItemCorresponding) lastItemCorresponding.status = ETurnStatus.INTERRUPTED
      this._lastPoppedQueueItem = this._queue.shift()
      this._handleTurnObj(nextItem, curPTS)
      this._mutateChatHistory()
    }
  }

  private _handleTurnObj(queueItem: TQueueItem, curPTS: number) {
    let correspondingItem = this.chatHistory.find(
      (item) => item.turn_id === queueItem.turn_id && item.stream_id === queueItem.stream_id,
    )
    if (!correspondingItem) {
      correspondingItem = {
        turn_id: queueItem.turn_id,
        uid: queueItem.uid,
        stream_id: queueItem.stream_id,
        _time: Date.now(),
        text: '',
        status: queueItem.status,
        metadata: queueItem,
      }
      this._appendChatHistory(correspondingItem)
    }
    correspondingItem._time = Date.now()
    correspondingItem.metadata = queueItem
    if (queueItem.status === ETurnStatus.INTERRUPTED) correspondingItem.status = ETurnStatus.INTERRUPTED

    const validWords: TTranscriptHelperObjectWord[] = []
    const restWords: TTranscriptHelperObjectWord[] = []
    for (const word of queueItem.words) {
      if (word.start_ms <= curPTS) validWords.push(word)
      else restWords.push(word)
    }
    const isRestWordsEmpty = restWords.length === 0
    const isLastWordFinal = validWords[validWords.length - 1]?.word_status !== ETurnStatus.IN_PROGRESS
    if (isRestWordsEmpty && isLastWordFinal) {
      correspondingItem.text = queueItem.text
      correspondingItem.status = queueItem.status
      this._lastPoppedQueueItem = this._queue.shift()
      return
    }
    correspondingItem.text = validWords
      .filter((w) => w.start_ms <= this._pts)
      .map((w) => w.word)
      .join('')
    if (validWords[validWords.length - 1]?.word_status === ETurnStatus.INTERRUPTED) {
      this._lastPoppedQueueItem = this._queue.shift()
    }
  }

  private _mutateChatHistory() {
    this.onChatHistoryUpdated?.(this.chatHistory)
  }

  private _appendChatHistory(item: ITranscriptHelperItem<Partial<IUserTranscription | IAgentTranscription>>) {
    if (item.turn_id === 0) this.chatHistory = [item, ...this.chatHistory]
    else this.chatHistory.push(item)
  }

  private _interruptQueue(options: { turn_id: number; start_ms: number }) {
    const correspondingItem = this._queue.find((item) => item.turn_id === options.turn_id)
    if (!correspondingItem) return
    correspondingItem.status = ETurnStatus.INTERRUPTED
    const leftWords = correspondingItem.words.filter((w) => w.start_ms <= options.start_ms)
    const rightWords = correspondingItem.words.filter((w) => w.start_ms > options.start_ms)
    if (leftWords.length === 0) {
      for (const w of correspondingItem.words) {
        w.word_status = ETurnStatus.INTERRUPTED
      }
    } else {
      leftWords[leftWords.length - 1].word_status = ETurnStatus.INTERRUPTED
      if (leftWords[leftWords.length - 2]) leftWords[leftWords.length - 2].word_status = ETurnStatus.INTERRUPTED
      for (const w of rightWords) {
        w.word_status = ETurnStatus.INTERRUPTED
      }
      correspondingItem.words = [...leftWords, ...rightWords]
    }
  }

  private _pushToQueue(data: {
    turn_id: number
    words: TTranscriptHelperObjectWord[]
    text: string
    status: ETurnStatus
    stream_id: number
    uid: string
  }) {
    const targetItem = this._queue.find((item) => item.turn_id === data.turn_id)
    const latestTurnId = this._queue.reduce((max, item) => Math.max(max, item.turn_id), 0)
    if (!targetItem) {
      if (data.turn_id < latestTurnId) return
      this._queue.push({
        turn_id: data.turn_id,
        text: data.text,
        words: this.sortWordsWithStatus(data.words, data.status),
        status: data.status,
        stream_id: data.stream_id,
        uid: data.uid,
      })
      return
    }
    targetItem.text = data.text
    targetItem.words = this.sortWordsWithStatus([...targetItem.words, ...data.words], data.status)
    if (targetItem.status !== ETurnStatus.IN_PROGRESS && data.status === ETurnStatus.IN_PROGRESS) return
    targetItem.status = data.status
  }

  private _teardownInterval() {
    if (this._intervalRef) {
      clearInterval(this._intervalRef)
      this._intervalRef = null
    }
  }

  protected sortWordsWithStatus(words: TDataChunkMessageWord[], turn_status: ETurnStatus) {
    if (words.length === 0) return words as TTranscriptHelperObjectWord[]
    const sortedWords: TTranscriptHelperObjectWord[] = words
      .map((w) => ({ ...w, word_status: ETurnStatus.IN_PROGRESS }))
      .sort((a, b) => a.start_ms - b.start_ms)
      .reduce((acc, curr) => {
        if (!acc.find((w) => w.start_ms === curr.start_ms)) acc.push(curr)
        return acc
      }, [] as TTranscriptHelperObjectWord[])
    if (turn_status !== ETurnStatus.IN_PROGRESS) sortedWords[sortedWords.length - 1].word_status = turn_status
    return sortedWords
  }

  protected handleTextMessage(uid: string, message: IUserTranscription) {
    const { turn_id, text = '', stream_id } = message
    const targetItem = this.chatHistory.find((item) => item.turn_id === turn_id && item.stream_id === stream_id)
    if (!targetItem) {
      this._appendChatHistory({
        turn_id,
        uid: stream_id ? `${CovSubRenderController.self_uid}` : `${uid}`,
        stream_id,
        _time: Date.now(),
        text,
        status: ETurnStatus.END,
        metadata: message,
      })
    } else {
      targetItem.text = text
      targetItem.status = ETurnStatus.END
      targetItem.metadata = message
      targetItem._time = Date.now()
    }
    this._mutateChatHistory()
  }

  private _handleTranscriptChunk() {
    if (!this._transcriptChunk) return
    const { index, data, uid } = this._transcriptChunk
    const maxLength = data.text.length
    const nextIdx = index + 1 >= maxLength ? maxLength : index + 1
    this._transcriptChunk.index = nextIdx
    const validText = data.text.substring(0, nextIdx)
    const isEnded =
      validText.length > 0 && data.turn_status !== ETurnStatus.IN_PROGRESS && validText.length === data.text.length
    const targetItem = this.chatHistory.find(
      (item) => item.turn_id === data.turn_id && item.stream_id === data.stream_id,
    )
    if (!targetItem) {
      this._appendChatHistory({
        turn_id: data.turn_id,
        uid: data.stream_id ? `${CovSubRenderController.self_uid}` : `${uid}`,
        stream_id: data.stream_id,
        _time: Date.now(),
        text: validText,
        status: data.turn_status,
        metadata: data,
      })
    } else {
      targetItem.text = validText
      targetItem.status = isEnded ? data.turn_status : targetItem.status
      targetItem.metadata = data
      targetItem._time = Date.now()
    }
    this._mutateChatHistory()
  }

  protected handleChunkTextMessage(uid: string, message: IAgentTranscription) {
    if (this._transcriptChunk && this._transcriptChunk.data.turn_id < message.turn_id) {
      this._teardownInterval()
      const lastItem = this.chatHistory.find(
        (item) => item.turn_id === this._transcriptChunk?.data.turn_id && item.uid === uid,
      )
      if (lastItem) lastItem.status = ETurnStatus.END
      this._transcriptChunk = null
    }
    this._transcriptChunk = { index: this._transcriptChunk?.index ?? 0, data: message, uid }
    if (!this._intervalRef) this._intervalRef = setInterval(this._handleTranscriptChunk.bind(this), this._interval)
  }

  protected handleMessageInterrupt(uid: string, message: IMessageInterrupt) {
    const { turn_id, start_ms } = message
    const adjustedStartMs = _.min([start_ms, this._pts]) || start_ms
    this._interruptQueue({ turn_id, start_ms: adjustedStartMs })
    if (this._transcriptChunk) {
      this._teardownInterval()
      const lastItem = this.chatHistory.find(
        (item) => item.turn_id === this._transcriptChunk?.data.turn_id && item.uid === uid,
      )
      if (lastItem) lastItem.status = ETurnStatus.INTERRUPTED
      this._transcriptChunk = null
    }
    this._mutateChatHistory()
    this.onAgentInterrupted?.(`${uid}`, { turnID: turn_id, timestamp: adjustedStartMs })
  }

  protected handleMessageMetrics(uid: string, message: IMessageMetrics) {
    if (!Object.values(EModuleType).includes(message.module)) return
    this.onAgentMetrics?.(`${uid}`, {
      type: message.module,
      name: message.metric_name,
      value: message.latency_ms,
      timestamp: message.send_ts,
    })
  }

  protected handleMessageSalStatus(uid: string, message: IMessageSalStatus) {
    this.onMessageSalStatus?.(`${uid}`, message)
  }

  protected handleMessageError(uid: string, message: IMessageError) {
    if (!Object.values(EModuleType).includes(message.module)) return
    if (message.module === EModuleType.CONTEXT) {
      try {
        const messageData = JSON.parse(message.message)
        this.onMessageError?.(`${uid}`, {
          type: messageData?.module === 'picture' ? EChatMessageType.IMAGE : EChatMessageType.UNKNOWN,
          code: message.code || -1,
          message: message.message,
          timestamp: message.send_ts || Date.now(),
        })
      } catch {}
    }
    this.onAgentError?.(`${uid}`, {
      type: message.module,
      code: message.code || -1,
      message: message.message,
      timestamp: message.send_ts || Date.now(),
    })
  }

  protected handleMessageInfo(uid: string, message: Record<string, unknown>) {
    try {
      const messageStr = (message?.message as string) || ''
      const messageObj = JSON.parse(messageStr)
      const moduleType = message?.module as EModuleType
      const turnId = message?.turn_id as number
      if (!messageStr || !messageObj || !moduleType || !turnId) return
      this.onMessageReceipt?.(uid, {
        moduleType,
        messageType: message?.resource_type === 'picture' ? EChatMessageType.IMAGE : EChatMessageType.UNKNOWN,
        message: messageStr,
        turnId,
      })
    } catch {}
  }

  public handleAgentStatus(metadata: IPresenceState) {
    const message = metadata.stateChanged
    const currentTurnId = _.toNumber(message.turn_id) || 0
    if (_.toNumber(this._agentMessageState?.turn_id || 0) > currentTurnId) return
    if (_.toNumber(this._agentMessageState?.timestamp || 0) >= metadata.timestamp) return
    this._agentMessageState = { state: message.state, turn_id: message.turn_id, timestamp: metadata.timestamp }
    this.onAgentStateChanged?.(metadata.publisher, {
      state: message.state,
      turnID: _.toNumber(message.turn_id),
      timestamp: metadata.timestamp,
      reason: '',
    })
  }

  protected handleWordAgentMessage(uid: string, message: IAgentTranscription) {
    if (typeof message.turn_status === 'undefined') return
    const { turn_id, text = '', words = [], stream_id } = message
    const lastPoppedTurnId = this._lastPoppedQueueItem?.turn_id
    if (lastPoppedTurnId && turn_id !== 0 && turn_id <= lastPoppedTurnId) return
    this._pushToQueue({
      uid: stream_id ? `${CovSubRenderController.self_uid}` : `${uid}`,
      turn_id,
      words: words as TTranscriptHelperObjectWord[],
      text,
      status: message.turn_status,
      stream_id,
    })
  }

  public setMode(mode: ETranscriptHelperMode) {
    if (this._mode !== ETranscriptHelperMode.UNKNOWN) return
    if (mode === ETranscriptHelperMode.UNKNOWN) return
    this._interval = mode === ETranscriptHelperMode.CHUNK ? DEFAULT_CHUNK_INTERVAL : DEFAULT_INTERVAL
    this._mode = mode
  }

  public handleMessage<T extends ITranscriptionBase>(message: T, options: { publisher: string }) {
    const messageObject = message?.object
    if (!Object.values(EMessageType).includes(messageObject)) return

    const isAgentMessage = message.object === EMessageType.AGENT_TRANSCRIPTION
    const isUserMessage = message.object === EMessageType.USER_TRANSCRIPTION
    const isMessageInterrupt = message.object === EMessageType.MSG_INTERRUPTED
    const isMessageMetrics = message.object === EMessageType.MSG_METRICS
    const isMessageError = message.object === EMessageType.MSG_ERROR
    const isMessageInfo = message.object === EMessageType.MESSAGE_INFO
    const isMessageSalStatus = message.object === EMessageType.MESSAGE_SAL_STATUS

    if (isAgentMessage && this._mode === ETranscriptHelperMode.UNKNOWN) {
      if (!message.words || (Array.isArray(message.words) && message.words.length === 0)) {
        this.setMode(ETranscriptHelperMode.TEXT)
      } else {
        this._setupIntervalForWords({ isForce: true })
        this.setMode(ETranscriptHelperMode.WORD)
      }
    }

    if (isAgentMessage && this._mode === ETranscriptHelperMode.WORD) {
      this._setupIntervalForWords({ isForce: false })
      this.handleWordAgentMessage(options.publisher, message as unknown as IAgentTranscription)
      return
    }
    if (isAgentMessage && this._mode === ETranscriptHelperMode.TEXT) {
      this.handleTextMessage(options.publisher, message as unknown as IUserTranscription)
      return
    }
    if (isAgentMessage && this._mode === ETranscriptHelperMode.CHUNK) {
      this.handleChunkTextMessage(options.publisher, message as unknown as IAgentTranscription)
      return
    }
    if (isUserMessage) {
      this.handleTextMessage(options.publisher, message as unknown as IUserTranscription)
      return
    }
    if (isMessageInterrupt) {
      this.handleMessageInterrupt(options.publisher, message as unknown as IMessageInterrupt)
      return
    }
    if (isMessageInfo) {
      this.handleMessageInfo(options.publisher, message as unknown as Record<string, unknown>)
      return
    }
    if (isMessageMetrics) {
      this.handleMessageMetrics(options.publisher, message as unknown as IMessageMetrics)
      return
    }
    if (isMessageError) {
      this.handleMessageError(options.publisher, message as unknown as IMessageError)
      return
    }
    if (isMessageSalStatus) {
      this.handleMessageSalStatus(options.publisher, message as unknown as IMessageSalStatus)
      return
    }
  }

  public run() {
    this._isRunning = true
  }
  public setPts(pts: number) {
    if (this._pts < pts && pts !== 0) this._pts = pts
  }
  public cleanup() {
    this._isRunning = false
    this._teardownInterval()
    this._queue = []
    this._lastPoppedQueueItem = null
    this._pts = 0
    this.chatHistory = []
    this._mode = ETranscriptHelperMode.UNKNOWN
    this._agentMessageState = null
    this._transcriptChunk = null
  }
}
