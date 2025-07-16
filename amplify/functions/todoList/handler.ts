import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import { Schema } from "../../data/resource";
import { env } from '$amplify/env/todoList';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log('Event: ', JSON.stringify(event, null, 2));
    
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
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*"
        },
        body: JSON.stringify({ message: 'Error fetching todos', errors })
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*"
      },
      body: JSON.stringify({ todos })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*"
      },
      body: JSON.stringify({ 
        message: 'Internal server error', 
        error: error instanceof Error ? error.message : String(error) 
      })
    };
  }
}; 