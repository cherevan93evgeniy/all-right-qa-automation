import { writeFileSync } from 'node:fs';
import type { FullConfig, FullResult, Reporter, Suite, TestStatus } from '@playwright/test/reporter';

export default class SafeSummaryReporter implements Reporter {
  private suite?: Suite;

  onBegin(_config: FullConfig, suite: Suite): void {
    this.suite = suite;
  }

  printsToStdio(): boolean {
    return true;
  }

  onEnd(result: FullResult): void {
    const tests = (this.suite?.allTests() ?? []).map((test) => {
      const attempt = test.results.at(-1);
      const status: TestStatus | 'notRun' = attempt?.status ?? 'notRun';
      return {
        title: test.title,
        project: test.parent.project()?.name ?? '',
        status,
        durationMs: attempt?.duration ?? 0,
      };
    });

    const counts = {
      total: tests.length,
      passed: 0,
      failed: 0,
      skipped: 0,
      timedOut: 0,
      interrupted: 0,
      notRun: 0,
    };
    for (const test of tests) {
      counts[test.status]++;
    }

    const summary = { status: result.status, durationMs: result.duration, counts, tests };
    writeFileSync('qa-summary.json', JSON.stringify(summary, null, 2) + '\n');
    console.log(`API test run ${result.status}. See qa-summary.json for results.`);
  }
}
