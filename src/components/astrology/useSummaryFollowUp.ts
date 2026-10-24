import { useCallback, useRef, useState } from 'react';
import type { PeriodSummaryFollowUp, Settings } from '@/types';
import { chatStream, getAIConfig, getDeliberateAIConfig, type AIConfig } from '@/utils/aiClient';
import { SUMMARY_FOLLOWUP_MAX_TOKENS } from '@/utils/summaryAI';
import { resolveKeyFor, summaryJobMessages, type SummaryJob } from '@/utils/summaryJobs';

type Phase = 'idle' | 'thinking' | 'streaming' | 'done' | 'error' | 'truncated' | 'aborted' | 'nokey';

export interface SummaryFollowUpAI {
  phase: Phase;
  text: string;
  full: string;
  progress: number;
  error: { code: 'network' | 'offline' | 'nokey' | 'truncated'; message: string } | null;
  start: () => void;
  skip: () => void;
  abort: () => void;
  resume: () => void;
  retry: () => void;
  reset: () => void;
}

type ArchivedSummaryContext = {
  reqContext?: {
    baseUrl: string;
    model: string;
    provider?: Settings['summaryApiProvider'];
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  };
};

type FollowUpLike = {
  q?: string;
  a?: string;
  question?: string;
  answer?: string;
};

function configFor(settings: Settings, job: SummaryJob | null, archived: ArchivedSummaryContext | null): AIConfig | null {
  if (job?.req) {
    return {
      apiKey: job.req.apiKey,
      baseUrl: job.req.baseUrl,
      model: job.req.model,
      provider: job.req.provider,
      tier: job.req.deliberate ? 'deliberate' : 'fast',
    };
  }
  const rc = archived?.reqContext;
  if (rc) {
    const apiKey = resolveKeyFor(settings, rc.provider);
    return apiKey ? { apiKey, baseUrl: rc.baseUrl, model: rc.model, provider: rc.provider, tier: 'deliberate' } : null;
  }
  return getDeliberateAIConfig(settings) ?? getAIConfig(settings);
}

export function useSummaryFollowUp(args: {
  settings: Settings;
  job: SummaryJob | null;
  archived: ArchivedSummaryContext | null;
  content: string;
  followUps: Array<PeriodSummaryFollowUp | FollowUpLike>;
}) {
  const { settings, job, archived, content, followUps } = args;
  const [question, setQuestion] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [text, setText] = useState('');
  const [full, setFull] = useState('');
  const [error, setError] = useState<SummaryFollowUpAI['error']>(null);
  const abortRef = useRef<AbortController | null>(null);
  const doneRef = useRef<((followUp: PeriodSummaryFollowUp) => void) | null>(null);
  const lastQuestionRef = useRef('');

  const finish = useCallback(() => {
    const q = lastQuestionRef.current;
    const answer = text.trim();
    if (q && answer) {
      doneRef.current?.({ question: q, answer, createdAt: new Date() });
    }
    setQuestion(null);
    setPhase(answer ? 'done' : 'idle');
  }, [text]);

  const ask = useCallback(async (raw: string, onDone: (followUp: PeriodSummaryFollowUp) => void) => {
    const q = raw.trim();
    if (!q || phase === 'thinking' || phase === 'streaming') return;
    const cfg = configFor(settings, job, archived);
    if (!cfg) {
      setError({ code: 'nokey', message: '没有可用的 API Key' });
      setPhase('nokey');
      return;
    }
    const baseMessages = summaryJobMessages(job ?? ({} as SummaryJob)) ?? archived?.reqContext?.messages ?? null;
    if (!baseMessages) {
      setError({ code: 'network', message: '这份总结没有保留追问上下文' });
      setPhase('error');
      return;
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    lastQuestionRef.current = q;
    doneRef.current = onDone;
    setQuestion(q);
    setText('');
    setFull('');
    setError(null);
    setPhase('thinking');

    const messages = [
      ...baseMessages,
      ...followUps.flatMap((followUp) => {
        const short = followUp as FollowUpLike;
        const fullFollowUp = followUp as PeriodSummaryFollowUp;
        const q = short.q ?? fullFollowUp.question ?? '';
        const a = short.a ?? fullFollowUp.answer ?? '';
        return [
          { role: 'user' as const, content: q },
          { role: 'assistant' as const, content: a },
        ];
      }),
      ...(content.trim() ? [{ role: 'assistant' as const, content }] : []),
      { role: 'user' as const, content: q },
    ];
    let answer = '';
    try {
      for await (const chunk of chatStream(cfg, messages, {
        temperature: 0.7,
        maxTokens: SUMMARY_FOLLOWUP_MAX_TOKENS,
        signal: ac.signal,
      })) {
        answer += chunk;
        setPhase('streaming');
        setText(answer);
        setFull(answer);
      }
      if (ac.signal.aborted) return;
      if (!answer.trim()) throw new Error('空响应');
      doneRef.current?.({ question: q, answer: answer.trim(), createdAt: new Date() });
      setQuestion(null);
      setPhase('done');
    } catch (err) {
      if (ac.signal.aborted) return;
      setError({ code: 'network', message: err instanceof Error ? err.message : '追问失败' });
      setPhase('error');
    }
  }, [archived, content, followUps, job, phase, settings]);

  const ai: SummaryFollowUpAI = {
    phase,
    text,
    full,
    progress: phase === 'done' ? 1 : phase === 'streaming' ? 0.75 : phase === 'thinking' ? 0.25 : 0,
    error,
    start: () => {},
    skip: finish,
    abort: () => abortRef.current?.abort(),
    resume: () => {},
    retry: () => {
      if (lastQuestionRef.current) void ask(lastQuestionRef.current, doneRef.current ?? (() => {}));
    },
    reset: () => {
      abortRef.current?.abort();
      setQuestion(null);
      setText('');
      setFull('');
      setError(null);
      setPhase('idle');
    },
  };

  return { ai, ask, question };
}
