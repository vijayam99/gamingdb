## Database setup for teammates

GamingDB uses a shared MongoDB Atlas database for development. Use test data because changes are visible to everyone on the team.

1. Ask Vijayam to add your current public IP to the GamingDB Atlas access list and create a database user for you with read/write access to `gamingdb`.

2. Get your Atlas connection string and database credentials from Vijayam privately.

3. Open a terminal in the `gamingdb` repo folder and install the backend dependencies.

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

4. Create a `backend/.env` file next to `index.js`. Add your connection string and replace `<db_password>` with your database user's password if the placeholder is present.

   ```text
   MONGODB_URI="paste-your-Atlas-connection-string-here"
   ```

   Keep `.env` on your computer and out of GitHub and the group chat.

5. From the `backend` folder, start the server. This command works on Windows and macOS.

   ```sh
   node --env-file=.env index.js
   ```

6. Look for `Connected to MongoDB` in the terminal. Leave the server running and open the [health endpoint](http://127.0.0.1:5000/api/health). You should see `{"status":"ok"}`.
