// src/verse/runner.js
// Connects the engine's step function (engine.js) to a regression worker pool
// (stats/pool.js): 'run' effects become pool jobs, 'abort' effects abort them,
// and replies come back as 'done' / 'failed' events. An aborted job's reply
// never reaches the engine (the pool rejects it with AbortError, which is
// dropped here, and the engine ignores ids it no longer knows anyway).
//
//   const engine = createVerseRunner({ pool, onChange: state => render(state) });
//   engine.dispatch({ type: 'data', dataset });
//   engine.dispatch({ type: 'spec', spec });

import { createEngineState, step as engineStep } from './engine.js';

// step is injectable so tests can observe each transition.
export function createVerseRunner({ pool, diagnostics = false, onChange = () => {}, step = engineStep }) {
  let state = createEngineState({ capacity: pool.size, diagnostics });
  const controllers = new Map();

  function run({ id, op, args }) {
    const ac = new AbortController();
    controllers.set(id, ac);
    pool.run(op, args, { signal: ac.signal }).then(
      result => {
        controllers.delete(id);
        dispatch({ type: 'done', id, result });
      },
      error => {
        controllers.delete(id);
        if (error?.name === 'AbortError') return;
        dispatch({ type: 'failed', id, error: error?.message ?? String(error) });
      },
    );
  }

  function dispatch(event) {
    const out = step(state, event);
    state = out.state;
    for (const e of out.effects) {
      if (e.type === 'run') run(e);
      else if (e.type === 'abort') {
        controllers.get(e.id)?.abort();
        controllers.delete(e.id);
      }
    }
    onChange(state, event);
  }

  return {
    dispatch,
    get state() { return state; },
    get inFlight() { return controllers.size; },
  };
}
