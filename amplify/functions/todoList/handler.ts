import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import { Schema } from "../../data/resource";
import { env } from '$amplify/env/todoList';

// CORSヘッダーを設定する関数
const corsHeaders = (origin?: string) => {
  // originが指定されていない場合はワイルドカードを使用
  const allowOrigin = origin || "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Amz-Security-Token,X-App-Name",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Content-Type": "application/json",
  };
};

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log('Event: ', JSON.stringify(event, null, 2));
    
    // OPTIONSリクエスト（プリフライト）への対応
    if (event.requestContext?.http?.method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders(event.headers?.origin),
        body: JSON.stringify({ message: 'OK' })
      };
    }
    
    // 呼び出し元アプリ名をヘッダーから取得
    const appName = event.headers?.['x-app-name'];
    if (!appName) {
      return {
        statusCode: 400,
        headers: corsHeaders(event.headers?.origin),
        body: JSON.stringify({ message: '呼び出し元アプリ名（X-App-Name）ヘッダーが必要です' })
      };
    }
    
    // Cognitoユーザー情報からSubを取得
    // API Gateway V2の認証情報はカスタム構造のため、型アサーションを使用
    const authContext = event.requestContext as any;
    const userSub = authContext.authorizer?.jwt?.claims?.sub;
    if (!userSub) {
      return {
        statusCode: 401,
        headers: corsHeaders(event.headers?.origin),
        body: JSON.stringify({ message: '認証情報が不足しています' })
      };
    }
    
    console.log(`リクエスト情報: アプリ名=${appName}, ユーザーSub=${userSub}`);
    
    // Amplify Data クライアントの設定を取得
    const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
    
    // Amplify設定を行う
    Amplify.configure(resourceConfig, libraryOptions);
    
    // データモデルクライアントを生成
    const client = generateClient<Schema>();

    // Todoリストを取得
    const { data: todos, errors } = await client.models.Todo.list();
    todos.forEach(todo => {
      todo.content = todo.content + ' (from API)';
    });
    
    if (errors) {
      console.error('Errors fetching todos:', errors);
      return {
        statusCode: 500,
        headers: corsHeaders(event.headers?.origin),
        body: JSON.stringify({ message: 'Error fetching todos', errors })
      };
    }
    
    return {
      statusCode: 200,
      headers: corsHeaders(event.headers?.origin),
      body: JSON.stringify({ 
        todos,
        requestInfo: {
          appName,
          userSub
        }
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(event.headers?.origin),
      body: JSON.stringify({ 
        message: 'Internal server error', 
        error: error instanceof Error ? error.message : String(error) 
      })
    };
  }
}; 