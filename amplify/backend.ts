import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';

const backend = defineBackend({
  auth,
  data,
});

// OAuth設定
const { cfnUserPoolClient } = backend.auth.resources.cfnResources;

// scope設定
cfnUserPoolClient.allowedOAuthScopes = [
  'openid',
  'aws.cognito.signin.user.admin'
];

// 環境変数に設定された子アプリのドメインを取得
const CHILD_DOMAIN = process.env.CHILD_DOMAIN?.split(',') || [];

// redirectSignIn設定
cfnUserPoolClient.callbackUrLs = [
  'http://localhost:5173/',
  ...CHILD_DOMAIN,
];

// redirectSignOut設定
cfnUserPoolClient.logoutUrLs = [
  'http://localhost:5173/',
  ...CHILD_DOMAIN,
];

// responseType設定（認可コードフロー）
cfnUserPoolClient.allowedOAuthFlows = ['code'];
cfnUserPoolClient.allowedOAuthFlowsUserPoolClient = true;

const { userPool } = backend.auth.resources;

// カスタムドメインを使用
userPool.addDomain('trust-parent', {
  cognitoDomain: {
    domainPrefix: 'trust-parent'
  }
});

export default backend;