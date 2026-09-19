export const TIKTOK_LEADS_QUEUE = 'tiktok-leads-queue';
export const TIKTOK_LEADS_DLQ = 'tiktok-leads-dlq';
export const PROCESS_TIKTOK_LEAD = 'process-tiktok-lead';

export const DEFAULT_QUEUE_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: 1000,
  removeOnFail: 5000,
};
