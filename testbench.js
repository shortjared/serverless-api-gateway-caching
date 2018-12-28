'use strict';

const AWS = require('aws-sdk');

const doStuff = async () => {
  const apigateway = new AWS.APIGateway({ region: 'eu-west-2' });

  // let params = {
  //   restApiId: '57236ak66f',
  //   stageName: 'devdiana'
  // }
  // const result = await apigateway.getStage(params).promise();

  // let params = {
  //   restApiId: '57236ak66f',
  // }
  // const result = await apigateway.getResources(params).promise();

  // let params = {
  //   restApiId: '57236ak66f',
  //   resourceId: '7tr9uw'
  // }
  // const result = await apigateway.getResource(params).promise();

  // let params = {
  //   httpMethod: 'GET',
  //   restApiId: '57236ak66f',
  //   resourceId: '7tr9uw'
  // }
  // const result = await apigateway.getMethod(params).promise();

  // let params = {
  //   httpMethod: 'GET',
  //   restApiId: '57236ak66f',
  //   resourceId: '7tr9uw'
  // }
  // const result = await apigateway.getIntegration(params).promise();

  // let params = {
  //   httpMethod: 'GET',
  //   restApiId: '57236ak66f',
  //   resourceId: '7tr9uw',
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
  //   restApiId: '57236ak66f',
  //   resourceId: '7tr9uw',
  //   patchOperations: [
  //     {
  //       op: 'remove',
  //       path: '/cacheKeyParameters/method.request.path.pawId'
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
