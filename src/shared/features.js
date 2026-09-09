// Features register in script order. The entry point starts them after core construction.
window.SchedulerFeatures = (() => {
  const features = new Map();
  const started = new Set();
  return Object.freeze({
    register(name, initialize) {
      if (features.has(name)) throw new Error(`Duplicate scheduler feature: ${name}`);
      features.set(name, initialize);
    },
    start() {
      for (const [name, initialize] of features) {
        if (started.has(name)) continue;
        initialize();
        started.add(name);
      }
    },
  });
})();
