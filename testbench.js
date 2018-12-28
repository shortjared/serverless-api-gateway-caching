'use strict';

const AWS = require('aws-sdk');

const doStuff = async () => {
  const apigateway = new AWS.APIGateway({ region: 'eu-west-2' });
  const restApiId = 'iqradj5em2';
  const resourceId = 'visd8f';

  // let params = {
  //   restApiId
  //   stageName: 'devdiana'
  // }
  // const result = await apigateway.getStage(params).promise();

  // let params = {
  //   restApiId
  // }
  // const result = await apigateway.getResources(params).promise();

  // let params = {
  //   restApiId,
  //   resourceId
  // }
  // const result = await apigateway.getResource(params).promise();

  let params = {
    httpMethod: 'GET',
    restApiId,
    resourceId
  }
  const result = await apigateway.getMethod(params).promise();

  // let params = {
  //   httpMethod: 'GET',
  //   restApiId,
  //   resourceId
  // }
  // const result = await apigateway.getIntegration(params).promise();

  // let params = {
  //   httpMethod: 'GET',
  //   restApiId,
  //   resourceId,
  //   patchOperations: [
  //     {
  //       op: 'add',
  //       path: '/requestParameters/method.request.path.pawId'
  //     }
  //   ]
  // }
  // const result = await apigateway.updateMethod(params).promise();

  // let params = {
  //   httpMethod: 'GET',
  //   restApiId,
  //   resourceId,
  //   patchOperations: [
  //     {
  //       op: 'remove',
  //       path: '/cacheKeyParameters/method.request.path.pawId'
  //     }
  //   ]
  // }
  // const result = await apigateway.updateIntegration(params).promise();

  // let params = {
  //   httpMethod: 'GET',
  //   restApiId,
  //   resourceId,
  //   patchOperations: [
  //     {
  //       op: 'add',
  //       path: '/requestParameters/integration.request.path.pawId',
  //       value: 'method.request.path.pawId'
  //     }
  //   ]
  // }
  // const result = await apigateway.updateIntegration(params).promise();

  console.log(`Got result ${JSON.stringify(result)}`);
}

doStuff()
  .then(() => {
    console.log('Done stuff');
  });
