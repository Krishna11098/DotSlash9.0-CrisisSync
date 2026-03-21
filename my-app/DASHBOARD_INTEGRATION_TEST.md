# Dashboard Priority Integration - Test Guide

## What Changed

### 1. **New Server Action Created**
   - **File**: `app/actions/submitRequest.ts`
   - **Purpose**: Orchestrates the entire submission pipeline
   - **Features**:
     - ✅ Authenticates user from headers
     - ✅ Validates input data and departments
     - ✅ Calls `processSubmission()` for priority calculation
     - ✅ Checks priority threshold (>= 20 required)
     - ✅ Maps priority score to urgency level
     - ✅ Saves request to database with priority_number
     - ✅ Routes to gov employees for each department
     - ✅ Creates notifications for assigned employees

### 2. **Dashboard Form Updated**
   - **File**: `app/dashboard/page.tsx`
   - **Changes**:
     - Imports new server action: `submitRequestWithPriority`
     - Modified `handleSubmit()` function:
       - Uses base64 images directly (no Cloudinary upload)
       - Calls server action instead of API endpoint
       - Passes location coordinates
       - Returns detailed priority + assignment info
       - Falls back to offline save if server action fails

### 3. **Data Flow**
   ```
   User fills form (image, text, audio, departments, location)
        ↓
   Calls submitRequestWithPriority() server action
        ↓
   Server: Validates input → Calls processSubmission() for AI analysis
        ↓
   Server: Checks priority >= 20?
     ├─ YES → Save to DB + Route to gov employees + Create notifications + Return success
     └─ NO  → Return "priority too low" message
        ↓
   Form shows: Priority score (0-100), Urgency level, # of employees notified
   ```

---

## How to Test

### Test 1: Basic Priority Calculation
**Scenario**: Submit a clear emergency request

1. Go to `/dashboard` page
2. Fill form:
   - **Photo**: Take a picture of a fire or accident
   - **Description**: "Major fire at shopping mall, 50 people trapped"
   - **Departments**: Select "Fire" + "Police"  
   - **Location**: Click "Get Location"
   - **Click**: "Submit Request"

3. **Expected Result**:
   - Console shows: `[submit] ✅ Request submitted successfully!`
   - Message displays: `✅ Request submitted! Priority: 78/100 (urgent) - Forwarded to 2 employee(s)`
   - Check database: `requests` table should have:
     - `priority_number: 78` (not 0)
     - `urgency: "urgent"`
     - `status: "pending"`
   - Check database: `request_assignments` table should have 2 records (one for each dept)
   - Check database: `notifications` table should have notifications for assigned employees

### Test 2: Low Priority Rejection
**Scenario**: Submit vague/low-priority content

1. Go to `/dashboard`
2. Fill form:
   - **Photo**: Screenshot of something non-emergency
   - **Description**: "I found a typo in a street sign"
   - **Departments**: Select any
   - **Location**: Click "Get Location"
   - **Click**: "Submit Request"

3. **Expected Result**:
   - Console shows: `[submit] Priority score < 20, discarding request`
   - Message displays: `This report does not meet the priority threshold.`
   - **No** request should be saved to database
   - **No** assignments should be created

### Test 3: Authentication Required
**Scenario**: Missing auth header

1. Clear browser cookies/logout
2. Try to submit form without authentication

3. **Expected Result**:
   - Error message: `Authentication required` or similar
   - Falls back to offline save
   - Request stored locally for sync later

### Test 4: Offline Fallback
**Scenario**: Network connection fails during submission

1. Go to `/dashboard`
2. Open DevTools → Network tab → Throttle to "Offline"
3. Fill and submit form

4. **Expected Result**:
   - Console shows: `[submit] Falling back to offline save...`
   - Message displays: `Request saved offline. It will sync when you reconnect...`
   - Request stored in IndexedDB
   - When reconnected, should sync via `offline-sync.ts`

### Test 5: Check Console Logs
**Verify logging is working**:

1. Open DevTools → Console
2. Submit a form with all 3 fields (image, text, audio)
3. Should see logs:
   ```
   [submit] 📋 Preparing submission data...
   [submit] 📋 Data prepared:
      - Image: data:image/jpeg;base64,...
      - Text: "..."
      - Audio: present
      - Departments: [hospital, fire]
      - Coordinates: captured
   [submit] 🚀 Online - calling server action...
   [submit] ✅ Request submitted successfully!
      - Request ID: <uuid>
      - Priority: 65/100
      - Urgency: urgent
      - Assignments: 3
   ```

---

## Database Verification

### Check Request Saved
```sql
SELECT id, priority_number, urgency, status, departments, client_created_at 
FROM requests 
ORDER BY client_created_at DESC 
LIMIT 5;
```

**Expected**: Priority should be > 0, not 0

### Check Gov Employee Routing
```sql
SELECT ra.id, ra.request_id, ra.assigned_to_user_id, ra.department, u.name
FROM request_assignments ra
LEFT JOIN users2 u ON ra.assigned_to_user_id = u.id
WHERE ra.request_id = '<request_id>'
ORDER BY ra.created_at DESC;
```

**Expected**: Multiple records for each department selected

### Check Notifications
```sql
SELECT user_id, request_id, title, message, created_at
FROM notifications
WHERE request_id = '<request_id>'
ORDER BY created_at DESC;
```

**Expected**: Notifications for each assigned employee

---

## Key Differences from Previous Approach

| Aspect | Before | After |
|--------|--------|-------|
| **Image Format** | Cloudinary URL | Base64 |
| **Priority Calculation** | API endpoint `/api/submit-request` | Server Action `submitRequestWithPriority()` |
| **Flow** | Two separate flows (ReportSubmissionForm vs Dashboard) | Single unified flow |
| **Gov Routing** | Separate database operation | Integrated in server action |
| **Error Handling** | Basic API errors | Comprehensive with fallback |
| **Notifications** | Manual creation | Automatic during routing |

---

## Troubleshooting

### Issue: Priority still showing 0
1. Check if `processSubmission()` is being called
2. Look for console errors during AI pipeline execution
3. Check if image is in correct base64 format
4. Verify database schema: `requests.priority_number` column exists

### Issue: Assignments not created
1. Check if gov_employees exist in `users2` table with:
   - `role = 'gov_employee'`
   - `gov_sub_role` matching selected departments
2. Check `request_assignments` table constraints
3. Look for database permission errors in server logs

### Issue: No notifications sent
1. Verify `notifications` table exists
2. Check if employees have correct IDs in database
3. Look for notification permission errors in Supabase logs

### Issue: Server action not called
1. Verify `app/actions/submitRequest.ts` file exists
2. Check import statement in dashboard/page.tsx
3. Verify auth header is being passed from client
4. Check browser console for fetch/network errors

---

## Next Steps

1. **Test all scenarios** above
2. **Monitor console logs** during each test
3. **Query database** to verify data integrity
4. **Report any issues** with specific error messages and console logs
5. **Check if priority calculation is accurate** compared to expected severity

---

## File Locations for Quick Reference

- **Server Action**: `app/actions/submitRequest.ts`
- **Dashboard Form**: `app/dashboard/page.tsx` (handleSubmit function)
- **Priority Engine**: `lib/report-pipeline.ts` (processSubmission, calculatePriority)
- **Database**: Connect to your Supabase instance
- **Migration**: `supabase/migrations/` (schema for requests, request_assignments, notifications)
