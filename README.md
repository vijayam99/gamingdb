## Database setup for teammates

GamingDB uses a shared MongoDB Atlas database for development. Use test data because changes are visible to everyone on the team.

1. Ask Vijayam to add your current public IP to the GamingDB Atlas access list and create a database user for you with read/write access to `gamingdb`.
2. Get your Atlas connection string and database credentials from Vijayam privately.
3. From the `gamingdb` repo folder, run these commands in Windows PowerShell:

   ```powershell
   cd backend
   npm.cmd ci
   ```

4. Create a `backend/.env` file next to `index.js`. Add the connection string and replace `<db_password>` with your database user's password if the placeholder is present.

   ```text
   MONGODB_URI="paste-your-Atlas-connection-string-here"
   ```

   Keep `.env` local. Never commit it or post the connection string in the group chat.

5. From the `backend` folder, start the server:

   ```powershell
   node --env-file=.env index.js
   ```

6. Look for `Connected to MongoDB` in the terminal. Then open
   [http://127.0.0.1:5000/api/health](http://127.0.0.1:5000/api/health).
   You should see `{"status":"ok"}`.

   
      **macOS Terminal**

   ```bash
   cd backend
   npm ci
   ```
