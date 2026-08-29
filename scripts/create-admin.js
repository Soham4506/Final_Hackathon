/**
 * KoparNiti - Super Admin CLI Utility
 * Usage: node scripts/create-admin.js <email> <password> [fullName]
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Read .env if present
const envPath = path.resolve(process.cwd(), '.env');
let supabaseUrl = process.env.VITE_SUPABASE_URL || '';
let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [k, ...rest] = trimmed.split('=');
      const val = rest.join('=').trim().replace(/^["']|["']$/g, '');
      if (k === 'VITE_SUPABASE_URL' && !supabaseUrl) supabaseUrl = val;
      if (k === 'SUPABASE_SERVICE_ROLE_KEY') serviceKey = val;
      if (k === 'VITE_SUPABASE_ANON_KEY' && !serviceKey) serviceKey = val;
    }
  });
}

const args = process.argv.slice(2);
const email = args[0] || 'admin@kopargaon.gov.in';
const password = args[1] || 'Admin@KoparNiti2026';
const fullName = args[2] || 'Chief Municipal Officer (मुख्‍याधिकारी)';

console.log('🏛️  KoparNiti (कोपरनीती) - Super Admin Account Creator');
console.log('====================================================');
console.log(`Target Email:     ${email}`);
console.log(`Target Role:      admin (Super Admin / Chief Officer)`);
console.log(`Target Name:      ${fullName}`);
console.log('');

if (!supabaseUrl || !serviceKey || supabaseUrl.includes('placeholder')) {
  console.log('ℹ️  Supabase credentials not configured in .env.');
  console.log('   In local offline mode, you can sign in directly on the UI with:');
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  console.log('   (Any email with "admin" or registered as admin automatically gets Chief Officer permissions).');
  console.log('');
  console.log('   To promote an existing Supabase user via SQL Editor, run:');
  console.log(`   UPDATE public.profiles SET role = 'admin', designation = 'Chief Officer / Super Admin' WHERE email = '${email}';`);
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  try {
    console.log('📡 Connecting to Supabase...');
    
    // Check if user exists or create
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'admin',
          designation: 'Chief Officer / Super Admin',
          employee_id: 'KMC-ADMIN-01',
        },
      },
    });

    let userId = signUpData?.user?.id;

    if (signUpErr) {
      console.log(`ℹ️  Auth note (${signUpErr.message}), attempting profile promotion...`);
      // Update profile directly by email
      const { data: updated, error: updateErr } = await supabase
        .from('profiles')
        .update({
          role: 'admin',
          designation: 'Chief Officer / Super Admin',
          employee_id: 'KMC-ADMIN-01',
          status: 'active',
          is_verified: true,
        })
        .eq('email', email)
        .select();

      if (updateErr) {
        console.error('❌ Failed to update profile:', updateErr.message);
      } else {
        console.log(`✓ Profile for ${email} successfully promoted to ADMIN role!`);
      }
      return;
    }

    if (userId) {
      // Upsert into profiles table
      const { error: profileErr } = await supabase.from('profiles').upsert({
        id: userId,
        email,
        full_name: fullName,
        role: 'admin',
        phone: '9822011204',
        designation: 'Chief Officer / Super Admin',
        employee_id: 'KMC-ADMIN-01',
        status: 'active',
        is_verified: true,
      });

      if (profileErr) {
        console.warn('⚠️  Profile upsert note:', profileErr.message);
      } else {
        console.log('✓ Admin profile successfully created & assigned "admin" role in Supabase database!');
      }
    }

    console.log('');
    console.log('🎉 Super Admin account ready!');
    console.log(`   Sign in at: http://localhost:5173/login`);
    console.log(`   Email:      ${email}`);
    console.log(`   Password:   ${password}`);
  } catch (err) {
    console.error('Exception creating admin account:', err);
  }
}

main();
