import { defineBackend } from '@aws-amplify/backend';
import { Stack } from 'aws-cdk-lib';
import {
  CorsHttpMethod,
  HttpApi,
  HttpMethod,
} from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpUserPoolAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { todoListFunction } from './functions/todoList/resource';

const backend = defineBackend({
  auth,
  data,
  todoListFunction,
});

const { userPool } = backend.auth.resources;

// ドメインプレフィックス
const isSandBox = backend.stack.stackName.includes('sandbox');
const domainPrefix = isSandBox ? 'trust-parent-sandbox' : 'trust-parent';

// カスタムドメインを使用
userPool.addDomain('custom-domain', {
  cognitoDomain: {
    domainPrefix
  }
});

// OAuth設定
const { cfnUserPoolClient } = backend.auth.resources.cfnResources;

// scope設定
cfnUserPoolClient.allowedOAuthScopes = [
  'openid',
  'aws.cognito.signin.user.admin'
];

// 環境変数に設定された子アプリのドメインを取得
const TARGET_DOMAIN = process.env.TARGET_DOMAIN?.split(',') || [];

// redirectSignIn設定
cfnUserPoolClient.callbackUrLs = [
  'http://localhost:5173/',
  'http://localhost:5174/',
  ...TARGET_DOMAIN,
];

// redirectSignOut設定
cfnUserPoolClient.logoutUrLs = [
  'http://localhost:5173/',
  'http://localhost:5174/',
  ...TARGET_DOMAIN,
];

// responseType設定（認可コードフロー）
cfnUserPoolClient.allowedOAuthFlows = ['code'];
cfnUserPoolClient.allowedOAuthFlowsUserPoolClient = true;

// APIスタックを作成
const apiStack = backend.createStack('api-stack');

// ユーザープールオーソライザー
const userPoolAuthorizer = new HttpUserPoolAuthorizer(
  'userPoolAuth',
  backend.auth.resources.userPool,
  {
    userPoolClients: [backend.auth.resources.userPoolClient],
  }
);

// Lambdaインテグレーション
const todoListIntegration = new HttpLambdaIntegration(
  'TodoListIntegration',
  backend.todoListFunction.resources.lambda
);

// HTTP APIを作成
const httpApi = new HttpApi(apiStack, 'TodoApi', {
  apiName: 'todoApi',
  // CORS設定を追加
  corsPreflight: {
    allowOrigins: [
      'http://localhost:5173',
      'http://localhost:5174',
      ...TARGET_DOMAIN,
    ],
    allowMethods: [
      CorsHttpMethod.GET,
      CorsHttpMethod.POST,
      CorsHttpMethod.PUT,
      CorsHttpMethod.DELETE,
      CorsHttpMethod.OPTIONS,
    ],
    allowHeaders: ['*'],
    allowCredentials: true,
  },
});

// Todo一覧を取得するルートを追加
httpApi.addRoutes({
  path: '/todos',
  methods: [HttpMethod.GET],
  integration: todoListIntegration,
  authorizer: userPoolAuthorizer,
});

// ドメインだけamplify_output.jsonのauthブロックに出力されないため、カスタムで出力する
const domain = `${domainPrefix}.auth.ap-northeast-1.amazoncognito.com`;
backend.addOutput({
  custom: {
    cognitoDomain: domain,
    REST: {
      [httpApi.httpApiName!]: {
        endpoint: httpApi.url,
        region: Stack.of(httpApi).region,
      },
    }
  } 
});

export default backend;