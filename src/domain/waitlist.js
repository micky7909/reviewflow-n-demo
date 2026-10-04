export const WAITLIST_STORAGE_KEY = 'drposting_waitlist';

export function buildWaitlistRecord({ name, use, need }, now) {
  return { name, use, need, at: now.toLocaleString('ko-KR') };
}

export function formatWaitlistConfirmation(record) {
  return `Dr.포스팅 베타 신청 저장 완료\n\n이름: ${record.name}\n목적: ${record.use}\n필요 기능: ${record.need}\n저장 시각: ${record.at}`;
}
