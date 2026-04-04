import { queryMedicineInfo, transcribeAudio, triggerSos, updateStatus } from './api.js';

const VALID_COMMANDS = new Set(['taken', 'later', 'skip', 'sos']);
const MEDICINE_QUERY_PATTERN =
  /\b(medicine|medicines|medication|medications|meds|dose|dosage|schedule|routine|timing|next|when|what time|what's next|should i take|take)\b/i;

function normalizeText(message) {
  return message?.trim().toLowerCase() ?? '';
}

function normalizePhone(value) {
  return value?.replace(/\D/g, '') ?? '';
}

function jidMatchesState(jid, state) {
  if (!jid || !state) {
    return false;
  }

  if (jid === state.jid) {
    return true;
  }

  const normalizedJid = normalizePhone(jid);
  if (!normalizedJid) {
    return false;
  }

  return (
    normalizedJid === normalizePhone(state.jid) ||
    normalizedJid === normalizePhone(state.phone)
  );
}

function findPatientState(patientState, jid) {
  if (!jid) {
    return null;
  }

  const directMatch = patientState.get(jid);
  if (directMatch) {
    return directMatch;
  }

  for (const state of patientState.values()) {
    if (jidMatchesState(jid, state)) {
      return state;
    }
  }

  return null;
}

function resolveMessageJid(baileysMessage) {
  return (
    baileysMessage?.key?.participant ||
    baileysMessage?.participant ||
    baileysMessage?.key?.remoteJid ||
    ''
  );
}

function isDirectChat(jid) {
  return typeof jid === 'string' && !jid.endsWith('@g.us') && !jid.endsWith('@broadcast');
}

function findFallbackStateForLid(patientState, remoteJid) {
  if (!remoteJid?.endsWith('@lid') || !isDirectChat(remoteJid) || patientState.size !== 1) {
    return null;
  }

  return patientState.values().next().value ?? null;
}

function unwrapMessageContent(messageContent) {
  if (!messageContent) {
    return null;
  }

  if (messageContent.ephemeralMessage?.message) {
    return unwrapMessageContent(messageContent.ephemeralMessage.message);
  }

  if (messageContent.viewOnceMessage?.message) {
    return unwrapMessageContent(messageContent.viewOnceMessage.message);
  }

  if (messageContent.viewOnceMessageV2?.message) {
    return unwrapMessageContent(messageContent.viewOnceMessageV2.message);
  }

  if (messageContent.documentWithCaptionMessage?.message) {
    return unwrapMessageContent(messageContent.documentWithCaptionMessage.message);
  }

  return messageContent;
}

function getMessageContent(baileysMessage) {
  return unwrapMessageContent(baileysMessage?.message);
}

function getAudioMessage(baileysMessage) {
  return getMessageContent(baileysMessage)?.audioMessage ?? null;
}

function extractText(baileysMessage) {
  const messageContent = getMessageContent(baileysMessage);

  if (!messageContent) {
    return '';
  }

  const {
    conversation,
    extendedTextMessage,
    imageMessage,
    videoMessage,
    buttonsResponseMessage,
    listResponseMessage,
    templateButtonReplyMessage
  } = messageContent;

  return (
    conversation ||
    extendedTextMessage?.text ||
    imageMessage?.caption ||
    videoMessage?.caption ||
    buttonsResponseMessage?.selectedDisplayText ||
    listResponseMessage?.title ||
    templateButtonReplyMessage?.selectedDisplayText ||
    ''
  );
}

function hasVoiceMessage(baileysMessage) {
  return Boolean(getAudioMessage(baileysMessage));
}

function extractCommand(text) {
  const normalized = normalizeText(text);

  if (!normalized) {
    return '';
  }

  const match = normalized.match(/\b(taken|later|skip|sos)\b/);
  return match?.[1] ?? '';
}

function isMedicineQueryText(text) {
  return Boolean(text && MEDICINE_QUERY_PATTERN.test(text));
}

function buildContext(jid, text, state) {
  return {
    jid,
    text,
    userId: state.userId,
    phone: state.phone,
    state
  };
}

function buildReminderPayload(state) {
  return [
    {
      medicine: state.medicine,
      dosage: state.dosage,
      time: state.timeLabel ?? state.cron,
      quantity: 1
    }
  ];
}

function buildSpeechContexts(state) {
  return [
    {
      phrases: [
        state.medicine,
        state.dosage,
        state.timeLabel ?? '',
        'when is my medicine',
        'what is my schedule',
        'what medicines am I taking',
        'when should I take my tablet',
        'taken',
        'later',
        'skip',
        'sos'
      ].filter(Boolean)
    }
  ];
}

function getTranscriptionConfig(audioMessage, state) {
  const mimeType = audioMessage?.mimetype?.toLowerCase() ?? '';

  if (mimeType.includes('webm')) {
    return {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 48000,
      originalMimeType: audioMessage.mimetype,
      speechContexts: buildSpeechContexts(state)
    };
  }

  return {
    encoding: 'OGG_OPUS',
    sampleRateHertz: 48000,
    originalMimeType: audioMessage?.mimetype,
    speechContexts: buildSpeechContexts(state)
  };
}

async function sendReply(sock, jid, text) {
  await sock.sendMessage(jid, { text });
}

async function handleMedicineQuery({ sock, context, rawText }) {
  const response = await queryMedicineInfo({
    userId: context.userId,
    query: rawText,
    reminders: buildReminderPayload(context.state)
  });

  const replyText =
    response?.text ||
    response?.message ||
    response?.data?.text ||
    "I couldn't understand that medicine question.";

  await sendReply(sock, context.jid, replyText);
}

async function handleVoiceQuery({ sock, baileysMessage, context, downloadMedia }) {
  if (!downloadMedia) {
    throw new Error('Voice note download is not available.');
  }

  const audioMessage = getAudioMessage(baileysMessage);
  if (!audioMessage) {
    throw new Error('Voice note metadata is missing.');
  }

  const audioBuffer = await downloadMedia();
  if (!audioBuffer?.length) {
    throw new Error('Voice note was empty.');
  }

  const { transcript } = await transcribeAudio(
    audioBuffer,
    getTranscriptionConfig(audioMessage, context.state)
  );

  console.log(
    `[handler] Voice transcript for ${context.jid}: "${transcript}" mimeType=${audioMessage.mimetype || 'unknown'}`
  );

  await handleMedicineQuery({
    sock,
    context,
    rawText: transcript
  });
}

async function handleTaken({ sock, context, state, markUserReplied }) {
  await updateStatus({
    userId: context.userId,
    phone: context.phone,
    status: 'taken',
    timestamp: new Date().toISOString()
  });

  markUserReplied(state.jid);
  state.awaitingReply = false;
  await sendReply(sock, context.jid, '✅ Noted');
}

async function handleLater({ sock, context, state, markUserReplied, scheduleSnoozeReminder }) {
  await updateStatus({
    userId: context.userId,
    phone: context.phone,
    status: 'later',
    timestamp: new Date().toISOString()
  });

  markUserReplied(state.jid);
  state.awaitingReply = true;
  await sendReply(sock, context.jid, '⏰ Reminder postponed');
  scheduleSnoozeReminder(state);
}

async function handleSkip({ sock, context, state, markUserReplied }) {
  await updateStatus({
    userId: context.userId,
    phone: context.phone,
    status: 'skip',
    timestamp: new Date().toISOString()
  });

  markUserReplied(state.jid);
  state.awaitingReply = false;
  await sendReply(sock, context.jid, '✅ Noted');
}

async function handleSos({ sock, context, state, markUserReplied }) {
  await triggerSos({
    userId: context.userId,
    phone: context.phone,
    message: `Emergency help requested via WhatsApp by ${context.phone}`
  });

  markUserReplied(state.jid);
  state.awaitingReply = false;
  state.lastAlertAt = Date.now();
  await sendReply(sock, context.jid, '🚨 Emergency alert sent');
}

export async function handleIncomingMessage({
  sock,
  baileysMessage,
  downloadMedia,
  patientState,
  markUserReplied,
  scheduleSnoozeReminder
}) {
  const remoteJid = baileysMessage?.key?.remoteJid;
  const senderJid = resolveMessageJid(baileysMessage);
  const jid = senderJid || remoteJid;
  const state = findPatientState(patientState, jid) ?? findFallbackStateForLid(patientState, remoteJid);

  if (baileysMessage?.key?.fromMe) {
    return;
  }

  if (!jid) {
    console.log('[handler] Ignoring message without remoteJid.');
    return;
  }

  if (!state) {
    console.log(
      `[handler] Ignoring message from unmatched sender. remoteJid=${remoteJid || 'none'} participant=${baileysMessage?.key?.participant || baileysMessage?.participant || 'none'}`
    );
    return;
  }

  const rawText = extractText(baileysMessage);
  const text = extractCommand(rawText);
  const context = buildContext(jid, text, state);
  const hasVoiceNote = hasVoiceMessage(baileysMessage);

  console.log(
    `[handler] Received message from ${jid}. remoteJid=${remoteJid || 'none'} Raw text: "${rawText}" Command: "${text || 'none'}" Voice=${hasVoiceNote}`
  );

  try {
    if (hasVoiceNote) {
      await handleVoiceQuery({ sock, baileysMessage, context, downloadMedia });
      return;
    }

    if (text === 'taken') {
      await handleTaken({ sock, context, state, markUserReplied });
      return;
    }

    if (text === 'later') {
      await handleLater({ sock, context, state, markUserReplied, scheduleSnoozeReminder });
      return;
    }

    if (text === 'skip') {
      await handleSkip({ sock, context, state, markUserReplied });
      return;
    }

    if (text === 'sos') {
      await handleSos({ sock, context, state, markUserReplied });
      return;
    }

    if (isMedicineQueryText(rawText)) {
      await handleMedicineQuery({ sock, context, rawText });
      return;
    }
  } catch (error) {
    console.error('[handler] Failed to process incoming message:', error);
    await sendReply(
      sock,
      jid,
      '⚠️ I could not understand that voice note. Please try again or send the question as text.'
    );
    return;
  }

  if (state.awaitingReply) {
    await sendReply(
      sock,
      jid,
      '💡 Please reply with: taken / later / skip / sos'
    );
  }
}
