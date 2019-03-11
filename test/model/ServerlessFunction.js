class ServerlessFunction {
  constructor(name) {
    this[name] = {
    }
  }

  getFunction() {
    return this[Object.keys(this)[0]];
  }

  withHttpEndpoint(method, path, caching, integration) {
    integration = integration || 'AWS';
    let f = this.getFunction();
    if (!f.events) { f.events = []; }
    f.events.push({
      http: {
        path,
        method,
        caching,
        integration
      }
    })

    return this;
  }

  withHttpEndpointInShorthand(shorthand) {
    let f = this.getFunction();
    if (!f.events) { f.events = []; }
    f.events.push({
      http: shorthand
    });

    return this;
  }
}

module.exports = ServerlessFunction;
