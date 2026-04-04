import path from 'node:path';
import { createRequire } from 'node:module';

export interface ParsedAiInsight {
  title: string;
  details: string;
}

export interface ScanResult {
  title: string;
  summary: string;
  items: string[];
}

type AiModuleOptions = {
  userContext?: Record<string, unknown>;
};

type ParseReminderFn = (text: string, options?: AiModuleOptions) => Promise<any>;
type ExtractMedicinesAndRemindersFn = (imageSource: string, options?: AiModuleOptions) => Promise<any>;

const require = createRequire(import.meta.url);
const parseReminderModulePath = path.resolve(import.meta.dir, '..', '..', 'ai-module', 'parseReminder.js');
const ocrModulePath = path.resolve(import.meta.dir, '..', '..', 'ai-module', 'ocr.js');

let parseReminderFn: ParseReminderFn | null = null;
let extractMedicinesAndRemindersFn: ExtractMedicinesAndRemindersFn | null = null;

const loadModules = () => {
  if (parseReminderFn && extractMedicinesAndRemindersFn) {
    return;
  }

  const parseReminderModule = require(parseReminderModulePath) as {
    parseReminder?: ParseReminderFn;
  };
  const ocrModule = require(ocrModulePath) as {
    extractMedicinesAndReminders?: ExtractMedicinesAndRemindersFn;
  };

  if (typeof parseReminderModule.parseReminder !== 'function') {
    throw new Error('AI parser module is missing parseReminder export');
  }

  if (typeof ocrModule.extractMedicinesAndReminders !== 'function') {
    throw new Error('AI OCR module is missing extractMedicinesAndReminders export');
  }

  parseReminderFn = parseReminderModule.parseReminder;
  extractMedicinesAndRemindersFn = ocrModule.extractMedicinesAndReminders;
};

const toText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const buildMedicationLine = (medication: any) => {
  const name = toText(medication?.name) || 'Unknown medicine';
  const dosage = toText(medication?.dosage);
  const schedule = Array.isArray(medication?.schedule)
    ? medication.schedule
        .map((entry: any) => toText(entry?.time))
        .filter(Boolean)
        .join(', ')
    : '';

  const parts = [name, dosage, schedule].filter(Boolean);
  return parts.join(' | ');
};

export const parseReminderText = async (text: string, userContext: Record<string, unknown> = {}) => {
  const normalizedText = toText(text);

  if (!normalizedText) {
    throw new Error('Reminder text is required');
  }

  loadModules();
  return parseReminderFn!(normalizedText, { userContext });
};

export const scanPrescriptionImage = async (imageSource: string, userContext: Record<string, unknown> = {}) => {
  const normalizedSource = toText(imageSource);

  if (!normalizedSource) {
    throw new Error('Prescription image source is required');
  }

  loadModules();
  return extractMedicinesAndRemindersFn!(normalizedSource, { userContext });
};

export const buildReminderInsight = (parsed: any): ParsedAiInsight => {
  const medications = Array.isArray(parsed?.medications) ? parsed.medications : [];
  const clarifications = Array.isArray(parsed?.clarifications_needed) ? parsed.clarifications_needed : [];

  if (!medications.length) {
    return {
      title: 'No medicines detected',
      details: 'No medication reminder could be extracted from the provided note.'
    };
  }

  const preview = medications.slice(0, 3).map(buildMedicationLine).filter(Boolean);
  const suffix = clarifications.length
    ? ` Clarifications needed: ${clarifications.slice(0, 2).join(' | ')}.`
    : '';

  return {
    title: `Parsed ${medications.length} medication reminder${medications.length === 1 ? '' : 's'}`,
    details: `${preview.join(' ; ')}.${suffix}`
  };
};

export const buildPrescriptionScanResult = (parsed: any): ScanResult => {
  const medications = Array.isArray(parsed?.medications) ? parsed.medications : [];
  const clarifications = Array.isArray(parsed?.clarifications_needed) ? parsed.clarifications_needed : [];

  if (!medications.length) {
    const errorText = toText(parsed?.error);

    return {
      title: 'Prescription scan summary',
      summary: errorText || 'No medicines could be reliably detected from this image.',
      items: clarifications.length ? clarifications : ['Try a clearer image with better lighting.']
    };
  }

  return {
    title: 'Prescription scan summary',
    summary: `Detected ${medications.length} medicine${medications.length === 1 ? '' : 's'}${
      clarifications.length ? ` with ${clarifications.length} clarification${clarifications.length === 1 ? '' : 's'} needed` : ''
    }.`,
    items: medications.slice(0, 6).map(buildMedicationLine).filter(Boolean)
  };
};
