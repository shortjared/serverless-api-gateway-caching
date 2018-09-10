const isEmpty = require('lodash.isempty');
const AWS = require('aws-sdk');

const getRestApiId = async (settings, serverless) => {
  const stackName = serverless.providers.aws.naming.getStackName(settings.stage);

  let stack = await serverless.providers.aws.request('CloudFormation', 'describeStacks', { StackName: stackName },
    settings.stage,
    settings.region
  );

  return stack.Stacks[0].Outputs
    .filter(output => output.OutputKey === 'RestApiIdForApiGwCaching')
    .map(output => output.OutputValue)[0];
}

String.prototype.replaceAll = function (search, replacement) {
  let target = this;

  return target
    .split(search)
    .join(replacement);
};

const escapeJsonPointer = path => {
  return path
    .replaceAll('~', '~0')
    .replaceAll('/', '~1')
    .replaceAll('{', '\{')
    .replaceAll('}', '\}');
}

const createPatchForStage = (settings) => {
  let patch = [{
    op: 'replace',
    path: '/cacheClusterEnabled',
    value: `${settings.cachingEnabled}`
  }]
  if (settings.cachingEnabled) {
    patch.push({
      op: 'replace',
      path: '/cacheClusterSize',
      value: `${settings.cacheClusterSize}`
    });
  }
  return patch;
}

const patchForMethod = (path, method, endpointSettings) => {
  let patchPath = patchPathFor(path, method);
  let patch = [{
    op: 'replace',
    path: `/${patchPath}/caching/enabled`,
    value: `${endpointSettings.cachingEnabled}`
  }];
  if (endpointSettings.cachingEnabled) {
    patch.push({
      op: 'replace',
      path: `/${patchPath}/caching/ttlInSeconds`,
      value: `${endpointSettings.cacheTtlInSeconds}`
    })
  }
  return patch;
}

const createPatchForEndpoint = (endpointSettings, serverless) => {
  let lambda = serverless.service.getFunction(endpointSettings.functionName);
  if (isEmpty(lambda.events)) {
    serverless.cli.log(`[serverless-api-gateway-caching] Lambda ${endpointSettings.functionName} has not defined events.`);
  }
  // TODO there can be many http events
  let httpEvents = lambda.events.filter(e => e.http != null);
  if (isEmpty(httpEvents)) {
    serverless.cli.log(`[serverless-api-gateway-caching] Lambda ${endpointSettings.functionName} has not defined any HTTP events.`);
  }
  let { path, method } = httpEvents[0].http;

  let patch = [];
  if (method.toUpperCase() == 'ANY') {
    let httpMethodsToDisableCacheFor = ['DELETE', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT']; // TODO could come from settings, vNext
    for (let methodWithCacheDisabled of httpMethodsToDisableCacheFor) {
      patch = patch.concat(patchForMethod(path, methodWithCacheDisabled,
        { cachingEnabled: false }));
    };

    patch = patch.concat(patchForMethod(path, 'GET', endpointSettings));
  }
  else {
    patch = patch.concat(patchForMethod(path, method, endpointSettings));
  }
  return patch;
}

const patchPathFor = (path, method) => {
  let escapedPath = escapeJsonPointer(path);
  if (!escapedPath.startsWith('~1')) {
    escapedPath = `~1${escapedPath}`;
  }
  let patchPath = `${escapedPath}/${method.toUpperCase()}`;
  return patchPath;
}

const updateStageCacheSettings = async (settings, serverless) => {
  // do nothing if caching settings are not defined
  if (settings.cachingEnabled == undefined) {
    return;
  }

  let restApiId = await getRestApiId(settings, serverless);

  AWS.config.update({
    region: settings.region,
  });

  let patchOps = createPatchForStage(settings);
  
  let endpointsWithCachingEnabled = settings.endpointSettings.filter(e => e.cachingEnabled);
  if (settings.cachingEnabled && isEmpty(endpointsWithCachingEnabled)) {
    serverless.cli.log(`[serverless-api-gateway-caching] [WARNING] API Gateway caching is enabled but none of the endpoints have caching enabled`);
  }

  for (let endpointSettings of settings.endpointSettings) {
    let endpointPatch = createPatchForEndpoint(endpointSettings, serverless);
    patchOps = patchOps.concat(endpointPatch);
  }
  const apiGateway = new AWS.APIGateway();
  let params = {
    restApiId,
    stageName: settings.stage,
    patchOperations: patchOps
  }

  serverless.cli.log(`[serverless-api-gateway-caching] Updating API Gateway cache settings.`);
  await apiGateway.updateStage(params).promise();
  serverless.cli.log(`[serverless-api-gateway-caching] Done updating API Gateway cache settings.`);
}

module.exports = updateStageCacheSettings;