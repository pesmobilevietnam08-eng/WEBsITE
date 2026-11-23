import { canonicalJsonStringify, sha256Hex } from '../lib/hash';
import { PrototypePollutionError, safeJsonParse, sanitizeLearnerName } from '../lib/sanitize';
import {
  BackupEnvelopeSchema,
  MAX_IMPORT_BYTES,
  StorageV3Schema,
  type BackupEnvelope,
  type StorageV3,
} from './schema';

export type ImportResult =
  { readonly ok: true; readonly data: StorageV3 } | { readonly ok: false; readonly error: string };

export async function exportProgressJson(state: StorageV3): Promise<string> {
  const sanitizedPayload: StorageV3 = {
    ...state,
    name: sanitizeLearnerName(state.name),
  };
  const validated = StorageV3Schema.parse(sanitizedPayload);
  const sha256 = await sha256Hex(canonicalJsonStringify(validated));
  const envelope: BackupEnvelope = {
    format: 'jpd113-backup',
    version: 3,
    exportedAt: new Date().toISOString(),
    sha256,
    payload: validated,
  };
  return JSON.stringify(envelope, null, 2);
}

export async function importProgressJson(rawText: string): Promise<ImportResult> {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    return { ok: false, error: 'Tệp nhập vào đang rỗng.' };
  }

  const byteLen = new TextEncoder().encode(rawText).byteLength;
  if (byteLen > MAX_IMPORT_BYTES) {
    return {
      ok: false,
      error: `Tệp quá lớn (${(byteLen / (1024 * 1024)).toFixed(2)} MB). Giới hạn tối đa là 1 MB.`,
    };
  }

  let parsed: unknown;
  try {
    parsed = safeJsonParse(rawText);
  } catch (err) {
    if (err instanceof PrototypePollutionError) {
      return {
        ok: false,
        error: 'Tệp chứa khóa không an toàn (__proto__ / constructor / prototype) và đã bị chặn.',
      };
    }
    return { ok: false, error: 'Tệp không phải định dạng JSON hợp lệ.' };
  }

  const envelopeRes = BackupEnvelopeSchema.safeParse(parsed);
  if (!envelopeRes.success) {
    return {
      ok: false,
      error: 'Cấu trúc tệp sao lưu không đúng định dạng JPD113 v3 hoặc chứa trường không hợp lệ.',
    };
  }

  const envelope = envelopeRes.data;
  const computedHash = await sha256Hex(canonicalJsonStringify(envelope.payload));
  if (computedHash !== envelope.sha256) {
    return {
      ok: false,
      error: 'Mã kiểm tra (checksum SHA-256) không khớp. Tệp có thể đã bị chỉnh sửa hoặc hỏng.',
    };
  }

  const sanitized: StorageV3 = {
    ...envelope.payload,
    name: sanitizeLearnerName(envelope.payload.name),
    updatedAt: new Date().toISOString(),
  };

  return { ok: true, data: sanitized };
}
