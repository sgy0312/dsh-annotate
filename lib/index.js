/** Host half of dsh-annotate. Pure browser plugin: the empty apply keeps the
 *  package loadable by the Loader, and the browser half ships through the
 *  package.json `dsh.client` declaration + `./client` export. */
export function apply() {}
