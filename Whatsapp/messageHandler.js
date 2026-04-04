import { queryMedicineInfo, triggerSos, updateStatus } from './api.js';

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

function extractText(baileysMessage) {
  const messageContent = unwrapMessageContent(baileysMessage?.message);

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

function isConnectionRefusedError(error) {
  if (!error) {
    return false;
  }

  if (error?.cause?.code === 'ECONNREFUSED') {
    return true;
  }

  if (Array.isArray(error?.cause?.errors)) {
    return error.cause.errors.some((innerError) => innerError?.code === 'ECONNREFUSED');
  }

  return false;
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

async function handleTaken({ sock, context, state, markUserReplied }) {
  await updateStatus({
    userId: context.userId,
    phone: context.phone,
    status: 'taken',
    timestamp: new Date().toISOString()
  });

  markUserReplied(state.jid);
  state.awaitingReply = false;
  await sendReply(sock, context.jid, '\u2705 Noted. Medicine marked as taken.');
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
  await sendReply(sock, context.jid, '\u23f0 Reminder postponed. I will ping you again soon.');
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
  await sendReply(sock, context.jid, '\u23ed\ufe0f Noted. I marked this dose as skipped.');
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
  await sendReply(sock, context.jid, '\ud83d\udea8 Emergency alert sent.');
}

export async function handleIncomingMessage({
  sock,
  baileysMessage,
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

  console.log(
    `[handler] Received message from ${jid}. remoteJid=${remoteJid || 'none'} Raw text: "${rawText}" Command: "${text || 'none'}"`
  );

  try {
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
      isConnectionRefusedError(error)
        ? '\u26a0\ufe0f The backend service is not running right now, so I could not process that message.'
        : '\u26a0\ufe0f Something went wrong while processing your message. Please try again.'
    );
    return;
  }

  if (state.awaitingReply) {
    await sendReply(
      sock,
      jid,
      '\ud83d\udcac Please reply with: taken / later / skip / sos'
    );
  }
}
