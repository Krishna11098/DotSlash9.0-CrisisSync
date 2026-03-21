# 📱 Test PWA on Your Phone - Quick Guide

## Step 1: Find Your Computer's IP Address

### On Windows:
Open PowerShell and run:
```powershell
ipconfig | Select-String -Pattern "IPv4"
```

Look for something like: `192.168.x.x` or `10.0.x.x`

**Common IP ranges:**
- Home WiFi: Usually starts with `192.168.`
- Office: Often `10.0.` or `172.16.`

### On Mac/Linux:
```bash
ifconfig | grep "inet "
# or
ip addr show
```

## Step 2: Start Development Server

Make sure both your computer AND phone are on the **SAME WiFi network**!

```bash
cd frontend
npm run dev
```

The server will now be accessible from ANY device on your network!

## Step 3: Access from Your Phone

### Method 1: Install Page (Recommended)
Open your phone's browser and go to:
```
http://YOUR_IP_ADDRESS:3000/install
```

**Example:**
```
http://192.168.1.100:3000/install
```

This will show a big "Install App" button!

### Method 2: Main Page
```
http://YOUR_IP_ADDRESS:3000
```

Then:
- Look for the "Install App" button in the top navigation menu
- Or wait 5 seconds for the automatic install prompt

## Step 4: Install the App

### On Android (Chrome):
1. Visit the link above
2. A banner or button will appear: **"Install App"**
3. Tap **"Install"** or **"Add to Home Screen"**
4. The app icon appears on your home screen! 🎉
5. Open it - it runs full screen like a native app!

### On iPhone (Safari):
1. Visit the link in Safari browser
2. Tap the **Share button** (square with arrow ↑) at the bottom
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"** in the top right
5. App icon appears on your home screen! 🎉

## Step 5: Test Offline

1. Turn on **Airplane Mode** on your phone
2. Open the installed app
3. It still works! 🎉
4. Browse pages, capture leads
5. Turn off Airplane Mode
6. Data syncs automatically!

---

## Troubleshooting

### Can't Connect from Phone?

**Check these:**
- ✅ Both devices on SAME WiFi network
- ✅ Firewall not blocking port 3000
- ✅ Using correct IP address (not 127.0.0.1 or localhost)
- ✅ Development server is running (`npm run dev`)

### Allow Firewall Access (Windows):
If Windows Firewall blocks it, allow Node.js:
```powershell
# Run PowerShell as Administrator
New-NetFirewallRule -DisplayName "Node Dev Server" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

### Find Your IP Address Quick:
```powershell
# Windows - Copy this command
(Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.0.*"}).IPAddress
```

### Still Not Working?

1. **Restart your WiFi router**
2. **Restart the dev server**: Stop (Ctrl+C) and run `npm run dev` again
3. **Try your phone's hotspot**: Connect computer to phone's hotspot, get IP, and try again
4. **Check if server is accessible**: Open `http://YOUR_IP:3000` on your computer's browser first

---

## Production Deployment (For Real Users)

For actual deployment to users:

### Option 1: Vercel (Easiest)
```bash
npm install -g vercel
vercel
```
You'll get a URL like: `https://your-app.vercel.app`

### Option 2: Your Own Server
1. Build the app: `npm run build`
2. Upload to your server
3. Run: `npm start`
4. Configure HTTPS (required for PWA in production)

⚠️ **IMPORTANT**: PWAs require HTTPS in production (except localhost)!

---

## Quick Reference

**Install Page URL:**
```
http://YOUR_IP:3000/install
```

**Test Page (Check PWA Status):**
```
http://YOUR_IP:3000/pwa-test
```

**Main App:**
```
http://YOUR_IP:3000
```

**Replace `YOUR_IP` with your actual IP address (e.g., 192.168.1.100)**

---

## What You Should See

✅ **On Phone Browser:**
- Install button in navigation bar
- Or automatic install prompt after 5 seconds
- Or visit `/install` page for big install button

✅ **After Installing:**
- App icon on home screen
- Opens full screen (no browser UI)
- Works offline
- Fast loading

✅ **When Offline:**
- App still works
- Can capture leads
- Data syncs when back online
- Shows offline indicator

---

## Screenshots of What to Expect

### Android Install Prompt:
You'll see a banner at the bottom:
```
+------------------------+
| XSpark CRM             |
| Install app for quick  |
| access and offline use |
|                        |
| [Cancel]  [Install]    |
+------------------------+
```

### iOS Add to Home Screen:
In Safari share menu:
```
Share >
  ...
  Add to Home Screen >
    Name: XSpark CRM
    [Add]
```

### After Installing:
Your home screen will have a new icon with "XSpark CRM" label, just like any other app!

---

**Need help? Check the terminal output for your server's IP address!**
