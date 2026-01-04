/**
 * Test utility to verify session tracking is working
 * Call this from browser console: testSessionTracking()
 */

import { supabase } from '@/integrations/supabase/client';

export async function testSessionTracking() {
  console.log('🧪 Testing Session Tracking...\n');

  // Test 1: Check if edge function is accessible
  console.log('1️⃣ Testing edge function accessibility...');
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('❌ No active session. Please log in first.');
      return;
    }

    const testResponse = await supabase.functions.invoke('track-session', {
      body: {
        event: 'session_heartbeat',
        email: session.user.email,
        userId: session.user.id,
        userAgent: navigator.userAgent,
      },
    });

    if (testResponse.error) {
      console.error('❌ Edge function error:', testResponse.error);
      console.error('   This means the track-session function is not deployed or not accessible.');
      return;
    }

    console.log('✅ Edge function is accessible!');
    console.log('   Response:', testResponse.data);
  } catch (error) {
    console.error('❌ Failed to call edge function:', error);
    console.error('   Make sure the track-session function is deployed to Supabase.');
    return;
  }

  // Test 2: Check if sessions table exists and is accessible
  console.log('\n2️⃣ Testing database access...');
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Database error:', error);
      console.error('   Check if the user_sessions table exists and RLS policies are correct.');
      return;
    }

    console.log('✅ Database is accessible!');
  } catch (error) {
    console.error('❌ Failed to access database:', error);
    return;
  }

  // Test 3: Check if we can see existing sessions
  console.log('\n3️⃣ Checking existing sessions...');
  try {
    const { data: sessions, error } = await supabase
      .from('user_sessions')
      .select('*')
      .limit(5);

    if (error) {
      console.error('❌ Error fetching sessions:', error);
      return;
    }

    console.log(`✅ Found ${sessions?.length || 0} sessions in database`);
    if (sessions && sessions.length > 0) {
      console.log('   Sample session:', sessions[0]);
    } else {
      console.log('   No sessions found. Try logging in/out to create one.');
    }
  } catch (error) {
    console.error('❌ Failed to fetch sessions:', error);
    return;
  }

  // Test 4: Check activity logs
  console.log('\n4️⃣ Checking activity logs...');
  try {
    const { data: logs, error } = await supabase
      .from('activity_logs')
      .select('*')
      .limit(5);

    if (error) {
      console.error('❌ Error fetching activity logs:', error);
      return;
    }

    console.log(`✅ Found ${logs?.length || 0} activity log entries`);
    if (logs && logs.length > 0) {
      console.log('   Sample log:', logs[0]);
    }
  } catch (error) {
    console.error('❌ Failed to fetch activity logs:', error);
    return;
  }

  console.log('\n✅ All tests completed!');
  console.log('\n💡 Tips:');
  console.log('   - If edge function fails: Deploy it with: supabase functions deploy track-session');
  console.log('   - If database fails: Check migrations are applied');
  console.log('   - If no data: Log in/out to trigger session creation');
}

// Make it available globally for easy testing
if (typeof window !== 'undefined') {
  (window as any).testSessionTracking = testSessionTracking;
}

