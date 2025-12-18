# Local Network Access Setup

This guide explains how to configure the app to be accessible from other devices on your local network.

## Changes Made

### 1. Backend Server (`repo-backend/server.js`)
- ✅ Already configured to listen on `0.0.0.0` (all network interfaces)
- ✅ Updated CORS to allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x) on any port

### 2. Frontend API Configuration (`repo-frontend/lib/api.ts`)
- ✅ Made API URL configurable via environment variable or app.json
- ✅ Added fallback mechanism for easy configuration

### 3. Expo Configuration (`repo-frontend/package.json`)
- ✅ Updated scripts to use `--lan` flag for local network access

## Setup Instructions

### Step 1: Find Your Local IP Address

**Windows:**
```powershell
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually something like `192.168.1.100` or `172.20.10.2`)

**Mac/Linux:**
```bash
ifconfig
# or
ip addr
```
Look for `inet` address (usually `192.168.x.x` or `10.x.x.x`)

### Step 2: Configure Frontend API URL

You have **3 options** to set the API URL:

#### Option A: Environment Variable (Recommended)
Create a `.env` file in `repo-frontend/` directory:
```
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:5000/api
```
Example: `EXPO_PUBLIC_API_URL=http://172.20.10.2:5000/api`

#### Option B: Edit `app.json`
Update the `extra.apiUrl` field in `repo-frontend/app.json`:
```json
"extra": {
  "apiUrl": "http://YOUR_LOCAL_IP:5000/api"
}
```

#### Option C: Edit `lib/api.ts` directly
Change the default fallback URL in `repo-frontend/lib/api.ts`:
```typescript
return "http://YOUR_LOCAL_IP:5000/api";
```

### Step 3: Start the Servers

**Backend:**
```bash
cd repo-backend
node server.js
# or
npm start
```

**Frontend:**
```bash
cd repo-frontend
npm start
# This will automatically use --lan flag
```

### Step 4: Access from Other Devices

1. Make sure both devices are on the same Wi-Fi network
2. On your mobile device or another computer, open the Expo app
3. Scan the QR code shown in the terminal, or manually enter the URL
4. The app should now connect to your backend via the local network

## Troubleshooting

### Can't connect from other devices?
- ✅ Verify both devices are on the same network
- ✅ Check Windows Firewall allows connections on port 5000
- ✅ Ensure the API URL uses your actual local IP (not `localhost`)
- ✅ Verify the backend is running and accessible

### CORS errors?
- ✅ The backend CORS is configured to allow local network IPs
- ✅ If you still see CORS errors, check the browser console for the exact origin being blocked

### Port already in use?
- ✅ Change the PORT in backend `.env` file or `server.js`
- ✅ Update the frontend API URL to match the new port

## Security Note

⚠️ **Development Only**: This configuration is for local development. For production, use proper domain names and configure CORS appropriately.


