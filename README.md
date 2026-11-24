## Database setup for teammates

GamingDB uses a shared MongoDB Atlas database for development. Use test data because changes are visible to everyone on the team.

1. **Add your current IP in Atlas.** On the laptop and network you'll use for GamingDB, sign in to [MongoDB Atlas](https://cloud.mongodb.com/) with your own email. Open **GamingDB → Database & Network Access → IP Access List → Add IP Address**. Click **Add Current IP Address**, then **Confirm**.

2. **Get your connection string.** Go to **Clusters → Cluster0 → Connect → Drivers → Node.js** and copy the connection string template. Replace its username and password placeholders with your own database credentials. If you don't know your database password, go to **Database & Network Access → Database Users**, click **Edit** next to your own database user, and set a new password. If you can't access the GamingDB project or these settings, ask Vijayam.

3. **Install the backend dependencies.** Open a terminal in the `gamingdb` repo folder.

   **Windows PowerShell**

   ```powershell
   cd backend
   npm.cmd ci
   ```

   **macOS Terminal**

   ```bash
   cd backend
   npm ci
   ```

4. **Create your `.env` file.** In VS Code, create `backend/.env` next to `index.js` and paste your completed connection string:

   ```dotenv
   MONGODB_URI="paste-your-completed-Atlas-connection-string-here"
   ```

   Keep `.env` and your connection string private and out of GitHub.

5. **Start the backend.** Run this from the `backend` folder on Windows or macOS:

   ```sh
   node --env-file=.env index.js
   ```

6. **Check the connection.** Look for `Connected to MongoDB` in the terminal. Leave the server running and open [http://127.0.0.1:5000/api/health](http://127.0.0.1:5000/api/health). You should see `{"status":"ok"}`.
