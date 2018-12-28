const isEmpty = require('lodash.isempty');
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
    httpMethod: endpointSettings.method.toUpperCase(),
    restApiId,
    resourceId: methodResourceId
  };
  let method = await serverless.providers.aws.request('APIGateway', 'getMethod', params, settings.stage, settings.region);
  method.id = methodResourceId;
  return method;
}

const addRequestParametersToMethod = async (method, requestParametersToAdd) => {
  if (isEmpty(requestParametersToAdd)) {
    return;
  }
  const params = {
    restApiId,
    resourceId: method.id,
    httpMethod: method.httpMethod,
    patchOperations: []
  };
  for (let requestParameter of requestParametersToAdd) {
    params.patchOperations.push({
      op: 'add',
      path: `/requestParameters/${requestParameter}`
    });
  }

  serverless.cli.log(`[serverless-api-gateway-caching] [DEBUG] updateMethod params '${JSON.stringify(params)}'`);
  await serverless.providers.aws.request('APIGateway', 'updateMethod', params, settings.stage, settings.region);
}

const updateRequestParametersFor = async (method, endpointSettings) => {
  let requestParametersToAdd = [];
  if (isEmpty(endpointSettings.cacheKeyParameters)) {
    return;
  }
  for (let cacheKeyParameter of endpointSettings.cacheKeyParameters) {
    if (isEmpty(method.requestParameters) || method.requestParameters[`method.${cacheKeyParameter.name}`] === undefined) {
      requestParametersToAdd.push(`method.${cacheKeyParameter.name}`);
    }
  }
  await addRequestParametersToMethod(method, requestParametersToAdd);
}

const updateCacheKeyParametersForMethodIntegration = async (operation, method, cacheKeyParameters) => {
  if (isEmpty(cacheKeyParameters)) {
    return;
  }
  let params = {
    httpMethod: method.httpMethod,
    restApiId: restApiId,
    resourceId: method.id,
    patchOperations: []
  }

  for (let cacheKeyParameter of cacheKeyParameters) {
    params.patchOperations.push({
      op: operation,
      path: `/cacheKeyParameters/method.${cacheKeyParameter}`
    });
    params.patchOperations.push({
      op: operation,
      path: `/requestParameters/integration.${cacheKeyParameter}`,
      value: `method.${cacheKeyParameter}`
    });
  }
  params.patchOperations.push({
    op: 'replace',
    path: `/cacheNamespace`,
    value: `${method.id}CacheNS`
  });

  serverless.cli.log(`[serverless-api-gateway-caching] [DEBUG] updateIntegration params '${JSON.stringify(params)}'`);
  await serverless.providers.aws.request('APIGateway', 'updateIntegration', params, settings.stage, settings.region);
}

const updateCacheKeyParametersFor = async (method, endpointSettings) => {
  let cacheKeyParametersToAdd = [];
  let cacheKeyParametersToRemove = [];
  if (isEmpty(endpointSettings.cacheKeyParameters)) {
    cacheKeyParametersToRemove = method.methodIntegration.cacheKeyParameters;
  } else {
    for (let cacheKeyParameter of endpointSettings.cacheKeyParameters) {
      if (!method.methodIntegration.cacheKeyParameters.includes(`method.${cacheKeyParameter.name}`)) {
        cacheKeyParametersToAdd.push(`${cacheKeyParameter.name}`);
      }
    }
    for (let methodCacheKeyParameter of method.methodIntegration.cacheKeyParameters) {
      if (!endpointSettings.cacheKeyParameters.find(p => methodCacheKeyParameter == `method.${p.name}`)) {
        cacheKeyParametersToRemove.push(methodCacheKeyParameter.slice(7));
      }
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
  if (!inputSettings.cachingEnabled) {
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
