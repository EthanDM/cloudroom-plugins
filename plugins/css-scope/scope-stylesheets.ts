const TARGETS = new Set(["automations", "provider-usage", "scheduled-send"]);

type RuleGroup = CSSRule & {
  readonly cssRules: CSSRuleList;
  insertRule(rule: string, index: number): number;
  deleteRule(index: number): void;
};

type Patch = {
  pluginId: string;
  sheet: CSSStyleSheet;
  layer: RuleGroup;
  originals: string[];
  ownedRule: CSSRule;
  appliedText: string;
};

function isGroup(rule: CSSRule): rule is RuleGroup {
  return "cssRules" in rule && "insertRule" in rule && "deleteRule" in rule;
}

function utilityLayer(sheet: CSSStyleSheet): RuleGroup | undefined {
  const layers = Array.from(sheet.cssRules).filter(
    (rule): rule is RuleGroup => isGroup(rule) && "name" in rule && rule.name === "utilities",
  );
  return layers.length === 1 ? layers[0] : undefined;
}

function rewriteSelectors(group: RuleGroup, prefix: string, nested = false): number {
  let changes = 0;
  for (const rule of Array.from(group.cssRules)) {
    if (rule instanceof CSSStyleRule) {
      const rewritten = rule.selectorText.split(prefix).join(":where(:scope)");
      if (rewritten.includes("[data-bb-plugin") || (!nested && rewritten === rule.selectorText)) {
        throw new Error("Unrecognized plugin selector");
      }
      if (rewritten !== rule.selectorText) {
        rule.selectorText = rewritten;
        if (rule.selectorText !== rewritten) throw new Error("Selector rewrite was rejected");
        changes++;
      }
    }
    if (isGroup(rule)) changes += rewriteSelectors(rule, prefix, nested || rule instanceof CSSStyleRule);
  }
  return changes;
}

function replaceRules(group: RuleGroup, rules: string[]): void {
  while (group.cssRules.length) group.deleteRule(0);
  for (const rule of rules) group.insertRule(rule, group.cssRules.length);
}

function applyScope(sheet: CSSStyleSheet, pluginId: string): Patch | undefined {
  const layer = utilityLayer(sheet);
  if (!layer || layer.cssRules.length === 0) return;
  if (Array.from(layer.cssRules).some(rule => rule.cssText.startsWith("@scope"))) return;
  const originals = Array.from(layer.cssRules, rule => rule.cssText);
  const prefix = `:where([data-bb-plugin="${pluginId}"], [data-bb-plugin-root]:not([data-bb-plugin]))`;

  // Validate on a detached sheet before editing the app's live CSSOM. Only
  // selectors change: declaration values can legitimately contain the prefix.
  const scratch = new CSSStyleSheet();
  scratch.replaceSync(layer.cssText);
  const copy = utilityLayer(scratch);
  if (!copy || copy.cssRules.length !== originals.length) return;
  if (!rewriteSelectors(copy, prefix)) return;
  const body = Array.from(copy.cssRules, rule => rule.cssText).join("\n");
  const scoped = `@scope (${prefix}) {\n${body}\n}`;
  scratch.replaceSync(scoped);
  if (scratch.cssRules.length !== 1 || !("start" in scratch.cssRules[0])) return;

  // Insert first, so a rejected @scope never removes working styles.
  layer.insertRule(scoped, layer.cssRules.length);
  try {
    for (let index = 0; index < originals.length; index++) layer.deleteRule(0);
  } catch (error) {
    replaceRules(layer, originals);
    throw error;
  }
  const ownedRule = layer.cssRules[0];
  return { pluginId, sheet, layer, originals, ownedRule, appliedText: ownedRule.cssText };
}

function restore(patch: Patch): void {
  const { layer, originals, ownedRule, appliedText } = patch;
  // Do not overwrite a later stylesheet edit made by another plugin or DevTools.
  if (layer.cssRules.length === 1 && layer.cssRules[0] === ownedRule && ownedRule.cssText === appliedText) {
    replaceRules(layer, originals);
  }
}

function targetId(link: HTMLLinkElement): string | undefined {
  const pluginId = link.getAttribute("data-bb-plugin-css");
  if (!pluginId || !TARGETS.has(pluginId) || !link.relList.contains("stylesheet")) return;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin || url.pathname !== `/api/v1/plugins/${pluginId}/assets/app.css`) return;
  return pluginId;
}

export function mountCssScope(signal: AbortSignal): () => void {
  if (signal.aborted || !("CSSScopeRule" in window)) return () => {};
  const attempted = new WeakSet<CSSStyleSheet>();
  const patches = new Map<HTMLLinkElement, Patch>();
  let disposed = false;

  const restoreSafely = (patch: Patch): void => {
    try { restore(patch); } catch (error) {
      console.warn(`[css-scope] Could not restore ${patch.pluginId}`, error);
    }
  };
  const scan = (): void => {
    if (disposed) return;
    for (const [link, patch] of patches) {
      if (!document.head.contains(link) || link.sheet !== patch.sheet || targetId(link) !== patch.pluginId) {
        restoreSafely(patch);
        patches.delete(link);
      }
    }
    for (const link of document.head.querySelectorAll<HTMLLinkElement>("link[data-bb-plugin-css]")) {
      const pluginId = targetId(link);
      const sheet = link.sheet;
      if (!pluginId || !sheet || sheet.disabled || attempted.has(sheet)) continue;
      attempted.add(sheet);
      try {
        const patch = applyScope(sheet, pluginId);
        if (patch) {
          patches.set(link, patch);
          console.info(`[css-scope] Scoped ${pluginId}`);
        }
      } catch (error) {
        console.warn(`[css-scope] Skipped ${pluginId}`, error);
      }
    }
  };

  // Watch stylesheet loading/replacement only. Timeline DOM changes must not
  // trigger extra work while messages stream or chats switch.
  const observer = new MutationObserver(scan);
  observer.observe(document.head, {
    childList: true, subtree: true, attributes: true,
    attributeFilter: ["href", "rel", "data-bb-plugin-css"],
  });
  document.head.addEventListener("load", scan, true);
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    document.head.removeEventListener("load", scan, true);
    signal.removeEventListener("abort", dispose);
    for (const patch of patches.values()) restoreSafely(patch);
    patches.clear();
  };
  signal.addEventListener("abort", dispose, { once: true });
  scan();
  return dispose;
}
