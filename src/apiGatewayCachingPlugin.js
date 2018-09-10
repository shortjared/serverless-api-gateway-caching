'use strict';

const ApiGatewayCachingSettings = require('./ApiGatewayCachingSettings');
const addPathParametersCacheConfig = require('./pathParametersCache');
const updateStageCacheSettings = require('./stageCache');

class ApiGatewayCachingPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.hooks = {
      'before:package:initialize': this.createSettings.bind(this),
      'before:package:finalize': this.updateCloudFormationTemplate.bind(this),
      'after:aws:deploy:finalize:cleanup': this.updateStage.bind(this),
    };
  }

  createSettings() {
    this.settings = new ApiGatewayCachingSettings(this.serverless, this.options);
  }

  updateCloudFormationTemplate() {
    let restApiId = {
      Ref: 'ApiGatewayRestApi',
    };
    if (this.serverless.service.provider.apiGateway && this.serverless.service.provider.apiGateway.restApiId) {
      restApiId = this.serverless.service.provider.apiGateway.restApiId
    }
    this.serverless.service.provider.compiledCloudFormationTemplate.Outputs.RestApiIdForApiGwCaching = {
      Description: 'Rest API Id',
      Value: restApiId,
    };
    
    // if caching is not defined or disabled
    if (!this.settings.cachingEnabled) {
      return;
    }

    return addPathParametersCacheConfig(this.settings, this.serverless);
  }

  updateStage() {
    return updateStageCacheSettings(this.settings, this.serverless);
  }
}

module.exports = ApiGatewayCachingPlugin;