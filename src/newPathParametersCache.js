const isEmpty = require('lodash.isempty');
const { retrieveRestApiId } = require('./restApiId');

let cachedResources;

const getMethodResourceIdfor = async (restApiId, endpointSettings, settings, serverless) => {
  let resources = cachedResources ? cachedResources :
    await serverless.providers.aws.request('APIGateway', 'getResources', params, settings.stage, settings.region);

  cachedResources = resources;
}

const getMethodFor = async (restApiId, endpointSettings, settings, serverless) => {
  let methodResourceId = await getMethodResourceIdfor(restApiId, endpointSettings, settings, serverless);
}

const updateCacheSettingsFor = async (restApiId, endpointSettings, settings, serverless) => {
  let apiGatewayMethod = await getMethodFor(restApiId, endpointSettings, settings, serverless);
}

const updatePathParametersCacheSettings = async (settings, serverless) => {
  // do nothing if caching is not enabled
  if (!settings.cachingEnabled) {
    return;
  }

  let restApiId = await retrieveRestApiId(serverless, settings);

  for (let endpointSettings of settings.endpointSettings) {
    await updateCacheSettingsFor(endpointSettings, restApiId, settings, serverless);
  }
}
module.exports = updatePathParametersCacheSettings;
