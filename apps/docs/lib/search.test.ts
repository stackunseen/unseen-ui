import { describe, expect, it } from 'vitest';
import { matchesQuery, queryWords } from './search';
import { searchCatalog } from './gallery-navigation';

const names = (query: string) => searchCatalog(query).map((entry) => entry.name);

describe('search by meaning', () => {
  it('ignores filler words and keeps exact matches working', () => {
    expect(queryWords('show me a button')).toEqual([['button']]);
    expect(names('button')).toContain('Button');
    expect(matchesQuery('anything', 'the a of')).toBe(true);
  });

  it('finds components by what a person wants to do', () => {
    expect(names('ask before deleting')).toContain('ApprovalCard');
    expect(names('confirm action')).toContain('ApprovalCard');
    expect(names('thumbs up')).toContain('FeedbackCapture');
    expect(names('token cost')).toContain('UsageMeter');
    expect(names('loading spinner')).toContain('LoadingIndicator');
    expect(names('dropdown')).toContain('Select');
    expect(names('upload a file')).toContain('FileDropzone');
    expect(names('chatbot')).toContain('Chat');
    expect(names('footnotes')).toContain('Citation');
    expect(names('dark mode')).toContain('AppearanceToggle');
    expect(names('speech')).toContain('VoiceControl');
  });

  it('forgives one typo in longer words', () => {
    expect(names('aproval')).toContain('ApprovalCard');
    expect(names('stremaing')).toContain('StreamingResponse');
    expect(names('tabel')).toContain('Table');
  });

  it('still narrows: every meaningful word must match', () => {
    const both = names('approval batch');
    expect(both).toContain('ApprovalBatch');
    expect(both).not.toContain('Button');
    expect(names('zzzz-nothing')).toEqual([]);
  });

  it('ranks name matches before intent matches', () => {
    expect(names('approval')[0]).toBe('ApprovalCard');
    expect(names('chat')[0]).toBe('Chat');
    expect(names('button').slice(0, 2)).toContain('Button');
  });
});
