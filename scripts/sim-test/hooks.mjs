// Resolve hook: stub "server-only" so pure sim libs can be imported in tsx tests.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { url: "data:text/javascript,export default undefined;", shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
