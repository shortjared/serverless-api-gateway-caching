const { retrieveRestApiId } = require('./restApiId');

let settings, serverless, restApiId;
let cachedResources;

const getMethodResourceIdfor = async (endpointSettings) => {
  const params = {
    restApiId
  }
  let resources = cachedResources ? cachedResources :
    await serverless.providers.aws.request('APIGateway', 'getResources', params, settings.stage, settings.region);

  cachedResources = resources;

  let { method, path } = endpointSettings;
  let methodResource = resources.items.find(r => r.path.toLowerCase() == path.toLowerCase() && r.resourceMethods[method.toUpperCase()]);
  if (!methodResource) {
    serverless.cli.log(`[serverless-api-gateway-caching] The method '${method.toUpperCase()} ${path}' could not be found in Rest API with Id ${restApiId}`);
  }
  return methodResource.id;
}

const getMethodFor = async (endpointSettings) => {
  let methodResourceId = await getMethodResourceIdfor(endpointSettings);
  const params = {
    httpMethod: endpointSettings.method,
    restApiId,
    resourceId: methodResourceId
  };
  let method = await serverless.providers.aws.request('APIGateway', 'getMethod', params, settings.stage, settings.region);
  return method;
}

const addRequestParametersToMethod = async (method, requestParametersToAdd) => {
  const params = {
    restApiId,
    resourceId: method.id,
    httpMethod: method.httpMethod,
    patchOperations: []
  };
  for (let requestParameter of requestParametersToAdd) {
    params.patchOperations.push({
      op: 'add',
      path: `/requestParameters/method.${requestParameter}`
    });
  }

  serverless.cli.log(`[serverless-api-gateway-caching] [DEBUG] updateMethod params '${JSON.stringify(params)}'`);
  await serverless.providers.aws.request('APIGateway', 'updateMethod', params, settings.stage, settings.region);
}

const updateRequestParametersFor = async (method, endpointSettings) => {
  let requestParametersToAdd = [];
  for (let cacheKeyParameter of endpointSettings.cacheKeyParameters) {
    if (!method.requestParameters[`method.${cacheKeyParameter.name}`]) {
      requestParametersToAdd.push(cacheKeyParameter.name);
    }
  }
  await addRequestParametersToMethod(method, requestParametersToAdd);
}

const updateCacheKeyParametersForMethodIntegration = async (operation, method, cacheKeyParametersToRemove) => {
  let params = {
    httpMethod: method.httpMethod,
    restApiId: restApiId,
    resourceId: method.id,
    patchOperations: []
  }

  for (let cacheKeyParameter of cacheKeyParametersToRemove) {
    params.patchOperations.push({
      op: operation,
      path: `/cacheKeyParameters/method.${cacheKeyParameter}`
    });
  }

  serverless.cli.log(`[serverless-api-gateway-caching] [DEBUG] updateIntegration params '${JSON.stringify(params)}'`);
  await serverless.providers.aws.request('APIGateway', 'updateIntegration', params, settings.stage, settings.region);
}

const updateCacheKeyParametersFor = async (method, endpointSettings) => {
  let cacheKeyParametersToAdd = [];
  let cacheKeyParametersToRemove = [];
  for (let cacheKeyParameter of endpointSettings.cacheKeyParameters) {
    if (!method.methodIntegration.cacheKeyParameters.includes(`method.${cacheKeyParameter.name}`)) {
      cacheKeyParametersToAdd.push(cacheKeyParameter.name);
    }
  }
  for (let cacheKeyParameter of method.methodIntegration.cacheKeyParameters) {
    if (!endpointSettings.cacheKeyParameters.find(p => p.name == cacheKeyParameter)) {
      cacheKeyParametersToRemove.push(cacheKeyParameter);
    }
  }

  await updateCacheKeyParametersForMethodIntegration('remove', method, cacheKeyParametersToRemove);
  await updateCacheKeyParametersForMethodIntegration('add', method, cacheKeyParametersToAdd);
}

const updateCacheSettingsFor = async (endpointSettings) => {
  let apiGatewayMethod = await getMethodFor(endpointSettings);

  await updateRequestParametersFor(apiGatewayMethod, endpointSettings);
  await updateCacheKeyParametersFor(apiGatewayMethod, endpointSettings);
}

const updatePathParametersCacheSettings = async (inputSettings, inputServerless) => {
  // do nothing if caching is not enabled
  if (!settings.cachingEnabled) {
    return;
  }

  settings = inputSettings;
  serverless = inputServerless;
  restApiId = await retrieveRestApiId(serverless, settings);

  for (let endpointSettings of settings.endpointSettings) {
    await updateCacheSettingsFor(endpointSettings);
  }
}

module.exports = updatePathParametersCacheSettings;
