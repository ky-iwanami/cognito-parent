import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";
import { AuthUser, getCurrentUser, signInWithRedirect, signOut } from "aws-amplify/auth";

const client = generateClient<Schema>();

const origin = `${window.location.origin}/`;
outputs.auth.oauth = {
  ...outputs.auth.oauth,
  domain: outputs.custom.cognitoDomain,
  redirect_sign_in_uri: [origin],
  redirect_sign_out_uri: [origin],
}
Amplify.configure(outputs);

function App() {
  const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);
  const [user, setUser] = useState<AuthUser | undefined>(undefined);

  useEffect(() => {
    client.models.Todo.observeQuery().subscribe({
      next: (data) => setTodos([...data.items]),
    });
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const user = await getCurrentUser();
        setUser(user);
      } catch (error) {
        await signInWithRedirect({ options: { lang: "ja" } });
      }
    };
    init();
  }, []);

  function createTodo() {
    client.models.Todo.create({ content: window.prompt("Todo content") });
  }

  return (
    <main>
      <div>
        <p>親アプリです</p>
        <p>User: {user?.username || 'No user'}</p>
        <button onClick={() => signOut()}>Sign out</button>
      </div>
      <h1>My todos</h1>
      <button onClick={createTodo}>+ new</button>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>{todo.content}</li>
        ))}
      </ul>
      <div>
        🥳 App successfully hosted. Try creating a new todo.
        <br />
        <a href="https://docs.amplify.aws/react/start/quickstart/#make-frontend-updates">
          Review next step of this tutorial.
        </a>
      </div>
    </main>
  );
}

export default App;
