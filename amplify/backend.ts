import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';

const backend = defineBackend({
  auth,
  data,
});

const { userPool } = backend.auth.resources;

// ドメインプレフィックス
const domainPrefix = 'trust-parent';

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
  ...TARGET_DOMAIN,
];

// redirectSignOut設定
cfnUserPoolClient.logoutUrLs = [
  'http://localhost:5173/',
  ...TARGET_DOMAIN,
];

// responseType設定（認可コードフロー）
cfnUserPoolClient.allowedOAuthFlows = ['code'];
cfnUserPoolClient.allowedOAuthFlowsUserPoolClient = true;

// ドメインだけamplify_output.jsonのauthブロックに出力されないため、カスタムで出力する
const domain = `${domainPrefix}.auth.ap-northeast-1.amazoncognito.com`;
backend.addOutput({
  custom: {
    cognitoDomain: domain,
  } 
});

export default backend;